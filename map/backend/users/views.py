from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from mining.models import District
from mining.services import apply_user_district_filter
from users.models import UserProfile
from users.permissions import IsStateAdmin


def serialize_user(user):
    profile = getattr(user, 'profile', None)
    return {
        'id': user.id,
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'role': profile.role if profile else None,
        'district': profile.district_id if profile and profile.district else None,
        'district_name': profile.district.name if profile and profile.district else None,
        'is_active': profile.is_active if profile else user.is_active,
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = (request.data.get('username') or '').strip().lower()
    password = request.data.get('password') or ''

    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response({'detail': 'Invalid username or password.'}, status=status.HTTP_401_UNAUTHORIZED)

    profile = getattr(user, 'profile', None)
    if profile is None or not profile.is_active:
        return Response({'detail': 'This account is inactive.'}, status=status.HTTP_403_FORBIDDEN)

    login(request, user)
    profile.last_login_at = timezone.now()
    profile.save(update_fields=['last_login_at'])

    return Response({'detail': 'Login successful.', 'user': serialize_user(user)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response({'detail': 'Logged out successfully.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response({'user': serialize_user(request.user)})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStateAdmin])
def user_admin_list(request):
    users = User.objects.select_related('profile__district').all().order_by('username')
    return Response({'results': [serialize_user(u) for u in users]})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStateAdmin])
def user_create(request):
    district_id = request.data.get('district_id')
    district = None
    if district_id:
        district = District.objects.filter(id=district_id).first()
    username = (request.data.get('username') or '').strip()
    password = request.data.get('password') or ''
    role = request.data.get('role', 'DISTRICT_USER')

    if not username:
        return Response({'detail': 'Username is required.'}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({'detail': 'Username already exists.'}, status=400)

    if role == 'DISTRICT_USER' and not district:
        return Response({'detail': 'District is required for district users.'}, status=400)

    user = User.objects.create_user(username=username, password=password or f'{username}123')
    profile = user.profile
    profile.role = role
    profile.district = district
    profile.is_active = True
    profile.save()
    return Response({'detail': 'User created.', 'user': serialize_user(user)}, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStateAdmin])
def user_toggle_active(request, user_id):
    user = User.objects.get(id=user_id)
    user.profile.is_active = not user.profile.is_active
    user.profile.save(update_fields=['is_active'])
    return Response({'detail': f"User {'activated' if user.profile.is_active else 'deactivated'}.", 'user': serialize_user(user)})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStateAdmin])
def user_reset_password(request, user_id):
    user = User.objects.get(id=user_id)
    new_password = request.data.get('password') or f'{user.username}123'
    user.set_password(new_password)
    user.save()
    return Response({'detail': 'Password reset successfully.', 'username': user.username})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStateAdmin])
def user_assign_district(request, user_id):
    user = User.objects.get(id=user_id)
    district_id = request.data.get('district_id')
    if district_id:
        district = District.objects.get(id=district_id)
        user.profile.district = district
        user.profile.role = UserProfile.DISTRICT_USER
        user.profile.save()
        return Response({'detail': 'Assigned district updated.', 'user': serialize_user(user)})
    return Response({'detail': 'district_id is required.'}, status=400)
