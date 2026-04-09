"""
Mining Lease filters — django-filter backend
"""
import django_filters
from .models import MiningLease


class MiningLeaseFilter(django_filters.FilterSet):
    # Exact match filters
    status = django_filters.MultipleChoiceFilter(choices=MiningLease.STATUS_CHOICES)
    mineral_type = django_filters.MultipleChoiceFilter(choices=MiningLease.MINERAL_CHOICES)
    district = django_filters.CharFilter(lookup_expr='iexact')
    mandal = django_filters.CharFilter(lookup_expr='icontains')
    village = django_filters.CharFilter(lookup_expr='icontains')

    # Date range filters
    valid_from_after = django_filters.DateFilter(field_name='valid_from', lookup_expr='gte')
    valid_from_before = django_filters.DateFilter(field_name='valid_from', lookup_expr='lte')
    valid_till_after = django_filters.DateFilter(field_name='valid_till', lookup_expr='gte')
    valid_till_before = django_filters.DateFilter(field_name='valid_till', lookup_expr='lte')

    # Area range
    area_min = django_filters.NumberFilter(field_name='area_hectares', lookup_expr='gte')
    area_max = django_filters.NumberFilter(field_name='area_hectares', lookup_expr='lte')

    # Royalty due
    has_royalty_due = django_filters.BooleanFilter(method='filter_has_royalty_due')

    def filter_has_royalty_due(self, queryset, name, value):
        if value:
            return queryset.filter(royalty_due__gt=0)
        return queryset.filter(royalty_due=0)

    class Meta:
        model = MiningLease
        fields = [
            'status', 'mineral_type', 'district', 'mandal', 'village',
            'valid_from_after', 'valid_from_before',
            'valid_till_after', 'valid_till_before',
            'area_min', 'area_max', 'has_royalty_due',
        ]
