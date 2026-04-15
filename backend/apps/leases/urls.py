from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .document_views import LeaseDocumentViewSet, ProductionRecordViewSet

router = DefaultRouter()
router.register(r'leases', views.LeaseViewSet, basename='lease')
router.register(r'leases/documents', LeaseDocumentViewSet, basename='lease-document')
router.register(r'leases/production', ProductionRecordViewSet, basename='production-record')

urlpatterns = [
    path('', include(router.urls)),
]
