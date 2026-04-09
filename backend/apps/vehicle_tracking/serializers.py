"""
Vehicle tracking serializers — GeoJSON-aware serializers for Vehicle, VehicleAlert
"""
import json
from rest_framework import serializers
from .models import Vehicle, VehicleLocationHistory, VehicleAlert


class VehicleSerializer(serializers.ModelSerializer):
    last_lon = serializers.SerializerMethodField()
    last_lat = serializers.SerializerMethodField()
    assigned_officer_name = serializers.SerializerMethodField()
    current_lease_id = serializers.SerializerMethodField()
    current_lease_name = serializers.SerializerMethodField()
    vehicle_type_display = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = [
            'id', 'netradyne_device_id', 'vehicle_number', 'vehicle_type',
            'vehicle_type_display', 'driver_name', 'driver_license',
            'assigned_district', 'assigned_officer_name',
            'last_lon', 'last_lat', 'last_seen',
            'current_speed_kmh', 'current_heading', 'is_online', 'engine_on',
            'current_lease_id', 'current_lease_name',
        ]

    def get_last_lon(self, obj: Vehicle) -> float | None:
        return round(obj.last_location.x, 6) if obj.last_location else None

    def get_last_lat(self, obj: Vehicle) -> float | None:
        return round(obj.last_location.y, 6) if obj.last_location else None

    def get_assigned_officer_name(self, obj: Vehicle) -> str | None:
        if obj.assigned_officer:
            return obj.assigned_officer.get_full_name() or obj.assigned_officer.username
        return None

    def get_current_lease_id(self, obj: Vehicle) -> str | None:
        return obj.current_lease.lease_id if obj.current_lease else None

    def get_current_lease_name(self, obj: Vehicle) -> str | None:
        return obj.current_lease.mine_name if obj.current_lease else None

    def get_vehicle_type_display(self, obj: Vehicle) -> str:
        return obj.get_vehicle_type_display()


class VehicleLocationHistorySerializer(serializers.ModelSerializer):
    lon = serializers.SerializerMethodField()
    lat = serializers.SerializerMethodField()

    class Meta:
        model = VehicleLocationHistory
        fields = [
            'id', 'lon', 'lat', 'timestamp', 'speed_kmh', 'heading',
            'altitude', 'accuracy', 'engine_on', 'harsh_braking',
            'harsh_acceleration', 'overspeeding',
        ]

    def get_lon(self, obj: VehicleLocationHistory) -> float:
        return round(obj.location.x, 6)

    def get_lat(self, obj: VehicleLocationHistory) -> float:
        return round(obj.location.y, 6)


class VehicleAlertSerializer(serializers.ModelSerializer):
    vehicle_number = serializers.CharField(source='vehicle.vehicle_number', read_only=True)
    driver_name = serializers.CharField(source='vehicle.driver_name', read_only=True)
    lease_id = serializers.CharField(source='lease.lease_id', read_only=True, default=None)
    mine_name = serializers.CharField(source='lease.mine_name', read_only=True, default=None)
    alert_type_display = serializers.CharField(source='get_alert_type_display', read_only=True)
    resolved_by_name = serializers.SerializerMethodField()
    alert_lon = serializers.SerializerMethodField()
    alert_lat = serializers.SerializerMethodField()

    class Meta:
        model = VehicleAlert
        fields = [
            'id', 'vehicle_number', 'driver_name', 'alert_type', 'alert_type_display',
            'severity', 'alert_lon', 'alert_lat', 'lease_id', 'mine_name',
            'timestamp', 'description', 'is_resolved', 'resolved_by_name',
            'resolved_at',
        ]

    def get_resolved_by_name(self, obj: VehicleAlert) -> str | None:
        if obj.resolved_by:
            return obj.resolved_by.get_full_name() or obj.resolved_by.username
        return None

    def get_alert_lon(self, obj: VehicleAlert) -> float | None:
        return round(obj.location.x, 6) if obj.location else None

    def get_alert_lat(self, obj: VehicleAlert) -> float | None:
        return round(obj.location.y, 6) if obj.location else None


class VehicleGeoJSONSerializer:
    """Build GeoJSON FeatureCollection for vehicle positions."""

    @staticmethod
    def build_feature_collection(vehicles) -> dict:
        features = []
        for v in vehicles:
            if not v.last_location:
                continue
            features.append({
                'type': 'Feature',
                'id': v.pk,
                'geometry': {
                    'type': 'Point',
                    'coordinates': [
                        round(v.last_location.x, 6),
                        round(v.last_location.y, 6),
                    ]
                },
                'properties': {
                    'vehicle_id': v.pk,
                    'netradyne_device_id': v.netradyne_device_id,
                    'vehicle_number': v.vehicle_number,
                    'vehicle_type': v.vehicle_type,
                    'driver_name': v.driver_name,
                    'assigned_district': v.assigned_district,
                    'current_speed_kmh': round(v.current_speed_kmh, 1),
                    'current_heading': round(v.current_heading, 1),
                    'is_online': v.is_online,
                    'engine_on': v.engine_on,
                    'last_seen': v.last_seen.isoformat() if v.last_seen else None,
                    'current_lease_id': v.current_lease.lease_id if v.current_lease else None,
                }
            })

        return {
            'type': 'FeatureCollection',
            'features': features,
            'totalCount': len(features),
        }
