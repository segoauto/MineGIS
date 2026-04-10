"""
Authentication serializers — Login, JWT, UserProfile
"""
from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['role', 'district', 'phone', 'designation', 'employee_id',
                  'mfa_enabled', 'nic_epramaan_id']
        read_only_fields = ['mfa_enabled']


class UserSerializer(serializers.ModelSerializer):
    profile = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'full_name', 'is_staff', 'is_active', 'date_joined', 'profile']
        read_only_fields = ['is_staff', 'date_joined']

    def get_full_name(self, obj: User) -> str:
        return obj.get_full_name() or obj.username

    def get_profile(self, obj: User):
        try:
            if hasattr(obj, 'profile'):
                return UserProfileSerializer(obj.profile).data
        except Exception:
            pass
        return None


class MineGISTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT serializer that includes user info in response."""

    def validate(self, attrs: dict) -> dict:
        data = super().validate(attrs)
        user = self.user
        data['user'] = UserSerializer(user).data
        return data
