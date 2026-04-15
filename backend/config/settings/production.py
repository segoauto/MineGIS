import os
from .base import *

# ─── Core ────────────────────────────────────────────────────
DEBUG = False

ALLOWED_HOSTS = os.environ.get(
    'DJANGO_ALLOWED_HOSTS',
    'localhost,127.0.0.1'
).split(',')

# ─── Static files (Whitenoise — serves from Django in prod) ──
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ─── CORS — allow requests from the production domain ────────
DOMAIN = os.environ.get('DOMAIN', '')
# If no proper domain set (IP-only deploy), allow all origins
_is_proper_domain = DOMAIN and '.' in DOMAIN and not DOMAIN.replace('.', '').isdigit()
if _is_proper_domain:
    CORS_ALLOWED_ORIGINS = [
        f'https://{DOMAIN}',
        f'https://www.{DOMAIN}',
    ]
else:
    CORS_ALLOW_ALL_ORIGINS = True  # Safe for IP-only / internal deploys
CORS_ALLOW_CREDENTIALS = True

# ─── Security ────────────────────────────────────────────────
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
X_FRAME_OPTIONS = 'SAMEORIGIN'
# Relax cookie security when no SSL (IP-only deploy) — tighten after SSL is set up
_has_ssl = _is_proper_domain  # Will be True once domain + Certbot are configured
SESSION_COOKIE_SECURE = _has_ssl
CSRF_COOKIE_SECURE = _has_ssl
SECURE_SSL_REDIRECT = False   # Nginx handles HTTPS redirect

# ─── Logging ─────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'structured': {
            'format': '[{levelname}] {asctime} {module}: {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'structured',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
    'loggers': {
        'django.security': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

