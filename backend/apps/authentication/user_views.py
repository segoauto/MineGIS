"""
Module 5: User Management API
RBAC-governed user listing, creation, profile updates.
Supports MFA status management and role assignment.
"""
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import serializers, viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.request import Request

from apps.authentication.models import UserProfile


# ─── Serializers ───────────────────────────────────────────────────────────────

class UserProfileSerializer(serializers.ModelSerializer):
    role_display = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'role', 'role_display', 'district', 'phone',
            'designation', 'employee_id',
            'mfa_enabled', 'nic_epramaan_id',
        ]

    def get_role_display(self, obj):
        return obj.get_role_display()


class UserManagementSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    role = serializers.CharField(write_only=True, required=False)
    district = serializers.CharField(write_only=True, required=False, allow_blank=True)
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    designation = serializers.CharField(write_only=True, required=False, allow_blank=True)
    employee_id = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'is_active', 'is_staff', 'date_joined', 'last_login',
            'profile',
            # write-only profile fields
            'role', 'district', 'phone', 'designation', 'employee_id',
        ]
        read_only_fields = ['date_joined', 'last_login']
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    @transaction.atomic
    def create(self, validated_data):
        profile_fields = {
            k: validated_data.pop(k, None)
            for k in ['role', 'district', 'phone', 'designation', 'employee_id']
        }
        password = validated_data.pop('password', None)
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()

        # Create or update profile
        profile, _ = UserProfile.objects.get_or_create(user=user)
        for field, value in profile_fields.items():
            if value is not None:
                setattr(profile, field, value)
        profile.save()
        return user

    @transaction.atomic
    def update(self, instance, validated_data):
        profile_fields = {
            k: validated_data.pop(k, None)
            for k in ['role', 'district', 'phone', 'designation', 'employee_id']
        }
        password = validated_data.pop('password', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)
        instance.save()

        # Update profile
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        for field, value in profile_fields.items():
            if value is not None:
                setattr(profile, field, value)
        profile.save()
        return instance


# ─── ViewSet ───────────────────────────────────────────────────────────────────

class UserManagementViewSet(viewsets.ModelViewSet):
    """
    Module 5: User Management RBAC
    GET    /api/auth/users/          — list all users (admin only)
    POST   /api/auth/users/          — create user (admin only)
    GET    /api/auth/users/{id}/     — user detail
    PATCH  /api/auth/users/{id}/     — update user/role
    DELETE /api/auth/users/{id}/     — deactivate (soft delete)
    GET    /api/auth/users/me/       — current user profile
    POST   /api/auth/users/{id}/reset-password/ — force password reset
    """
    serializer_class = UserManagementSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name', 'profile__district', 'profile__employee_id']
    ordering_fields = ['username', 'date_joined', 'last_login']
    ordering = ['-date_joined']

    def get_queryset(self):
        return User.objects.select_related('profile').all()

    def get_permissions(self):
        # Allow authenticated users to access their own profile
        if self.action in ['me', 'update_profile']:
            return [IsAuthenticated()]
        return super().get_permissions()

    def destroy(self, request, *args, **kwargs):
        """Soft delete — deactivate instead of hard delete."""
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response({'detail': f'User {user.username} deactivated.'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='me', permission_classes=[IsAuthenticated])
    def me(self, request: Request) -> Response:
        """GET /api/auth/users/me/ — returns current authenticated user's full profile."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request: Request, pk=None) -> Response:
        """POST /api/auth/users/{id}/reset-password/ — force set new password."""
        user = self.get_object()
        new_password = request.data.get('new_password')
        if not new_password or len(new_password) < 8:
            return Response(
                {'detail': 'Password must be at least 8 characters.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.set_password(new_password)
        user.save()
        return Response({'detail': f'Password for {user.username} has been reset.'})

    @action(detail=True, methods=['post'], url_path='toggle-mfa')
    def toggle_mfa(self, request: Request, pk=None) -> Response:
        """POST /api/auth/users/{id}/toggle-mfa/ — enable or disable MFA."""
        user = self.get_object()
        profile, _ = UserProfile.objects.get_or_create(user=user)
        enable = request.data.get('enable', not profile.mfa_enabled)

        if enable and not profile.mfa_secret:
            profile.generate_mfa_secret()

        profile.mfa_enabled = enable
        profile.save(update_fields=['mfa_enabled', 'mfa_secret'])

        response_data = {
            'mfa_enabled': profile.mfa_enabled,
            'username': user.username,
        }
        if enable:
            response_data['totp_uri'] = profile.get_mfa_totp_uri()

        return Response(response_data)

    @action(detail=False, methods=['get'], url_path='roles')
    def roles(self, request: Request) -> Response:
        """GET /api/auth/users/roles/ — returns all possible RBAC roles."""
        return Response([
            {'value': r[0], 'label': r[1]}
            for r in UserProfile.ROLE_CHOICES
        ])
