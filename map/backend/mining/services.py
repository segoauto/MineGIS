from django.db.models import Q

from users.models import UserProfile


def apply_user_district_filter(user, queryset):
    if not user or not user.is_authenticated:
        return queryset

    profile = getattr(user, 'profile', None)
    if not profile:
        return queryset

    if profile.role == UserProfile.STATE_ADMIN:
        return queryset

    if profile.role == UserProfile.DISTRICT_USER and profile.district_id:
        return queryset.filter(district=profile.district)

    return queryset.none()


def apply_mandal_filter(queryset, district_id=None, district_name=None):
    filters = Q()
    if district_id:
        filters &= Q(district_id=district_id)
    if district_name:
        filters &= Q(district__name__iexact=district_name)
    return queryset.filter(filters)
