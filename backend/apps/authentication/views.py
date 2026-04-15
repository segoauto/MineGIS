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
            user_name=user.username,
            user_role=getattr(user.profile, 'role', 'R11_REPORT_VIEWER'),
            user_ip=_get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            action_type='LOGIN',
            entity_type='User',
            entity_id=str(user.id),
            description=f"User {user.username} logged in successfully",
            module='Authentication'
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
            user_name=request.user.username,
            user_role=getattr(request.user.profile, 'role', 'R11_REPORT_VIEWER'),
            user_ip=_get_client_ip(request),
            action_type='LOGOUT',
            entity_type='User',
            entity_id=str(request.user.id),
            description=f"User {request.user.username} logged out",
            module='Authentication'
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


@api_view(['GET'])
@permission_classes([AllowAny])
def sso_authorize(request: Request) -> Response:
    """
    GET /api/auth/sso/authorize/
    Redirects to the NIC e-Pramaan authorization endpoint (Mocked).
    """
    # In production, this would be a real OIDC URL:
    # https://epramaan.meripehchaan.gov.in/oauth/authorize?client_id=...
    mock_sso_url = "http://localhost:3000/sso-portal" # Simulation portal
    return Response({'redirect_url': mock_sso_url})

@api_view(['POST'])
@permission_classes([AllowAny])
def sso_callback(request: Request) -> Response:
    """
    POST /api/auth/sso/callback/
    Exchanges authorization code for JWT.
    """
    code = request.data.get('code')
    if not code:
        return Response({'detail': 'Authorization code missing'}, status=400)

    # In a real OIDC flow, we would call NIC's token endpoint here.
    # For simulation, we assume any code = successful govt auth.
    
    # Mock user data from "NIC Claims"
    sso_username = f"nic_user_{code[:6]}"
    email = f"{sso_username}@gov.in"
    
    user, created = User.objects.get_or_create(
        username=email,
        defaults={
            'email': email,
            'first_name': 'Govt.',
            'last_name': 'Officer'
        }
    )

    refresh = RefreshToken.for_user(user)
    
    # Add custom claims
    data = {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'user': UserSerializer(user).data
    }

    # Audit log
    AuditLog.objects.create(
        user=user,
        action_type='LOGIN',
        entity_type='User',
        entity_id=str(user.id),
        description=f"SSO Login via NIC e-Pramaan (Code: {code[:4]}...)"
    )

    return Response(data)

@api_view(['POST'])
@permission_classes([AllowAny])
def sso_view(request: Request) -> Response:
    """... Deprecated legacy view ..."""
    return Response({'detail': 'Use /api/auth/sso/authorize/'}, status=308)


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
