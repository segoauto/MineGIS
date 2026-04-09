"""
ASGI config for MineGIS-TS — Django Channels setup
HTTP + WebSocket routing
"""
import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

# Initialize Django ASGI application early to populate AppRegistry
django_asgi_app = get_asgi_application()

# Import after Django setup
from apps.vehicle_tracking.routing import websocket_urlpatterns  # noqa: E402
from apps.vehicle_tracking.middleware import JWTAuthMiddlewareStack  # noqa: E402

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AllowedHostsOriginValidator(
        JWTAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
