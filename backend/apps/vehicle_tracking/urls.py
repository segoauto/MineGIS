from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'vehicles', views.VehicleViewSet, basename='vehicle')

urlpatterns = [
    path('', include(router.urls)),
    path('vehicles/alerts/', views.all_alerts, name='vehicle-alerts-all'),
    path('vehicles/alerts/<int:alert_id>/resolve/', views.resolve_alert, name='vehicle-alert-resolve'),
    path('vehicles/netradyne/webhook/', views.netradyne_webhook, name='netradyne-webhook'),
]
