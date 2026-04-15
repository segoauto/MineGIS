from rest_framework import permissions
from typing import Any

class RoleBasedPermission(permissions.BasePermission):
    """
    State-of-the-art RBAC Permission for MineGIS-TS.
    Enforces role-based access to HTTP methods.
    """
    
    # Mapping of roles to allowed methods
    # Roles defined in apps.authentication.models.UserProfile.ROLE_CHOICES
    ROLE_PERMISSIONS = {
        'R01_SUPER_ADMIN': ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
        'R02_STATE_EXEC': ['GET', 'POST', 'PUT', 'PATCH', 'HEAD', 'OPTIONS'],
        'R03_STATE_MGR': ['GET', 'POST', 'PUT', 'PATCH', 'HEAD', 'OPTIONS'],
        'R04_DISTRICT_OFFICER': ['GET', 'POST', 'PUT', 'PATCH', 'HEAD', 'OPTIONS'],
        'R05_FIELD_OFFICER': ['GET', 'POST', 'PATCH', 'HEAD', 'OPTIONS'],
        'R06_DATA_ENTRY': ['GET', 'POST', 'PUT', 'PATCH', 'HEAD', 'OPTIONS'],
        'R07_GIS_ANALYST': ['GET', 'POST', 'PUT', 'PATCH', 'HEAD', 'OPTIONS'],
        'R08_AUDITOR': ['GET', 'HEAD', 'OPTIONS'],
        'R10_HELPDESK': ['GET', 'HEAD', 'OPTIONS'],
        'R11_REPORT_VIEWER': ['GET', 'HEAD', 'OPTIONS'],
        'R09_LEASEHOLDER': ['GET', 'HEAD', 'OPTIONS'], # Restrict to own leases in future
    }

    def has_permission(self, request: Any, view: Any) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
            
        role = getattr(request.user.profile, 'role', 'R11_REPORT_VIEWER')
        allowed_methods = self.ROLE_PERMISSIONS.get(role, ['GET', 'HEAD', 'OPTIONS'])
        
        # Superuser bypass
        if request.user.is_superuser:
            return True
            
        return request.method in allowed_methods

    def has_object_permission(self, request: Any, view: Any, obj: Any) -> bool:
        if not self.has_permission(request, view):
            return False

        # Superuser bypass
        if request.user.is_superuser:
            return True

        role = getattr(request.user.profile, 'role', 'R11_REPORT_VIEWER')

        # RBAC-09: Leaseholder Ownership Check
        if role == 'R09_LEASEHOLDER':
            from apps.leases.models import MiningLease
            if isinstance(obj, MiningLease):
                # Check email or specific leaseholder link
                # (Assumes user email matches leaseholder_email)
                return obj.leaseholder_email == request.user.email
            
            # For other objects (e.g. VehicleTracking), check lease link
            if hasattr(obj, 'lease'):
                return obj.lease.leaseholder_email == request.user.email
            if hasattr(obj, 'lease_id'):
                # Handle cases where only ID is present
                return MiningLease.objects.filter(lease_id=obj.lease_id, leaseholder_email=request.user.email).exists()

        return True
