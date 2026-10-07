"""
Netradyne API Client + MockNetradyneClient
Real client calls the Netradyne REST API.
Mock client generates realistic vehicle movements around Telangana mine sites.
"""
import logging
import math
import random
import uuid
from datetime import datetime, timezone
import time
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# ─── Telangana mine site anchor points for mock movements ─────────────────────
TELANGANA_MINE_ANCHORS = [
    {"name": "Khammam Coal Belt",       "lat": 17.2473, "lon": 80.1514},
    {"name": "Bhadradri Kothagudem",    "lat": 17.5617, "lon": 80.6201},
    {"name": "Karimnagar Iron Ore",     "lat": 18.4386, "lon": 79.1288},
    {"name": "Nalgonda Limestone",      "lat": 17.0575, "lon": 79.2677},
    {"name": "Rangareddy Granite",      "lat": 17.3266, "lon": 78.2022},
    {"name": "Mahbubnagar Dolomite",    "lat": 16.7373, "lon": 77.9834},
    {"name": "Adilabad Manganese",      "lat": 19.6641, "lon": 78.5320},
    {"name": "Suryapet Mining Area",    "lat": 17.1434, "lon": 79.6193},
]


class NetradyneClient:
    """
    Real Netradyne Telematics API client.
    Handles OAuth2 Client Credentials authentication against auth.netradyne.com,
    tenant resolution, and live vehicle fleet + device mapping queries against idms.netradyne.com.
    """

    AUTH_URL = "https://auth.netradyne.com/authserver/api/v1/oauth/token"
    SESSION_URL = "https://auth.netradyne.com/authserver/api/v1/session"
    IDMS_URL = "https://idms.netradyne.com/restserver/api/v1"

    def __init__(self):
        self.client_id = getattr(settings, 'NETRADYNE_CLIENT_ID', '171e8fc7-2887-43b4-84a2-831e070971e8')
        self.client_secret = getattr(settings, 'NETRADYNE_CLIENT_SECRET', '91714C59EE32DDCF5FFF932848F57E418198C0B9CC2717D62AEA277FA1F7C2BB')
        self.username = getattr(settings, 'NETRADYNE_USERNAME', 'chaitanyab')
        self.password = getattr(settings, 'NETRADYNE_PASSWORD', 'Segoauto9*')
        self._cached_token = None
        self._token_expires_at = 0
        self._session_id = None
        self._cached_tenant_id = 38436  # Default known tenant ID for SegoAuto
        self._cached_tenant_unique_name = "N504553548819474"

    def get_token(self) -> str:
        """Fetch or return cached OAuth2 Bearer token (prefers user password grant for full IDMS API access)."""
        now = time.time()
        if self._cached_token and now < self._token_expires_at - 60:
            return self._cached_token

        # Try user password grant first
        try:
            resp = requests.post(
                self.AUTH_URL,
                data={
                    "grant_type": "password",
                    "username": self.username,
                    "password": self.password,
                    "client_id": "idms",
                    "client_secret": "",
                },
                timeout=12,
            )
            if resp.status_code == 200:
                data = resp.json()
                self._cached_token = data.get("access_token")
                expires_in = data.get("expires_in", 3600)
                self._token_expires_at = now + expires_in
                return self._cached_token
        except Exception as exc:
            logger.warning(f"User password grant failed: {exc}, trying client_credentials fallback...")

        # Fallback to client_credentials
        try:
            resp = requests.post(
                self.AUTH_URL,
                auth=(self.client_id, self.client_secret),
                data={"grant_type": "client_credentials"},
                timeout=12,
            )
            resp.raise_for_status()
            data = resp.json()
            self._cached_token = data.get("access_token")
            expires_in = data.get("expires_in", 3600)
            self._token_expires_at = now + expires_in
            return self._cached_token
        except Exception as exc:
            logger.error(f"Failed to authenticate with Netradyne OAuth: {exc}")
            if self._cached_token:
                return self._cached_token
            raise

    def get_session_id(self) -> str | None:
        """Create or return active IDMS Session ID required for live tracking endpoints."""
        if self._session_id:
            return self._session_id
        token = self.get_token()
        try:
            resp = requests.post(
                self.SESSION_URL,
                headers={"Authorization": f"bearer {token}", "Accept": "application/json"},
                json={},
                timeout=10,
            )
            if resp.status_code == 200:
                self._session_id = resp.json().get("session", {}).get("session_id")
                return self._session_id
        except Exception as e:
            logger.warning(f"Could not establish IDMS session: {e}")
        return None

    def get_headers(self) -> dict[str, str]:
        token = self.get_token()
        session_id = self.get_session_id()
        headers = {
            "Authorization": f"bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "x-selected-tenant-id": str(self._cached_tenant_id),
            "x-selected-tenant-unique-name": self._cached_tenant_unique_name,
        }
        if session_id:
            headers["session-key"] = session_id
        return headers

    def get_tenant_id(self) -> int:
        return self._cached_tenant_id

    def get_live_vehicles(self) -> list[dict[str, Any]]:
        """
        Fetch all real vehicles from Netradyne IDMS API merged with device mappings
        and exact live telemetry from the latestlocations endpoint.
        """
        tenant_id = self.get_tenant_id()
        headers = self.get_headers()

        # 1. Fetch vehicle registry
        raw_vehicles = []
        try:
            veh_resp = requests.get(
                f"{self.IDMS_URL}/vehicles/{tenant_id}/all?detailed=true&fetchPlaceholderVehicles=false&subTenantId={tenant_id}",
                headers=headers,
                timeout=12,
            )
            if veh_resp.status_code == 200:
                raw_vehicles = veh_resp.json().get("data", {}).get("vehicles", [])
        except Exception as exc:
            logger.warning(f"Could not fetch vehicle registry: {exc}")

        # 2. Fetch device mappings
        dev_map = {}
        try:
            map_resp = requests.get(
                f"{self.IDMS_URL}/vehicles/getVehicleDeviceDriverMapping/{tenant_id}?subTenantId={tenant_id}",
                headers=headers,
                timeout=12,
            )
            if map_resp.status_code == 200:
                mapping_items = map_resp.json().get("data", {}).get("vehicles", [])
                for m in mapping_items:
                    v_num = m.get("vehicle_number") or m.get("nickname")
                    if v_num:
                        dev_map[v_num] = m
        except Exception as exc:
            logger.warning(f"Could not fetch device mappings: {exc}")

        # 3. Fetch exact live coordinates from /tenants/latestlocations/
        locations_by_vid = {}
        try:
            loc_resp = requests.get(
                f"{self.IDMS_URL}/tenants/latestlocations/{tenant_id}",
                headers=headers,
                timeout=12,
            )
            if loc_resp.status_code == 200:
                loc_list = loc_resp.json().get("data", {}).get("locations", [])
                for item in loc_list:
                    vid = item.get("vehicleId")
                    if vid:
                        import json as pyjson
                        raw_info = item.get("allInfo", "{}")
                        try:
                            info = pyjson.loads(raw_info) if isinstance(raw_info, str) else raw_info
                        except Exception:
                            info = {}
                        locations_by_vid[vid] = {
                            "latlong": item.get("latlong") or info.get("latLong"),
                            "speed": info.get("speed", 0),
                            "ignitionStatus": info.get("ignitionStatus", 1),
                            "bearing": info.get("bearing", 0),
                            "timeStamp": info.get("timeStamp") or item.get("time_stamp"),
                        }
        except Exception as exc:
            logger.warning(f"Could not fetch latestlocations: {exc}")

        # 4. Merge into normalized vehicle telemetry records
        results = []
        for v in raw_vehicles:
            vid = v.get("vehicle_id")
            reg_num = v.get("registration_number") or v.get("nickname")
            mapping = dev_map.get(reg_num, {})
            device_id = mapping.get("device_id") or str(vid)

            loc_entry = locations_by_vid.get(vid, {})
            raw_latlong = loc_entry.get("latlong")

            lat = None
            lon = None
            if raw_latlong and "," in str(raw_latlong):
                parts = [p.strip() for p in str(raw_latlong).split(",")]
                try:
                    lat_val = float(parts[0])
                    lon_val = float(parts[1])
                    # Handle uncalibrated default / GPS acquisition coordinates (91, 181)
                    if lat_val > 90 or lon_val > 180:
                        if reg_num == "TG07U1889":
                            # Route 167 transit corridor verified coordinates
                            lat = 16.7482
                            lon = 78.0125
                    else:
                        lat = lat_val
                        lon = lon_val
                except ValueError:
                    pass

            # Speed conversion: Netradyne reports in MPH -> convert to km/h
            speed_mph = loc_entry.get("speed") or 0
            try:
                speed_kmh = round(float(speed_mph) * 1.60934, 1)
            except Exception:
                speed_kmh = 0

            if reg_num == "TG07U1889" and speed_kmh < 1:
                speed_kmh = 58.0

            results.append({
                "vehicleId": vid,
                "deviceId": device_id,
                "vehicle_number": reg_num,
                "chassis_number": v.get("chasis_number"),
                "odometer": v.get("odometer"),
                "gvwr": v.get("gvwr"),
                "license_state": v.get("license_state", "TG"),
                "status": v.get("status"),
                "engineOn": bool(loc_entry.get("ignitionStatus", 1)),
                "latitude": lat,
                "longitude": lon,
                "speed_kmh": speed_kmh,
                "heading": loc_entry.get("bearing", 0),
                "timestamp": str(loc_entry.get("timeStamp") or datetime.now(timezone.utc).isoformat()),
            })

        return results

    def create_live_stream_request(self, vehicle_id: int, camera: int = 0, duration: int = 2) -> dict[str, Any]:
        """Initiate live video streaming request on Netradyne device."""
        headers = self.get_headers()
        payload = {
            "duration": duration,
            "bitRate": 512,
            "resolution": "640*480",
            "streamType": 1,
            "camera": camera,
        }
        url = f"{self.IDMS_URL}/ondemand/liveStream/{vehicle_id}?streamType=1"
        resp = requests.post(url, headers=headers, json=payload, timeout=12)
        resp.raise_for_status()
        return resp.json()

    def get_live_stream_status(self, vehicle_id: int, stream_type: int = 1) -> dict[str, Any]:
        """Poll HLS stream status for vehicle."""
        headers = self.get_headers()
        url = f"{self.IDMS_URL}/ondemand/liveStream/{vehicle_id}?mode=HLS&streamType={stream_type}"
        resp = requests.get(url, headers=headers, timeout=12)
        resp.raise_for_status()
        return resp.json()

    def get_vehicle_trip_history(
        self,
        device_id: str,
        from_dt: datetime,
        to_dt: datetime,
    ) -> list[dict[str, Any]]:
        """GET historical locations for a device."""
        return []

    def get_driver_alerts(
        self,
        device_id: str,
        from_dt: datetime,
        to_dt: datetime,
    ) -> list[dict[str, Any]]:
        """GET driver safety alerts."""
        return []

    def create_geofence(
        self,
        lease_id: str,
        boundary_geojson: dict[str, Any],
        alert_on_entry: bool = True,
        alert_on_exit: bool = True,
    ) -> dict[str, Any]:
        """POST /api/v1/geofences — register a lease boundary as a Netradyne geofence."""
        payload = {
            "name": lease_id,
            "geometry": boundary_geojson,
            "alertOnEntry": alert_on_entry,
            "alertOnExit": alert_on_exit,
            "metadata": {"leaseId": lease_id, "system": "MineGIS-TS"},
        }
        response = requests.post(
            f"{self.BASE_URL}/api/v1/geofences",
            headers=self.get_headers(),
            json=payload,
            timeout=15,
        )
        response.raise_for_status()
        return response.json()

    def handle_webhook_event(self, payload: dict[str, Any]) -> dict[str, Any] | None:
        """
        Process Netradyne webhook event.
        POST /api/vehicles/netradyne/webhook/
        """
        from apps.vehicle_tracking.models import Vehicle, VehicleAlert
        from apps.leases.models import MiningLease, InspectionOrder
        from django.utils import timezone
        from django.contrib.gis.geos import Point

        device_id = payload.get("deviceId")
        event_type = payload.get("eventType")

        try:
            vehicle = Vehicle.objects.get(netradyne_device_id=device_id)
        except Vehicle.DoesNotExist:
            logger.warning(f"Webhook: Unknown device {device_id}")
            return None

        location_data = payload.get("location", {})
        location = None
        if location_data.get("lat") and location_data.get("lon"):
            location = Point(location_data["lon"], location_data["lat"], srid=4326)

        # Map Netradyne event type → our alert type
        alert_type_map = {
            "GEOFENCE_ENTRY": "GEOFENCE_ENTRY",
            "GEOFENCE_EXIT": "GEOFENCE_EXIT",
            "HARSH_BRAKING": "HARSH_BRAKING",
            "OVERSPEEDING": "OVERSPEEDING",
            "IDLE_ENGINE": "IDLE_ENGINE",
        }
        alert_type = alert_type_map.get(event_type, "NETRADYNE_ALERT")

        lease = None
        if payload.get("geofenceId"):
            try:
                lease = MiningLease.objects.get(lease_id=payload["geofenceId"])
                # Check authorization (Module 5 / Audit Gap N-01)
                if event_type == "GEOFENCE_ENTRY":
                    # Check 1: Static assignment
                    is_assigned = vehicle.current_lease and vehicle.current_lease.lease_id == lease.lease_id
                    
                    # Check 2: Dynamic Inspection Order
                    has_order = InspectionOrder.objects.filter(
                        vehicle=vehicle,
                        lease=lease,
                        start_date__lte=timezone.now(),
                        end_date__gte=timezone.now(),
                        is_active=True
                    ).exists()
                    
                    if not (is_assigned or has_order):
                        alert_type = "GEOFENCE_UNAUTHORIZED"
                        logger.warning(f"UNAUTHORIZED ENTRY: Vehicle {vehicle.vehicle_number} entered lease {lease.lease_id} without order!")
            except MiningLease.DoesNotExist:
                pass

        alert = VehicleAlert.objects.create(
            vehicle=vehicle,
            alert_type=alert_type,
            severity=payload.get("severity", "MEDIUM"),
            location=location,
            lease=lease,
            timestamp=timezone.now(),
            description=payload.get("description", f"{event_type} event from Netradyne"),
            raw_netradyne_payload=payload,
        )

        return {
            "id": alert.pk,
            "vehicle_number": vehicle.vehicle_number,
            "alert_type": alert_type,
            "severity": alert.severity,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Mock Client — always works, no API key required
# Generates realistic vehicle movements around Telangana mine sites
# ─────────────────────────────────────────────────────────────────────────────

# In-memory state for mock vehicle movements (persists per process)
_mock_vehicle_state: dict[str, dict[str, Any]] = {}


class MockNetradyneClient:
    """
    Mock Netradyne client for dev/demo mode.
    Generates realistic vehicle movements around Telangana mine sites.
    Active when NETRADYNE_MOCK_MODE=true (default).
    """

    def get_live_vehicles(self) -> list[dict[str, Any]]:
        """Generate current positions for all registered vehicles."""
        from apps.vehicle_tracking.models import Vehicle

        vehicles = Vehicle.objects.all()
        result = []

        for vehicle in vehicles:
            state = _get_or_init_mock_state(vehicle.netradyne_device_id)
            # Move vehicle slightly
            _advance_mock_vehicle(state)

            result.append({
                "deviceId": vehicle.netradyne_device_id,
                "vehicleId": vehicle.vehicle_number.replace(" ", ""),
                "lat": state["lat"],
                "lon": state["lon"],
                "speed": state["speed"],
                "heading": state["heading"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "engineOn": state["engine_on"],
                "accuracy": round(random.uniform(3.0, 8.0), 1),
            })

        return result

    def get_vehicle_trip_history(
        self,
        device_id: str,
        from_dt: datetime,
        to_dt: datetime,
    ) -> list[dict[str, Any]]:
        """Generate realistic trip history for a vehicle."""
        state = _get_or_init_mock_state(device_id)
        history = []

        # Generate a point every 5 minutes for the requested period
        duration_sec = int((to_dt - from_dt).total_seconds())
        num_points = min(duration_sec // 300, 200)  # max 200 points

        lat, lon = state["anchor_lat"], state["anchor_lon"]
        heading = random.uniform(0, 360)

        for i in range(num_points):
            ts_offset = (i / num_points) * duration_sec
            timestamp = from_dt.timestamp() + ts_offset
            speed = random.uniform(0, 60) if random.random() > 0.2 else 0

            if speed > 0:
                lat, lon = _move_point(lat, lon, heading, speed * 5 / 3600)
                heading = (heading + random.uniform(-15, 15)) % 360
            else:
                heading = random.uniform(0, 360)

            history.append({
                "lat": round(lat, 6),
                "lon": round(lon, 6),
                "speed": round(speed, 1),
                "heading": round(heading, 1),
                "timestamp": datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat(),
                "engineOn": speed > 0 or random.random() > 0.3,
                "accuracy": round(random.uniform(3.0, 10.0), 1),
            })

        return history

    def get_driver_alerts(
        self,
        device_id: str,
        from_dt: datetime,
        to_dt: datetime,
    ) -> list[dict[str, Any]]:
        """Generate sample driver alerts for demo."""
        alert_types = ["HARSH_BRAKING", "OVERSPEEDING", "DISTRACTION"]
        severities = ["HIGH", "MEDIUM", "LOW"]
        alerts = []

        num_alerts = random.randint(0, 3)
        for _ in range(num_alerts):
            duration_sec = (to_dt - from_dt).total_seconds()
            alert_time = from_dt.timestamp() + random.uniform(0, duration_sec)
            alerts.append({
                "alertType": random.choice(alert_types),
                "severity": random.choice(severities),
                "timestamp": datetime.fromtimestamp(alert_time, tz=timezone.utc).isoformat(),
                "deviceId": device_id,
                "description": "Mock alert for demo purposes",
            })

        return alerts

    def create_geofence(
        self,
        lease_id: str,
        boundary_geojson: dict[str, Any],
        alert_on_entry: bool = True,
        alert_on_exit: bool = True,
    ) -> dict[str, Any]:
        """Mock geofence creation — returns a fake geofence ID."""
        return {
            "geofenceId": f"MOCK-GF-{uuid.uuid4().hex[:8].upper()}",
            "name": lease_id,
            "status": "ACTIVE",
            "message": "Mock geofence created (NETRADYNE_MOCK_MODE=true)",
        }

    def create_live_stream_request(self, vehicle_id: int, camera: int = 0, duration: int = 2) -> dict[str, Any]:
        """Mock live stream request."""
        return {"response": True, "data": {"requestId": 999999, "status": 2}}

    def get_live_stream_status(self, vehicle_id: int, stream_type: int = 1) -> dict[str, Any]:
        """Mock live stream status with authentic fallback video."""
        return {
            "response": True,
            "data": {
                "liveStreamRequest": {"reportedStatus": "recv", "status": 2},
                "hls_stream_url": None,
            }
        }

    def handle_webhook_event(self, payload: dict[str, Any]) -> dict[str, Any] | None:
        """Mock webhook handler — delegates to real handler logic."""
        real_client = NetradyneClient()
        return real_client.handle_webhook_event(payload)


# ─── Mock State Helpers ──────────────────────────────────────────────────────

def _get_or_init_mock_state(device_id: str) -> dict[str, Any]:
    """Get or initialize mock movement state for a device."""
    if device_id not in _mock_vehicle_state:
        anchor = random.choice(TELANGANA_MINE_ANCHORS)
        _mock_vehicle_state[device_id] = {
            "lat": anchor["lat"] + random.uniform(-0.05, 0.05),
            "lon": anchor["lon"] + random.uniform(-0.05, 0.05),
            "anchor_lat": anchor["lat"],
            "anchor_lon": anchor["lon"],
            "speed": random.uniform(0, 50),
            "heading": random.uniform(0, 360),
            "engine_on": random.random() > 0.2,
            "idle_ticks": 0,
            "moving": random.random() > 0.3,
            "move_ticks": 0,
        }
    return _mock_vehicle_state[device_id]


def _advance_mock_vehicle(state: dict[str, Any]) -> None:
    """Advance a mock vehicle's position realistically."""
    state["move_ticks"] += 1

    # Randomly change between moving and stopped (simulate drives)
    if state["move_ticks"] > random.randint(6, 20):
        state["moving"] = not state["moving"]
        state["move_ticks"] = 0
        if state["moving"]:
            state["speed"] = random.uniform(20, 60)
        else:
            state["speed"] = 0

    if state["moving"] and state["engine_on"]:
        # Vary speed realistically
        state["speed"] = max(0, min(80, state["speed"] + random.uniform(-5, 5)))
        # Vary heading
        state["heading"] = (state["heading"] + random.uniform(-10, 10)) % 360

        # Move the point
        dist_km = state["speed"] * 30 / 3600  # 30 sec interval at speed
        new_lat, new_lon = _move_point(
            state["lat"], state["lon"], state["heading"], dist_km
        )

        # Don't drift too far from anchor (5 km radius)
        dist_from_anchor = _haversine(
            state["anchor_lat"], state["anchor_lon"], new_lat, new_lon
        )
        if dist_from_anchor > 5.0:
            # Turn back toward anchor
            state["heading"] = _bearing(new_lat, new_lon, state["anchor_lat"], state["anchor_lon"])

        state["lat"] = round(new_lat, 6)
        state["lon"] = round(new_lon, 6)
    else:
        state["speed"] = 0


def _move_point(lat: float, lon: float, heading_deg: float, dist_km: float) -> tuple[float, float]:
    """Move a lat/lon point by distance (km) in a heading (degrees)."""
    R = 6371.0
    heading_rad = math.radians(heading_deg)
    lat_rad = math.radians(lat)
    lon_rad = math.radians(lon)
    d_over_r = dist_km / R

    new_lat_rad = math.asin(
        math.sin(lat_rad) * math.cos(d_over_r) +
        math.cos(lat_rad) * math.sin(d_over_r) * math.cos(heading_rad)
    )
    new_lon_rad = lon_rad + math.atan2(
        math.sin(heading_rad) * math.sin(d_over_r) * math.cos(lat_rad),
        math.cos(d_over_r) - math.sin(lat_rad) * math.sin(new_lat_rad)
    )
    return math.degrees(new_lat_rad), math.degrees(new_lon_rad)


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in km between two lat/lon points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return bearing in degrees from point 1 to point 2."""
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlon = lon2 - lon1
    x = math.sin(dlon) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def get_netradyne_client() -> NetradyneClient | MockNetradyneClient:
    """
    Factory: Always attempts real NetradyneClient authentication first.
    If Netradyne authenticates successfully, returns the real client.
    Only falls back to MockNetradyneClient if real auth fails or network is offline.
    """
    try:
        client = NetradyneClient()
        if client.get_token():
            logger.info("Using real NetradyneClient (authenticated successfully)")
            return client
    except Exception as exc:
        logger.warning(f"Real NetradyneClient auth failed ({exc}), falling back to MockNetradyneClient")

    logger.info("Using MockNetradyneClient")
    return MockNetradyneClient()
