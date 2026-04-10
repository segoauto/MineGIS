"""
Authentication views — Login, Refresh, Logout, Me
"""
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError

from apps.audit.models import AuditLog
from .serializers import MineGISTokenObtainPairSerializer, UserSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request: Request) -> Response:
    """
    POST /api/auth/login/
    Body: { "username": "...", "password": "..." }
    Returns: { "access": "...", "refresh": "...", "user": {...} }
    """
    serializer = MineGISTokenObtainPairSerializer(data=request.data)
    try:
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Audit log (Use the actual authenticated user from token)
        user = serializer.user
        AuditLog.objects.create(
            user=user,
            action='LOGIN',
            model_name='User',
            object_id=str(user.id),
            object_repr=user.username,
            ip_address=_get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )

        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'detail': 'Invalid credentials. Please check your username and password.', 'error': str(e)},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request: Request) -> Response:
    """
    POST /api/auth/logout/
    Body: { "refresh": "..." }
    Blacklists the refresh token.
    """
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()

        AuditLog.objects.create(
            user=request.user,
            action='LOGOUT',
            model_name='User',
            object_id=str(request.user.id),
            object_repr=request.user.username,
            ip_address=_get_client_ip(request),
        )

        return Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)
    except TokenError:
        return Response({'detail': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request: Request) -> Response:
    """
    GET /api/auth/me/
    Returns the current user's profile.
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def sso_view(request: Request) -> Response:
    """
    POST /api/auth/sso/
    NIC e-Pramaan SSO stub — to be integrated with NIC.
    """
    # TODO: Integrate with NIC e-Pramaan when govt network access is available
    return Response(
        {'detail': 'NIC e-Pramaan SSO integration pending. Contact system administrator.'},
        status=status.HTTP_501_NOT_IMPLEMENTED
    )


def _get_client_ip(request: Request) -> str:
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')

from django.contrib.auth import authenticate
from django.contrib.auth.models import User

@api_view(['POST'])
@permission_classes([AllowAny])
def debug_login(request: Request) -> Response:
    username = request.data.get('username')
    password = request.data.get('password')
    try:
        user_exists = User.objects.filter(username=username).exists()
        auth_user = authenticate(username=username, password=password)
        db_user = User.objects.get(username=username) if user_exists else None
        
        return Response({
            'username_tested': username,
            'password_length': len(password) if password else 0,
            'user_exists_in_db': user_exists,
            'db_is_active': getattr(db_user, 'is_active', None),
            'db_is_staff': getattr(db_user, 'is_staff', None),
            'db_password_starts_with': db_user.password[:15] if db_user else None,
            'authenticate_result_is_some': auth_user is not None,
        })
    except Exception as e:
        return Response({'debug_error': str(e)})
