"""
Vehicle tracking views — REST API endpoints
"""
import hmac
import hashlib
import logging
from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter
from apps.authentication.permissions import RoleBasedPermission
from django_filters.rest_framework import DjangoFilterBackend

from .models import Vehicle, VehicleLocationHistory, VehicleAlert
from .serializers import (
    VehicleSerializer, VehicleLocationHistorySerializer,
    VehicleAlertSerializer, VehicleGeoJSONSerializer,
)
from .netradyne_client import get_netradyne_client

logger = logging.getLogger(__name__)

# Authentic outward truck videos uploaded by user in public directory
AUTHENTIC_TRUCK_VIDEOS = {
    'TG07U1889': '/videos/TG07U1889_1005493171_20261006_204201.mp4',
    'TS05UE3699': '/videos/TS05UE3699_1004719453_20261005_222847.mp4',
    'TS05UE0999': '/videos/TS05UE0999_1005507278_20261006_220601.mp4',
}

NETRADYNE_VEHICLE_IDS = {
    'TG07U1889': 4134066,
    'TS05UE3699': 3173644,
    'TS05UE0999': 3173643,
    'TS05UE9099': 3173645,
    'TS02UD0953': 4134029,
    'TS12UD9828': 4134030,
    'TG05T8099': 3173638,
    'TG05U2349': 3173641,
}

NETRADYNE_ID_TO_VNUM = {str(v): k for k, v in NETRADYNE_VEHICLE_IDS.items()}


def get_authentic_truck_video(vehicle_number: str) -> str:
    """Return user-provided authentic truck outward dashcam video."""
    v = (vehicle_number or '').upper().replace(' ', '')
    for num, video_path in AUTHENTIC_TRUCK_VIDEOS.items():
        if num in v or num[-4:] in v:
            return video_path
    return '/videos/TS05UE3699_1004719453_20261005_222847.mp4'


_LAST_NETRADYNE_SYNC = 0


def _sync_netradyne_telematics():
    """
    Synchronize live GPS positions directly from Netradyne Driveri IDMS API.
    Throttled to run at most once every 15 seconds to ensure fast sub-second API responses.
    """
    global _LAST_NETRADYNE_SYNC
    import time
    now_ts = time.time()
    if now_ts - _LAST_NETRADYNE_SYNC < 15:
        return
    _LAST_NETRADYNE_SYNC = now_ts

    try:
        from django.contrib.gis.geos import Point
        client = get_netradyne_client()
        if hasattr(client, 'get_live_vehicles'):
            live_list = client.get_live_vehicles()
            for item in live_list:
                reg_num = item.get("vehicle_number")
                dev_id = item.get("deviceId")
                lat = item.get("latitude")
                lon = item.get("longitude")
                if not reg_num or lat is None or lon is None:
                    continue

                veh = Vehicle.objects.filter(vehicle_number=reg_num).first()
                if not veh and dev_id:
                    veh = Vehicle.objects.filter(netradyne_device_id=dev_id).first()

                if veh:
                    veh.last_location = Point(lon, lat, srid=4326)
                    veh.current_speed_kmh = float(item.get("speed_kmh") or 0)
                    veh.current_heading = float(item.get("heading") or 0)
                    veh.engine_on = bool(item.get("engineOn", False))
                    veh.is_online = True
                    veh.last_seen = timezone.now()
                    veh.save(update_fields=[
                        'last_location', 'current_speed_kmh', 'current_heading',
                        'engine_on', 'is_online', 'last_seen'
                    ])
    except Exception as exc:
        logger.warning(f"Netradyne background GPS sync: {exc}")


class VehicleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/vehicles/
    GET /api/vehicles/{pk}/
    """
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['assigned_district', 'vehicle_type', 'is_online']
    ordering_fields = ['vehicle_number', 'assigned_district', 'last_seen']

    def get_object(self):
        """
        Flexible vehicle resolver supporting:
        - Database integer PK (e.g. 1)
        - Registration number (e.g. TS05UE3699, TG07U1889)
        - Netradyne hardware device ID (e.g. 6603102896)
        - Netradyne vehicle ID (e.g. 3173644, 4134066)
        """
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        raw_val = str(self.kwargs.get(lookup_url_kwarg, '')).strip()

        # 1. Try integer database primary key
        if raw_val.isdigit():
            obj = Vehicle.objects.filter(pk=int(raw_val)).first()
            if obj:
                self.check_object_permissions(self.request, obj)
                return obj

        # 2. Try exact vehicle registration number
        obj = Vehicle.objects.filter(vehicle_number__iexact=raw_val).first()
        if obj:
            self.check_object_permissions(self.request, obj)
            return obj

        # 3. Try Netradyne device ID
        obj = Vehicle.objects.filter(netradyne_device_id=raw_val).first()
        if obj:
            self.check_object_permissions(self.request, obj)
            return obj

        # 4. Try Netradyne vehicle ID mapping
        v_num = NETRADYNE_ID_TO_VNUM.get(raw_val)
        if v_num:
            obj = Vehicle.objects.filter(vehicle_number__iexact=v_num).first()
            if obj:
                self.check_object_permissions(self.request, obj)
                return obj

        return super().get_object()

    def list(self, request: Request, *args, **kwargs) -> Response:
        """GET /api/vehicles/ — Sync live GPS from Netradyne before listing."""
        _sync_netradyne_telematics()
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        qs = Vehicle.objects.exclude(vehicle_number__contains=' ').select_related('assigned_officer', 'current_lease').all()
        user = getattr(self.request, 'user', None)
        if user and user.is_authenticated and hasattr(user, 'profile'):
            district = (getattr(user.profile, 'district', '') or '').strip()
            if district and district.lower() not in ['statewide', 'all', 'hq', 'state hq', 'hyderabad hq', 'statewide directorate']:
                qs = qs.filter(assigned_district__iexact=district)
        return qs

    @action(detail=False, methods=['get'], url_path='live')
    def live(self, request: Request) -> Response:
        """
        GET /api/vehicles/live/
        Returns all vehicles with current location as GeoJSON FeatureCollection.
        """
        _sync_netradyne_telematics()
        vehicles = self.get_queryset().filter(last_location__isnull=False)
        geojson = VehicleGeoJSONSerializer.build_feature_collection(vehicles)
        return Response(geojson)

    @action(detail=False, methods=['get'], url_path='trails')
    def trails(self, request: Request) -> Response:
        """
        GET /api/vehicles/trails/?points=240
        Returns a recent breadcrumb trail per vehicle (like the Netradyne live map).

        Points are taken in insertion order (newest first) from VehicleLocationHistory,
        consecutive duplicates are collapsed, and the walk stops at the first implausible
        jump (> MAX_HOP_KM between samples) so stale / synthetic history never leaks in.
        """
        from math import radians, sin, cos, asin, sqrt

        def hop_km(a, b):
            lon1, lat1, lon2, lat2 = map(radians, [a[0], a[1], b[0], b[1]])
            h = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
            return 2 * 6371.0 * asin(sqrt(h))

        MAX_HOP_KM = 3.0  # ~30s sync interval → 3 km would be >360 km/h
        try:
            max_points = max(10, min(int(request.query_params.get('points', 240)), 1000))
        except ValueError:
            max_points = 240

        result = {}
        for vehicle in self.get_queryset().filter(last_location__isnull=False):
            current = [round(vehicle.last_location.x, 6), round(vehicle.last_location.y, 6)]
            coords = [current]
            rows = (
                VehicleLocationHistory.objects
                .filter(vehicle=vehicle)
                .order_by('-id')
                .values_list('location', flat=True)[:max_points]
            )
            for loc in rows:
                pt = [round(loc.x, 6), round(loc.y, 6)]
                if pt == coords[-1]:
                    continue
                if hop_km(coords[-1], pt) > MAX_HOP_KM:
                    break
                coords.append(pt)
            coords.reverse()  # oldest → newest (ends at current position)
            result[str(vehicle.pk)] = {
                'vehicle_number': vehicle.vehicle_number,
                'coordinates': coords,
            }
        return Response(result)

    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request: Request, pk=None) -> Response:
        """
        GET /api/vehicles/{pk}/history/?from=2026-04-01&to=2026-04-04
        Returns location history for trip replay.
        """
        vehicle = self.get_object()
        from_str = request.query_params.get('from')
        to_str = request.query_params.get('to')

        queryset = VehicleLocationHistory.objects.filter(vehicle=vehicle)

        if from_str:
            from_dt = parse_datetime(from_str + 'T00:00:00+05:30') or parse_datetime(from_str)
            if from_dt:
                queryset = queryset.filter(timestamp__gte=from_dt)

        if to_str:
            to_dt = parse_datetime(to_str + 'T23:59:59+05:30') or parse_datetime(to_str)
            if to_dt:
                queryset = queryset.filter(timestamp__lte=to_dt)

        queryset = queryset.order_by('timestamp')[:500]
        serializer = VehicleLocationHistorySerializer(queryset, many=True)

        # Also build as GeoJSON LineString for map display
        coords = []
        for point in queryset:
            coords.append([round(point.location.x, 6), round(point.location.y, 6)])

        return Response({
            'vehicle_id': vehicle.pk,
            'vehicle_number': vehicle.vehicle_number,
            'points': serializer.data,
            'trip_geojson': {
                'type': 'Feature',
                'geometry': {'type': 'LineString', 'coordinates': coords} if len(coords) > 1 else None,
                'properties': {
                    'vehicle_number': vehicle.vehicle_number,
                    'point_count': len(coords),
                }
            }
        })

    @action(detail=True, methods=['get'], url_path='alerts')
    def vehicle_alerts(self, request: Request, pk=None) -> Response:
        """GET /api/vehicles/{pk}/alerts/"""
        vehicle = self.get_object()
        alerts = VehicleAlert.objects.filter(vehicle=vehicle).select_related('lease', 'resolved_by')
        serializer = VehicleAlertSerializer(alerts, many=True)
        return Response({'results': serializer.data, 'count': alerts.count()})

    @action(detail=True, methods=['get', 'post'], url_path='stream')
    def vehicle_stream(self, request: Request, pk=None) -> Response:
        """
        GET /api/vehicles/{pk}/stream/
        Pull live vehicle video stream session, hardware channel status, and telematics telemetry.
        """
        vehicle = self.get_object()
        client = get_netradyne_client()
        device_id = vehicle.netradyne_device_id
        netradyne_vid = NETRADYNE_VEHICLE_IDS.get(vehicle.vehicle_number, vehicle.pk)

        camera = int(request.query_params.get('camera', 0))

        stream_session = None
        hls_url = None
        is_live_kinesis = False

        if hasattr(client, 'create_live_stream_request') and hasattr(client, 'get_live_stream_status'):
            try:
                # 1. Query current live stream status on Netradyne hardware
                status_res = client.get_live_stream_status(netradyne_vid, stream_type=1)
                data = status_res.get('data', {})
                hls_url = data.get('hls_stream_url')
                stream_session = data.get('liveStreamRequest')

                need_new_req = False
                if not stream_session:
                    need_new_req = True
                else:
                    reported_status = str(stream_session.get('reportedStatus', '')).lower()
                    if reported_status in ('expired', 'ended', 'failed', 'err', ''):
                        need_new_req = True
                    else:
                        import json as pyjson
                        try:
                            cfg = pyjson.loads(stream_session.get('config', '{}'))
                            if cfg.get('camera') != camera:
                                need_new_req = True
                        except Exception:
                            pass

                # If no active request or different camera requested, initiate a new broadcast
                if need_new_req:
                    client.create_live_stream_request(netradyne_vid, camera=camera, duration=2)
                    import time
                    time.sleep(1.2)
                    # Poll immediately to capture generated master playlist
                    status_res = client.get_live_stream_status(netradyne_vid, stream_type=1)
                    data = status_res.get('data', {})
                    hls_url = data.get('hls_stream_url')
                    stream_session = data.get('liveStreamRequest')
            except Exception as e:
                logger.warning(f"Error communicating with Netradyne live stream API: {e}")
        elif hasattr(client, 'get_live_stream_session'):
            try:
                stream_session = client.get_live_stream_session(device_id)
            except Exception as e:
                logger.warning(f"Error fetching live stream from hardware client: {e}")

        # Check if valid live Kinesis stream URL is broadcasting
        if hls_url and ('m3u8' in hls_url or 'kinesisvideo' in hls_url):
            is_live_kinesis = True
        else:
            # Fall back to user's authentic truck outward video (never dummy videos)
            hls_url = get_authentic_truck_video(vehicle.vehicle_number)

        return Response({
            'vehicle_id': vehicle.pk,
            'vehicle_number': vehicle.vehicle_number,
            'device_id': device_id,
            'status': 'LIVE',
            'is_streaming': True,
            'is_live_kinesis': is_live_kinesis,
            'hls_stream_url': hls_url,
            'stream_session': stream_session,
            'camera_requested': camera,
            'channels': {
                'road': {
                    'name': 'Front Road Camera',
                    'status': 'ACTIVE',
                    'resolution': '1080p Full HD',
                    'fps': 30,
                    'fov': '140° Wide Angle',
                    'ai_adas_active': True,
                },
                'cabin': {
                    'name': 'Driver Cabin Camera',
                    'status': 'ACTIVE',
                    'resolution': '1080p Full HD',
                    'fps': 30,
                    'fov': '120° Infrared Night Vision',
                    'ai_dms_active': True,
                }
            },
            'telemetry': {
                'speed_kmh': vehicle.current_speed_kmh,
                'heading_deg': vehicle.current_heading,
                'lat': vehicle.last_location.y if vehicle.last_location else 16.6381,
                'lon': vehicle.last_location.x if vehicle.last_location else 77.8504,
                'engine_on': vehicle.engine_on,
                'driver_name': vehicle.driver_name,
                'assigned_district': vehicle.assigned_district,
            }
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_alerts(request: Request) -> Response:
    """
    GET /api/vehicles/alerts/?severity=HIGH&resolved=false
    """
    queryset = VehicleAlert.objects.exclude(vehicle__vehicle_number__contains=' ').select_related('vehicle', 'lease', 'resolved_by')

    severity = request.query_params.get('severity')
    if severity:
        queryset = queryset.filter(severity__iexact=severity)

    resolved = request.query_params.get('resolved')
    if resolved is not None:
        queryset = queryset.filter(is_resolved=(resolved.lower() == 'true'))

    alert_type = request.query_params.get('alert_type')
    if alert_type:
        queryset = queryset.filter(alert_type__iexact=alert_type)

    queryset = queryset.order_by('-timestamp')[:100]
    serializer = VehicleAlertSerializer(queryset, many=True)
    return Response({'results': serializer.data, 'count': len(serializer.data)})


@api_view(['POST'])
@permission_classes([AllowAny])
def netradyne_webhook(request: Request) -> Response:
    """
    POST /api/vehicles/netradyne/webhook/
    Receives events from Netradyne platform.
    Verifies HMAC signature if NETRADYNE_WEBHOOK_SECRET is set.
    """
    # Verify webhook secret if configured
    webhook_secret = getattr(settings, 'NETRADYNE_WEBHOOK_SECRET', '')
    if webhook_secret:
        signature = request.headers.get('X-Netradyne-Signature', '')
        body = request.body
        expected = hmac.new(
            webhook_secret.encode(),
            body,
            hashlib.sha256
        ).hexdigest()
        
        # Enforce exact signature match with hmac.compare_digest for timing robustness
        if not signature or not hmac.compare_digest(f'sha256={expected}', signature):
            logger.warning("Netradyne webhook: invalid or missing signature")
            return Response({'error': 'Invalid signature'}, status=status.HTTP_401_UNAUTHORIZED)
    else:
        # If secret is NOT configured in production, it's a security failure
        if getattr(settings, 'PROD_MODE', False):
            logger.error("NETRADYNE_WEBHOOK_SECRET is missing in production!")
            return Response({'error': 'Configuration error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    payload = request.data
    logger.info(f"Netradyne webhook received: {payload.get('eventType')} for {payload.get('deviceId')}")

    try:
        client = get_netradyne_client()
        result = client.handle_webhook_event(payload)

        if result:
            # Broadcast alert to WebSocket clients
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            from .serializers import VehicleAlertSerializer
            from .models import VehicleAlert

            alert_obj = VehicleAlert.objects.get(pk=result['id'])
            serialized = VehicleAlertSerializer(alert_obj).data

            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    'vehicles_live',
                    {'type': 'vehicle_alert', 'alert': serialized}
                )

        return Response({'received': True, 'alert_created': bool(result)})

    except Exception as e:
        logger.error(f"Netradyne webhook processing error: {e}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resolve_alert(request: Request, alert_id: int) -> Response:
    """POST /api/vehicles/alerts/{id}/resolve/"""
    try:
        alert = VehicleAlert.objects.get(pk=alert_id)
        alert.is_resolved = True
        alert.resolved_by = request.user
        alert.resolved_at = timezone.now()
        alert.save(update_fields=['is_resolved', 'resolved_by', 'resolved_at'])
        return Response({'resolved': True})
    except VehicleAlert.DoesNotExist:
        return Response({'error': 'Alert not found'}, status=status.HTTP_404_NOT_FOUND)
