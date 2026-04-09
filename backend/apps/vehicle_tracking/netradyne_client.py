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
    Real Netradyne API client.
    Called only when NETRADYNE_MOCK_MODE=false and NETRADYNE_API_KEY is set.
    """

    BASE_URL = settings.NETRADYNE_API_URL
    API_KEY = settings.NETRADYNE_API_KEY

    def get_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def get_live_vehicles(self) -> list[dict[str, Any]]:
        """GET /api/v1/vehicles/locations — current location of all vehicles."""
        response = requests.get(
            f"{self.BASE_URL}/api/v1/vehicles/locations",
            headers=self.get_headers(),
            timeout=10,
        )
        response.raise_for_status()
        return response.json().get("vehicles", [])

    def get_vehicle_trip_history(
        self,
        device_id: str,
        from_dt: datetime,
        to_dt: datetime,
    ) -> list[dict[str, Any]]:
        """GET /api/v1/vehicles/{deviceId}/trips — historical location points."""
        params = {
            "startTime": from_dt.isoformat(),
            "endTime": to_dt.isoformat(),
        }
        response = requests.get(
            f"{self.BASE_URL}/api/v1/vehicles/{device_id}/trips",
            headers=self.get_headers(),
            params=params,
            timeout=30,
        )
        response.raise_for_status()
        return response.json().get("locations", [])

    def get_driver_alerts(
        self,
        device_id: str,
        from_dt: datetime,
        to_dt: datetime,
    ) -> list[dict[str, Any]]:
        """GET /api/v1/alerts — driver safety alerts from Netradyne."""
        params = {
            "deviceId": device_id,
            "startTime": from_dt.isoformat(),
            "endTime": to_dt.isoformat(),
        }
        response = requests.get(
            f"{self.BASE_URL}/api/v1/alerts",
            headers=self.get_headers(),
            params=params,
            timeout=30,
        )
        response.raise_for_status()
        return response.json().get("alerts", [])

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
        from apps.leases.models import MiningLease
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
                # Check authorization
                if event_type == "GEOFENCE_ENTRY":
                    is_authorized = vehicle.current_lease and vehicle.current_lease.lease_id == lease.lease_id
                    if not is_authorized:
                        alert_type = "GEOFENCE_UNAUTHORIZED"
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
    Factory: returns real or mock client based on NETRADYNE_MOCK_MODE.
    """
    if settings.NETRADYNE_MOCK_MODE or not settings.NETRADYNE_API_KEY:
        logger.info("Using MockNetradyneClient (NETRADYNE_MOCK_MODE=true or no API key)")
        return MockNetradyneClient()
    logger.info("Using real NetradyneClient")
    return NetradyneClient()
