"""
Celery tasks for vehicle tracking — periodic sync with Netradyne API
"""
import json
import logging
from asgiref.sync import async_to_sync
from celery import shared_task
from channels.layers import get_channel_layer
from django.contrib.gis.geos import Point
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(
    name='apps.vehicle_tracking.tasks.sync_vehicle_locations',
    bind=True,
    max_retries=3,
    default_retry_delay=10,
    queue='vehicle_tracking',
)
def sync_vehicle_locations(self):
    """
    Runs every 30 seconds via Celery Beat.
    Calls Netradyne API → updates all Vehicle.last_location in DB →
    broadcasts to WebSocket channel group 'vehicles_live'.
    """
    from apps.vehicle_tracking.models import Vehicle, VehicleLocationHistory
    from apps.vehicle_tracking.netradyne_client import get_netradyne_client
    from apps.vehicle_tracking.serializers import VehicleGeoJSONSerializer

    client = get_netradyne_client()

    try:
        raw_vehicles = client.get_live_vehicles()
    except Exception as exc:
        logger.error(f"Netradyne API error in sync_vehicle_locations: {exc}")
        raise self.retry(exc=exc)

    updated_vehicle_ids = []

    for v in raw_vehicles:
        device_id = v.get("deviceId")
        if not device_id:
            continue

        try:
            vehicle = Vehicle.objects.get(netradyne_device_id=device_id)
        except Vehicle.DoesNotExist:
            logger.warning(f"Vehicle not found for device {device_id}")
            continue

        lat = v.get("lat")
        lon = v.get("lon")
        timestamp_str = v.get("timestamp")
        speed = float(v.get("speed", 0))
        heading = float(v.get("heading", 0))
        engine_on = v.get("engineOn", True)

        # Parse timestamp
        if timestamp_str:
            from django.utils.dateparse import parse_datetime
            ts = parse_datetime(timestamp_str) or timezone.now()
        else:
            ts = timezone.now()

        if lat and lon:
            location = Point(float(lon), float(lat), srid=4326)

            # Update vehicle current state
            Vehicle.objects.filter(pk=vehicle.pk).update(
                last_location=location,
                last_seen=ts,
                current_speed_kmh=speed,
                current_heading=heading,
                is_online=True,
                engine_on=engine_on,
            )

            # Store history point
            VehicleLocationHistory.objects.create(
                vehicle=vehicle,
                location=location,
                timestamp=ts,
                speed_kmh=speed,
                heading=heading,
                accuracy=float(v.get("accuracy", 5.0)),
                engine_on=engine_on,
            )

            updated_vehicle_ids.append(vehicle.pk)

    # Mark vehicles not in response as offline if last seen > 2 min ago
    from datetime import timedelta
    stale_threshold = timezone.now() - timedelta(minutes=2)
    Vehicle.objects.exclude(pk__in=updated_vehicle_ids).filter(
        is_online=True,
        last_seen__lt=stale_threshold,
    ).update(is_online=False)

    # Broadcast updated positions to all WebSocket clients
    _broadcast_vehicle_update()

    logger.info(f"sync_vehicle_locations: updated {len(updated_vehicle_ids)} vehicles")
    return {"updated": len(updated_vehicle_ids)}


def _broadcast_vehicle_update():
    """Send current vehicle positions to WebSocket group."""
    from apps.vehicle_tracking.models import Vehicle
    from apps.vehicle_tracking.serializers import VehicleGeoJSONSerializer

    vehicles = Vehicle.objects.filter(last_location__isnull=False)
    geojson = VehicleGeoJSONSerializer.build_feature_collection(vehicles)

    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            'vehicles_live',
            {
                'type': 'vehicle_update',
                'vehicles': geojson,
                'timestamp': timezone.now().isoformat(),
            }
        )
