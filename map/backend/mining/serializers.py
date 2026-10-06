from rest_framework import serializers
from django.contrib.gis.geos import GEOSGeometry

from mining.models import District, Mandal, Mine


class DistrictSerializer(serializers.ModelSerializer):
    class Meta:
        model = District
        fields = ['id', 'name', 'area']


class MandalSerializer(serializers.ModelSerializer):
    district_name = serializers.SerializerMethodField()

    class Meta:
        model = Mandal
        fields = ['id', 'district', 'district_name', 'name']

    def get_district_name(self, obj):
        return obj.district.name if obj.district else None


class MineSerializer(serializers.ModelSerializer):
    district_name = serializers.SerializerMethodField()
    mandal_name = serializers.SerializerMethodField()

    class Meta:
        model = Mine
        fields = [
            'id', 'district', 'district_name', 'mandal', 'mandal_name',
            'company', 'address', 'mineral', 'mineral_type', 'survey_number',
            'land_type', 'production', 'dispatch', 'ets', 'notice',
            'reg_from', 'reg_to'
        ]

    def get_district_name(self, obj):
        return obj.district.name if obj.district else None

    def get_mandal_name(self, obj):
        if obj.mandal:
            return obj.mandal.name
        return obj.mandal_name


class DashboardStatsSerializer(serializers.ModelSerializer):
    class Meta:
        model = District
        fields = ['id', 'name']
