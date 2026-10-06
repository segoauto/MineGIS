from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsStateAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and getattr(request.user, 'profile', None) and request.user.profile.role == 'STATE_ADMIN'
        )


class IsDistrictUser(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and getattr(request.user, 'profile', None) and request.user.profile.role == 'DISTRICT_USER'
        )


class CanAccessDistrictData(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        profile = getattr(request.user, 'profile', None)
        if not profile:
            return False
        if profile.role == 'STATE_ADMIN':
            return True
        return bool(profile.role == 'DISTRICT_USER' and profile.district_id is not None)


class ReadOnlyOrStateAdmin(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return IsStateAdmin().has_permission(request, view)
