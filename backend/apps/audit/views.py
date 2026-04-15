"""
Module 5: Platform Governance — Audit Log API
Provides tamper-proof read-only audit trail for regulatory compliance.
"""
from rest_framework import serializers, viewsets, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.pagination import PageNumberPagination
from apps.authentication.permissions import RoleBasedPermission
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth.models import User

from .models import AuditLog


# ─── Pagination ────────────────────────────────────────────────────────────────

class AuditLogPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


# ─── Serializers ───────────────────────────────────────────────────────────────

class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    action_display = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'log_id', 'user', 'username', 'full_name', 'action_type', 'action_display',
            'entity_type', 'entity_id', 'description', 'before_value', 'after_value', 'status',
            'user_ip', 'user_agent', 'timestamp', 'previous_hash', 'current_hash'
        ]

    def get_username(self, obj):
        return obj.user_name or (obj.user.username if obj.user else 'system')

    def get_full_name(self, obj):
        return obj.user.get_full_name() if obj.user else 'System'

    def get_action_display(self, obj):
        return obj.get_action_type_display()


# ─── ViewSet ───────────────────────────────────────────────────────────────────

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Module 5: Immutable audit trail.
    GET /api/audit/logs/          — list (paginated, filtered)
    GET /api/audit/logs/{id}/     — detail
    GET /api/audit/logs/summary/  — aggregate overview
    """
    serializer_class = AuditLogSerializer
    pagination_class = AuditLogPagination
    permission_classes = [IsAuthenticated, RoleBasedPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action_type', 'entity_type', 'user']
    search_fields = ['description', 'entity_id', 'user_ip']
    ordering_fields = ['timestamp', 'action_type', 'entity_type']
    ordering = ['-timestamp']

    def get_queryset(self):
        qs = AuditLog.objects.select_related('user').all()

        # Non-admins can only see their own audit logs
        if not self.request.user.is_staff:
            qs = qs.filter(user=self.request.user)

        # Date range filter
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(timestamp__date__gte=date_from)
        if date_to:
            qs = qs.filter(timestamp__date__lte=date_to)

        return qs

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request: Request) -> Response:
        """
        GET /api/audit/logs/summary/
        Returns aggregated audit statistics for Module 5 dashboard widget.
        """
        from django.db.models import Count
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        last_7_days = now - timedelta(days=7)
        last_30_days = now - timedelta(days=30)

        base_qs = AuditLog.objects.all() if request.user.is_staff else AuditLog.objects.filter(user=request.user)

        total_actions = base_qs.count()
        this_week = base_qs.filter(timestamp__gte=last_7_days).count()
        this_month = base_qs.filter(timestamp__gte=last_30_days).count()

        by_action = list(
            base_qs.values('action_type').annotate(count=Count('log_id')).order_by('-count')
        )
        by_model = list(
            base_qs.values('entity_type').annotate(count=Count('log_id')).order_by('-count')[:10]
        )
        recent_logins = list(
            base_qs.filter(action_type='LOGIN').values(
                'user_name', 'user_ip', 'timestamp'
            ).order_by('-timestamp')[:10]
        )

        return Response({
            'total_actions': total_actions,
            'actions_this_week': this_week,
            'actions_this_month': this_month,
            'by_action': [
                {'action': a['action_type'], 'count': a['count']} 
                for a in by_action
            ],
            'by_model': by_model,
            'recent_logins': [
                {
                    'username': r['user_name'],
                    'ip_address': r['user_ip'],
                    'timestamp': r['timestamp'],
                }
                for r in recent_logins
            ],
        })

    @action(detail=False, methods=['get'], url_path='verify-chain')
    def verify_chain(self, request: Request) -> Response:
        """
        GET /api/audit/logs/verify-chain/
        Executes the cryptographic integrity check across all audit records.
        """
        from django.utils import timezone
        is_valid, broken_id, message = AuditLog.verify_chain()
        
        return Response({
            'is_valid': is_valid,
            'broken_log_id': broken_id,
            'message': message,
            'verification_timestamp': timezone.now()
        })
