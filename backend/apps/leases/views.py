"""
Mining Lease views — Full CRUD + GeoJSON + spatial analysis endpoints
"""
import json
import logging
from django.db.models import Q
from django.contrib.gis.geos import Point, GEOSGeometry
from django.contrib.gis.db.models.functions import Distance
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import MiningLease
from .serializers import (
    MiningLeaseListSerializer,
    MiningLeaseDetailSerializer,
    MiningLeaseGeoJSONSerializer,
)
from .filters import MiningLeaseFilter

logger = logging.getLogger(__name__)


class LeaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for MiningLease CRUD operations.
    GET    /api/leases/
    POST   /api/leases/
    GET    /api/leases/{pk}/
    PUT    /api/leases/{pk}/
    """
    permission_classes = [IsAuthenticated]
    lookup_field = 'lease_id'
    lookup_value_regex = '[a-zA-Z0-9_/-]+'
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = MiningLeaseFilter
    search_fields = [
        'lease_id', 'mine_name', 'leaseholder_name',
        'district', 'mandal', 'village', 'survey_number'
    ]
    ordering_fields = [
        'lease_id', 'mine_name', 'district', 'valid_till',
        'area_hectares', 'royalty_due', 'created_at'
    ]
    ordering = ['-created_at']

    def get_queryset(self):
        return MiningLease.objects.select_related('created_by').all()

    def get_serializer_class(self):
        if self.action == 'list':
            return MiningLeaseListSerializer
        return MiningLeaseDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='geojson/all')
    def geojson_all(self, request: Request) -> Response:
        """
        GET /api/leases/geojson/all/
        Returns all leases as GeoJSON FeatureCollection for map display.
        """
        queryset = self.filter_queryset(self.get_queryset())
        serializer = MiningLeaseGeoJSONSerializer()
        data = serializer.to_representation(queryset)
        return Response(data)

    @action(detail=False, methods=['get'], url_path='search')
    def search_leases(self, request: Request) -> Response:
        """
        GET /api/leases/search/?q=venkat&limit=10
        Full text search across lease fields.
        """
        query = request.query_params.get('q', '').strip()
        limit = min(int(request.query_params.get('limit', 10)), 50)

        if len(query) < 2:
            return Response({'results': []})

        queryset = MiningLease.objects.filter(
            Q(lease_id__icontains=query) |
            Q(mine_name__icontains=query) |
            Q(leaseholder_name__icontains=query) |
            Q(district__icontains=query) |
            Q(mandal__icontains=query) |
            Q(village__icontains=query)
        )[:limit]

        serializer = MiningLeaseListSerializer(queryset, many=True)
        return Response({'results': serializer.data, 'count': len(serializer.data)})

    @action(detail=True, methods=['get'], url_path='geojson')
    def lease_geojson(self, request: Request, lease_id=None, **kwargs) -> Response:
        """
        GET /api/leases/{pk}/geojson/
        Returns single lease as GeoJSON Feature.
        """
        lease = self.get_object()
        feature = {
            'type': 'Feature',
            'id': lease.pk,
            'geometry': json.loads(lease.boundary.geojson) if lease.boundary else None,
            'properties': MiningLeaseDetailSerializer(lease).data,
        }
        return Response(feature)

    @action(detail=True, methods=['get'], url_path='conflicts')
    def conflicts(self, request: Request, lease_id=None, **kwargs) -> Response:
        """
        GET /api/leases/{pk}/conflicts/
        Runs PostGIS ST_Intersects against all spatial layers.
        Returns overlapping areas.
        """
        from apps.gis.models import SpatialLayer
        lease = self.get_object()

        if not lease.boundary:
            return Response({'conflicts': [], 'message': 'No boundary defined for this lease'})

        # PostGIS ST_Intersects query
        conflicting_layers = SpatialLayer.objects.filter(
            geometry__intersects=lease.boundary
        ).values('id', 'name', 'layer_type', 'source')

        # Also check against other active leases
        conflicting_leases = MiningLease.objects.filter(
            boundary__intersects=lease.boundary
        ).exclude(pk=lease.pk).values(
            'lease_id', 'mine_name', 'leaseholder_name', 'status'
        )

        results = {
            'lease_id': lease.lease_id,
            'conflicts': {
                'spatial_layers': list(conflicting_layers),
                'other_leases': list(conflicting_leases),
            },
            'has_conflicts': (
                conflicting_layers.exists() or conflicting_leases.exists()
            ),
        }
        return Response(results)

    @action(detail=True, methods=['get'], url_path='buffer')
    def buffer_analysis(self, request: Request, lease_id=None, **kwargs) -> Response:
        """
        GET /api/leases/{pk}/buffer/?radius=500
        PostGIS ST_Buffer + ST_Intersects for buffer zone analysis.
        """
        from apps.gis.models import SpatialLayer
        lease = self.get_object()

        try:
            radius_m = float(request.query_params.get('radius', 500))
            if radius_m <= 0 or radius_m > 10000:
                return Response(
                    {'error': 'Radius must be between 0 and 10000 meters'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (ValueError, TypeError):
            return Response({'error': 'Invalid radius parameter'}, status=status.HTTP_400_BAD_REQUEST)

        if not lease.boundary:
            return Response({'error': 'No boundary defined for this lease'}, status=status.HTTP_400_BAD_REQUEST)

        # PostGIS: buffer in Web Mercator (meters), then back to WGS84
        from django.contrib.gis.db.models.functions import Transform, Buffer
        from django.db.models import ExpressionWrapper

        # Convert to EPSG:32644 (UTM Zone 44N — Telangana) for metric buffer
        buffer_query = MiningLease.objects.filter(pk=lease.pk).annotate(
            buffered=Buffer(Transform('boundary', 32644), radius_m)
        ).first()

        buffer_geom_wgs84 = buffer_query.buffered.transform(4326, clone=True) if buffer_query.buffered else None

        # Find layers within buffer
        layers_in_buffer = []
        leases_in_buffer = []

        if buffer_geom_wgs84:
            layers_in_buffer = list(SpatialLayer.objects.filter(
                geometry__intersects=buffer_geom_wgs84
            ).values('id', 'name', 'layer_type', 'source'))

            leases_in_buffer = list(MiningLease.objects.filter(
                boundary__intersects=buffer_geom_wgs84
            ).exclude(pk=lease.pk).values(
                'lease_id', 'mine_name', 'status', 'district'
            ))

        return Response({
            'lease_id': lease.lease_id,
            'radius_meters': radius_m,
            'buffer_geojson': json.loads(buffer_geom_wgs84.geojson) if buffer_geom_wgs84 else None,
            'layers_in_buffer': layers_in_buffer,
            'leases_in_buffer': leases_in_buffer,
        })
