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


class VehicleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/vehicles/
    GET /api/vehicles/{pk}/
    """
    queryset = Vehicle.objects.select_related('assigned_officer', 'current_lease').all()
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated, RoleBasedPermission]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['assigned_district', 'vehicle_type', 'is_online']
    ordering_fields = ['vehicle_number', 'assigned_district', 'last_seen']

    @action(detail=False, methods=['get'], url_path='live')
    def live(self, request: Request) -> Response:
        """
        GET /api/vehicles/live/
        Returns all vehicles with current location as GeoJSON FeatureCollection.
        """
        vehicles = Vehicle.objects.filter(last_location__isnull=False).select_related(
            'assigned_officer', 'current_lease'
        )
        geojson = VehicleGeoJSONSerializer.build_feature_collection(vehicles)
        return Response(geojson)

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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_alerts(request: Request) -> Response:
    """
    GET /api/vehicles/alerts/?severity=HIGH&resolved=false
    """
    queryset = VehicleAlert.objects.select_related('vehicle', 'lease', 'resolved_by')

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
