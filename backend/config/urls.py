"""
MineGIS-TS URL Configuration
Full routing for all API endpoints
"""
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

urlpatterns = [
    # Django admin
    path('admin/', admin.site.urls),

    # API Schema
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Authentication
    path('api/auth/', include('apps.authentication.urls')),

    # Mining Leases
    path('api/', include('apps.leases.urls')),

    # GIS / Spatial
    path('api/', include('apps.gis.urls')),

    # Vehicle Tracking
    path('api/', include('apps.vehicle_tracking.urls')),

    # Audit Logs (Module 5)
    path('api/audit/', include('apps.audit.urls')),

    # Notifications (F-04)
    path('api/notifications/', include('apps.notifications.urls')),
]
