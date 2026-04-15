"""
Django base settings for MineGIS-TS
Government of Telangana — Department of Mines & Geology
"""
import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ─── Core ────────────────────────────────────────────────────
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'dev-secret-key')

DEBUG = os.environ.get('DJANGO_DEBUG', 'True') == 'True'

ALLOWED_HOSTS = os.environ.get(
    'DJANGO_ALLOWED_HOSTS',
    'localhost,127.0.0.1,backend'
).split(',')

# ─── Applications ────────────────────────────────────────────
INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',            # GeoDjango

    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'channels',
    'drf_spectacular',
    'django_celery_beat',
    'django_extensions',
    'storages',

    # MineGIS apps
    'apps.authentication',
    'apps.leases',
    'apps.gis',
    'apps.vehicle_tracking',
    'apps.audit',
    'apps.notifications',
    'django_ratelimit',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.audit.middleware.AuditLogMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# ─── Database (PostGIS) ──────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': os.environ.get('DB_NAME', 'minegis_ts'),
        'USER': os.environ.get('DB_USER', 'minegis_user'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'MineGIS_DB_2026!'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'CONN_MAX_AGE': 60,
        'OPTIONS': {
            'connect_timeout': 10,
        },
    }
}

# ─── Cache (Redis) ──────────────────────────────────────────
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://localhost:6379/0'),
    }
}

# ─── Django Channels (ASGI + WebSocket) ──────────────────────
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [os.environ.get('REDIS_URL', 'redis://localhost:6379/0')],
        },
    },
}

# ─── REST Framework ──────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 25,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# ─── JWT Configuration ───────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(
        minutes=int(os.environ.get('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', 60))
    ),
    'REFRESH_TOKEN_LIFETIME': timedelta(
        days=int(os.environ.get('JWT_REFRESH_TOKEN_LIFETIME_DAYS', 7))
    ),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ─── CORS ────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:80',
]
CORS_ALLOW_CREDENTIALS = True

# ─── Static & Media (MinIO / S3) ─────────────────────────────
USE_S3 = os.environ.get('USE_S3', 'False') == 'True'

if USE_S3:
    # AWS / MinIO settings
    AWS_ACCESS_KEY_ID = os.environ.get('MINIO_ROOT_USER', 'minegis_admin')
    AWS_SECRET_ACCESS_KEY = os.environ.get('MINIO_ROOT_PASSWORD', 'MineGIS_S3_2026!')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('MINIO_BUCKET_NAME', 'minegis-documents')
    AWS_S3_ENDPOINT_URL = os.environ.get('MINIO_ENDPOINT', 'http://localhost:9000')
    AWS_S3_REGION_NAME = 'us-east-1' # Default mock region for MinIO
    AWS_S3_USE_SSL = os.environ.get('MINIO_USE_SSL', 'False') == 'True'
    AWS_S3_FILE_OVERWRITE = False
    
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
else:
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ─── Auth ────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ─── Internationalization ────────────────────────────────────
LANGUAGE_CODE = 'en-in'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# ─── Celery ──────────────────────────────────────────────────
CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_TIMEZONE = 'Asia/Kolkata'
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'
CELERY_TASK_ROUTES = {
    'apps.vehicle_tracking.tasks.*': {'queue': 'vehicle_tracking'},
}

# ─── GeoServer ───────────────────────────────────────────────
GEOSERVER_URL = os.environ.get('GEOSERVER_URL', 'http://localhost:8080/geoserver')
GEOSERVER_ADMIN_USER = os.environ.get('GEOSERVER_ADMIN_USER', 'admin')
GEOSERVER_ADMIN_PASSWORD = os.environ.get('GEOSERVER_ADMIN_PASSWORD', 'geoserver')
GEOSERVER_WORKSPACE = os.environ.get('GEOSERVER_WORKSPACE', 'minegis_ts')

# ─── Netradyne ───────────────────────────────────────────────
NETRADYNE_API_URL = os.environ.get('NETRADYNE_API_URL', 'https://api.netradyne.com')
NETRADYNE_API_KEY = os.environ.get('NETRADYNE_API_KEY', '')
NETRADYNE_WEBHOOK_SECRET = os.environ.get('NETRADYNE_WEBHOOK_SECRET', '')
NETRADYNE_MOCK_MODE = os.environ.get('NETRADYNE_MOCK_MODE', 'true').lower() == 'true'
VEHICLE_SYNC_INTERVAL_SECONDS = int(os.environ.get('VEHICLE_SYNC_INTERVAL_SECONDS', 30))

# ─── Email ───────────────────────────────────────────────────
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'localhost')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 25))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'False') == 'True'
DEFAULT_FROM_EMAIL = os.environ.get(
    'DEFAULT_FROM_EMAIL',
    'MineGIS-TS <minegis@mines.telangana.gov.in>'
)

# ─── Twilio / SMS ────────────────────────────────────────────
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_FROM_NUMBER = os.environ.get('TWILIO_FROM_NUMBER', '+1234567890')

# ─── DRF Spectacular (API Docs) ──────────────────────────────
SPECTACULAR_SETTINGS = {
    'TITLE': 'MineGIS-TS API',
    'DESCRIPTION': (
        'Web-GIS Mining Governance Platform API\n'
        'Government of Telangana — Department of Mines & Geology\n'
        'Module 1: Web-GIS Visualization & Vehicle Tracking'
    ),
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'CONTACT': {
        'name': 'Dept. of Mines & Geology, Telangana',
        'email': 'minegis@mines.telangana.gov.in',
    },
    'LICENSE': {'name': 'Government of Telangana'},
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── Security Hardening (Phase 7 Audit Compliance) ───────────────────────────
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'False') == 'True'
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
# CSP is complex, starting with a base policy
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'", "'unsafe-eval'")
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'", "fonts.googleapis.com")
CSP_FONT_SRC = ("'self'", "fonts.gstatic.com")
SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'False') == 'True'
CSRF_COOKIE_SECURE = os.environ.get('CSRF_COOKIE_SECURE', 'False') == 'True'
REFERRER_POLICY = 'same-origin'
