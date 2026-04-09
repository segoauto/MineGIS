"""
Audit middleware — logs all write operations automatically.
"""
import logging
from .models import AuditLog

logger = logging.getLogger(__name__)

WRITE_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}
SKIP_PATHS = [
    '/api/auth/login/',
    '/api/auth/refresh/',
    '/api/vehicles/netradyne/webhook/',
    '/admin/',
    '/api/schema/',
    '/api/docs/',
]


class AuditLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Only log API write operations by authenticated users
        if (
            request.method in WRITE_METHODS
            and hasattr(request, 'user')
            and request.user.is_authenticated
            and request.path.startswith('/api/')
            and not any(request.path.startswith(skip) for skip in SKIP_PATHS)
            and response.status_code < 400
        ):
            action = {
                'POST': 'CREATE',
                'PUT': 'UPDATE',
                'PATCH': 'UPDATE',
                'DELETE': 'DELETE',
            }.get(request.method, 'UPDATE')

            # Extract model name from URL path
            parts = request.path.strip('/').split('/')
            model_name = parts[1].replace('-', '_').title() if len(parts) > 1 else 'Unknown'

            try:
                AuditLog.objects.create(
                    user=request.user,
                    action=action,
                    model_name=model_name,
                    object_id=parts[2] if len(parts) > 2 else '',
                    object_repr=f"{request.method} {request.path}",
                    ip_address=self._get_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                )
            except Exception as e:
                logger.warning(f"AuditLog creation failed: {e}")

        return response

    def _get_ip(self, request) -> str:
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            return xff.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')
