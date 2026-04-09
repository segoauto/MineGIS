"""
JWT auth middleware for Django Channels WebSocket connections.
Reads token from query string: ws://host/ws/vehicles/?token=JWT_TOKEN
"""
import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)


@database_sync_to_async
def get_user_from_token(token_key: str):
    """Validate JWT token and return user."""
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        from django.contrib.auth.models import User

        access_token = AccessToken(token_key)
        user_id = access_token.get('user_id')
        return User.objects.get(pk=user_id)
    except Exception as e:
        logger.warning(f"WebSocket JWT auth failed: {e}")
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """Middleware that authenticates WebSocket connections via JWT."""

    async def __call__(self, scope, receive, send):
        # Extract token from query string
        query_string = scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token = params.get('token', [None])[0]

        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    """Convenience wrapper that adds JWT auth to a Channels application."""
    return JWTAuthMiddleware(inner)
