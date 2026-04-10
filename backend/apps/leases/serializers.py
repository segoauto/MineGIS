"""
Mining Lease serializers — GeoJSON-aware serializers
"""
import json
from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon, Polygon
from .models import MiningLease


class MiningLeaseListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views (no geometry)."""
    days_remaining = serializers.IntegerField(read_only=True)
    is_expiring_soon = serializers.BooleanField(read_only=True)
    centroid_lon = serializers.SerializerMethodField()
    centroid_lat = serializers.SerializerMethodField()

    class Meta:
        model = MiningLease
        fields = [
            'id', 'lease_id', 'mine_name', 'mineral_type',
            'leaseholder_name', 'district', 'mandal', 'village',
            'status', 'area_hectares', 'valid_from', 'valid_till',
            'days_remaining', 'is_expiring_soon', 'royalty_due',
            'centroid_lon', 'centroid_lat',
        ]

    def get_centroid_lon(self, obj: MiningLease) -> float | None:
        if obj.centroid:
            return round(obj.centroid.x, 6)
        return None

    def get_centroid_lat(self, obj: MiningLease) -> float | None:
        if obj.centroid:
            return round(obj.centroid.y, 6)
        return None


class MiningLeaseDetailSerializer(serializers.ModelSerializer):
    """Full serializer including geometry."""
    days_remaining = serializers.IntegerField(read_only=True)
    is_expiring_soon = serializers.BooleanField(read_only=True)
    boundary_geojson = serializers.SerializerMethodField()
    centroid_geojson = serializers.SerializerMethodField()
    centroid_lon = serializers.SerializerMethodField()
    centroid_lat = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = MiningLease
        fields = '__all__'
        read_only_fields = ['lease_id', 'created_at', 'updated_at', 'created_by']

    def get_boundary_geojson(self, obj: MiningLease) -> dict | None:
        if obj.boundary:
            return json.loads(obj.boundary.geojson)
        return None

    def get_centroid_geojson(self, obj: MiningLease) -> dict | None:
        if obj.centroid:
            return json.loads(obj.centroid.geojson)
        return None

    def get_centroid_lon(self, obj: MiningLease) -> float | None:
        if obj.centroid:
            return round(obj.centroid.x, 6)
        return None

    def get_centroid_lat(self, obj: MiningLease) -> float | None:
        if obj.centroid:
            return round(obj.centroid.y, 6)
        return None

    def get_created_by_name(self, obj: MiningLease) -> str | None:
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def validate_boundary(self, value):
        """Auto-wrap Polygon → MultiPolygon if needed."""
        if value is None:
            return value
        geom = value
        if isinstance(geom, Polygon):
            geom = MultiPolygon(geom)
        return geom

    def to_internal_value(self, data):
        """
        Accept boundary_geojson from frontend; map it to the 'boundary' field.
        Also accept raw GeoJSON dict/string for boundary.
        """
        # Allow frontend to send boundary_geojson instead of boundary
        if 'boundary_geojson' in data and 'boundary' not in data:
            data = dict(data)
            boundary_val = data.pop('boundary_geojson')
            if boundary_val:
                data['boundary'] = boundary_val
        return super().to_internal_value(data)


class MiningLeaseGeoJSONSerializer(serializers.ModelSerializer):
    """GeoJSON FeatureCollection serializer for map display."""

    def to_representation(self, queryset) -> dict:
        features = []
        for lease in queryset:
            if not lease.boundary:
                # If no boundary, still include as a point
                geometry = None
                if lease.centroid:
                    geometry = json.loads(lease.centroid.geojson)
            else:
                geometry = json.loads(lease.boundary.geojson)

            features.append({
                'type': 'Feature',
                'id': lease.pk,
                'geometry': geometry,
                'properties': {
                    'lease_id': lease.lease_id,
                    'mine_name': lease.mine_name,
                    'mineral_type': lease.mineral_type,
                    'mineral_display': lease.get_mineral_type_display(),
                    'leaseholder_name': lease.leaseholder_name,
                    'district': lease.district,
                    'mandal': lease.mandal,
                    'village': lease.village,
                    'status': lease.status,
                    'status_display': lease.get_status_display(),
                    'area_hectares': float(lease.area_hectares),
                    'valid_till': str(lease.valid_till),
                    'days_remaining': lease.days_remaining,
                    'is_expiring_soon': lease.is_expiring_soon,
                    'royalty_due': float(lease.royalty_due),
                }
            })

        return {
            'type': 'FeatureCollection',
            'features': features,
            'totalCount': len(features),
        }
