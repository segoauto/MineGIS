"""
Django Channels WebSocket consumer for live vehicle tracking.
Authenticated via JWT in query string.
Broadcasts vehicle positions every 30 seconds via Celery beat.
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from django.utils import timezone

logger = logging.getLogger(__name__)


class VehicleTrackingConsumer(AsyncWebsocketConsumer):
    GROUP_NAME = 'vehicles_live'

    async def connect(self):
        """Accept connection and join the vehicles_live group."""
        user = self.scope.get('user')

        if not user or not user.is_authenticated:
            logger.warning("WebSocket connect rejected: unauthenticated")
            await self.close(code=4401)
            return

        await self.channel_layer.group_add(self.GROUP_NAME, self.channel_name)
        await self.accept()

        logger.info(f"WebSocket connected: user={user.username} channel={self.channel_name}")

        # Send current snapshot immediately on connect
        await self.send_current_snapshot()

    async def disconnect(self, close_code):
        """Leave the group on disconnect."""
        await self.channel_layer.group_discard(self.GROUP_NAME, self.channel_name)
        logger.info(f"WebSocket disconnected: channel={self.channel_name} code={close_code}")

    async def receive(self, text_data=None, bytes_data=None):
        """Handle incoming messages from client."""
        if not text_data:
            return

        try:
            data = json.loads(text_data)
            msg_type = data.get('type')

            if msg_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': timezone.now().isoformat(),
                }))

            elif msg_type == 'subscribe_vehicle':
                vehicle_id = data.get('vehicle_id')
                if vehicle_id:
                    await self.send(text_data=json.dumps({
                        'type': 'subscribed',
                        'vehicle_id': vehicle_id,
                    }))

        except json.JSONDecodeError:
            pass

    # ─── Group message handlers (called by Celery task) ──────────────────

    async def vehicle_update(self, event):
        """Broadcast vehicle positions to this client."""
        await self.send(text_data=json.dumps({
            'type': 'VEHICLE_UPDATE',
            'vehicles': event['vehicles'],
            'timestamp': event.get('timestamp', timezone.now().isoformat()),
        }))

    async def vehicle_alert(self, event):
        """Send a new vehicle alert to this client."""
        await self.send(text_data=json.dumps({
            'type': 'VEHICLE_ALERT',
            'alert': event['alert'],
        }))

    # ─── Helpers ─────────────────────────────────────────────────────────

    async def send_current_snapshot(self):
        """Send current vehicle positions immediately on connect."""
        from channels.db import database_sync_to_async
        from apps.vehicle_tracking.models import Vehicle
        from apps.vehicle_tracking.serializers import VehicleGeoJSONSerializer

        @database_sync_to_async
        def get_vehicles():
            vehicles = Vehicle.objects.filter(last_location__isnull=False)
            return VehicleGeoJSONSerializer.build_feature_collection(vehicles)

        try:
            geojson = await get_vehicles()
            await self.send(text_data=json.dumps({
                'type': 'VEHICLE_UPDATE',
                'vehicles': geojson,
                'timestamp': timezone.now().isoformat(),
                'snapshot': True,
            }))
        except Exception as e:
            logger.error(f"Error sending snapshot: {e}")
