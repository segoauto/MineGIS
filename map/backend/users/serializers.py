from django.contrib.auth import get_user_model
from rest_framework import serializers

from mining.models import District
from users.models import UserProfile

User = get_user_model()


class DistrictSerializer(serializers.ModelSerializer):
    class Meta:
        model = District
        fields = ['id', 'name', 'area', 'geom']


class UserProfileSerializer(serializers.ModelSerializer):
    district_name = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['role', 'district', 'district_name', 'is_active', 'username']
        read_only_fields = ['role', 'district', 'district_name', 'username']

    def get_username(self, obj):
        return obj.user.username

    def get_district_name(self, obj):
        if obj.district:
            return obj.district.name
        return None


class PublicUserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    district = serializers.SerializerMethodField()
    district_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role', 'district', 'district_name']

    def get_role(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.role if profile else None

    def get_district(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.district_id if profile and profile.district else None

    def get_district_name(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.district.name if profile and profile.district else None
