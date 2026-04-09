"""
Mining Lease serializers — GeoJSON-aware serializers
"""
import json
from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from django.contrib.gis.geos import GEOSGeometry
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
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = MiningLease
        fields = '__all__'

    def get_boundary_geojson(self, obj: MiningLease) -> dict | None:
        if obj.boundary:
            return json.loads(obj.boundary.geojson)
        return None

    def get_centroid_geojson(self, obj: MiningLease) -> dict | None:
        if obj.centroid:
            return json.loads(obj.centroid.geojson)
        return None

    def get_created_by_name(self, obj: MiningLease) -> str | None:
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None


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
