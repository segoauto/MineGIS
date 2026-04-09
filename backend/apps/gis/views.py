"""
GIS views — Spatial layers, DGPS points, GeoServer proxy, compliance report
"""
import json
import logging
import requests
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from .models import SpatialLayer, DGPSSurveyPoint
from apps.leases.models import MiningLease

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def layers_list(request: Request) -> Response:
    """GET /api/gis/layers/ — list all spatial layer types and counts"""
    from django.db.models import Count
    layers = SpatialLayer.objects.values('layer_type').annotate(count=Count('id'))
    return Response({'layers': list(layers)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def layer_geojson(request: Request, layer_type: str) -> Response:
    """
    GET /api/gis/layers/{type}/geojson/
    Returns all features of a given layer type as GeoJSON FeatureCollection.
    """
    valid_types = [t[0] for t in SpatialLayer.LAYER_TYPES]
    if layer_type not in valid_types:
        return Response(
            {'error': f'Invalid layer type. Must be one of: {", ".join(valid_types)}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    layers = SpatialLayer.objects.filter(layer_type=layer_type)

    features = []
    for layer in layers:
        features.append({
            'type': 'Feature',
            'id': layer.pk,
            'geometry': json.loads(layer.geometry.geojson),
            'properties': {
                'name': layer.name,
                'layer_type': layer.layer_type,
                'layer_type_display': layer.get_layer_type_display(),
                'source': layer.source,
                'last_updated': str(layer.last_updated),
                **layer.properties,
            }
        })

    return Response({
        'type': 'FeatureCollection',
        'features': features,
        'layer_type': layer_type,
        'count': len(features),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dgps_points(request: Request) -> Response:
    """
    GET /api/gis/dgps-points/?lease_id=ML/TS/2019/00234
    Returns DGPS survey points for a lease as GeoJSON.
    """
    lease_id = request.query_params.get('lease_id')
    queryset = DGPSSurveyPoint.objects.select_related('lease')

    if lease_id:
        queryset = queryset.filter(lease__lease_id=lease_id)

    features = []
    for point in queryset:
        features.append({
            'type': 'Feature',
            'id': point.pk,
            'geometry': json.loads(point.location.geojson),
            'properties': {
                'survey_id': point.survey_id,
                'lease_id': point.lease.lease_id,
                'mine_name': point.lease.mine_name,
                'accuracy_meters': point.accuracy_meters,
                'survey_date': str(point.survey_date),
                'surveyor_name': point.surveyor_name,
                'elevation': point.elevation,
                'notes': point.notes,
            }
        })

    return Response({
        'type': 'FeatureCollection',
        'features': features,
        'count': len(features),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def compliance_report(request: Request, lease_id: str) -> Response:
    """
    GET /api/gis/compliance-report/{lease_id}/
    Generates full spatial compliance report using PostGIS.
    """
    try:
        lease = MiningLease.objects.get(lease_id=lease_id)
    except MiningLease.DoesNotExist:
        return Response({'error': 'Lease not found'}, status=status.HTTP_404_NOT_FOUND)

    report = {
        'lease_id': lease.lease_id,
        'mine_name': lease.mine_name,
        'status': lease.status,
        'area_hectares': float(lease.area_hectares),
        'days_remaining': lease.days_remaining,
        'has_boundary': lease.boundary is not None,
        'compliance_checks': {},
        'spatial_conflicts': [],
        'dgps_survey_count': 0,
    }

    if lease.boundary:
        # Check against regulated layers
        from .models import SpatialLayer
        forest_overlap = SpatialLayer.objects.filter(
            layer_type='FOREST', geometry__intersects=lease.boundary
        ).exists()
        water_overlap = SpatialLayer.objects.filter(
            layer_type='WATER', geometry__intersects=lease.boundary
        ).exists()
        eco_overlap = SpatialLayer.objects.filter(
            layer_type='ECO', geometry__intersects=lease.boundary
        ).exists()

        report['compliance_checks'] = {
            'forest_overlap': forest_overlap,
            'water_body_overlap': water_overlap,
            'eco_sensitive_zone_overlap': eco_overlap,
            'all_clear': not (forest_overlap or water_body_overlap or eco_overlap),
        }
        report['compliance_checks']['all_clear'] = not (
            forest_overlap or water_overlap or eco_overlap
        )

        # DGPS points count
        report['dgps_survey_count'] = DGPSSurveyPoint.objects.filter(lease=lease).count()

    return Response(report)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def geoserver_wms_proxy(request: Request) -> Response:
    """
    GET /api/geoserver/wms/ — proxies WMS request to GeoServer
    Avoids CORS issues, adds auth.
    """
    params = dict(request.query_params)
    geoserver_url = f"{settings.GEOSERVER_URL}/wms"

    try:
        response = requests.get(
            geoserver_url,
            params=params,
            auth=(settings.GEOSERVER_ADMIN_USER, settings.GEOSERVER_ADMIN_PASSWORD),
            timeout=30,
        )
        from django.http import HttpResponse
        return HttpResponse(
            response.content,
            content_type=response.headers.get('Content-Type', 'image/png'),
            status=response.status_code,
        )
    except requests.RequestException as e:
        logger.error(f"GeoServer WMS proxy error: {e}")
        return Response({'error': 'GeoServer unavailable'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
