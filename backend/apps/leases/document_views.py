"""
Module 3: Operational & Financial Information Management views
Module 2: Document Management views
"""
import logging
from django.utils import timezone
from rest_framework import status, serializers as drf_serializers
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from apps.authentication.permissions import RoleBasedPermission
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import viewsets

from .models import MiningLease
from .document_models import LeaseDocument, ProductionRecord

logger = logging.getLogger(__name__)


# ─── Serializers ──────────────────────────────────────────────────────────────

class LeaseDocumentSerializer(drf_serializers.ModelSerializer):
    uploaded_by_name = drf_serializers.SerializerMethodField()
    category_display = drf_serializers.SerializerMethodField()

    class Meta:
        model = LeaseDocument
        fields = [
            'id', 'lease', 'title', 'category', 'category_display',
            'file_name', 'file_size_bytes', 'file_mime_type',
            'version', 'is_current', 'description',
            'valid_from', 'valid_till', 'document_date',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at',
        ]
        read_only_fields = ['uploaded_by', 'uploaded_at', 'version']

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.username
        return None

    def get_category_display(self, obj):
        return obj.get_category_display()


class ProductionRecordSerializer(drf_serializers.ModelSerializer):
    royalty_outstanding = drf_serializers.FloatField(read_only=True)
    dispatch_efficiency = drf_serializers.FloatField(read_only=True)
    lease_name = drf_serializers.SerializerMethodField()

    class Meta:
        model = ProductionRecord
        fields = [
            'id', 'lease', 'lease_name',
            'period_type', 'period_year', 'period_month', 'period_quarter',
            'quantity_produced_mt', 'quantity_dispatched_mt', 'quantity_stockpile_mt',
            'operating_days', 'machinery_deployed', 'workforce_strength',
            'royalty_payable', 'royalty_paid', 'penalty_amount',
            'royalty_outstanding', 'dispatch_efficiency',
            'anomaly_score', 'anomaly_flags',
            'status', 'notes', 'submitted_by', 'submitted_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['anomaly_score', 'anomaly_flags', 'submitted_by', 'submitted_at', 'created_at', 'updated_at']

    def get_lease_name(self, obj):
        return obj.lease.mine_name if obj.lease else None


# ─── Document Views ────────────────────────────────────────────────────────────

class LeaseDocumentViewSet(viewsets.ModelViewSet):
    """
    GET    /api/leases/documents/
    POST   /api/leases/documents/
    GET    /api/leases/documents/{id}/
    PATCH  /api/leases/documents/{id}/
    DELETE /api/leases/documents/{id}/
    """
    permission_classes = [IsAuthenticated]
    serializer_class = LeaseDocumentSerializer

    def get_queryset(self):
        qs = LeaseDocument.objects.select_related('lease', 'uploaded_by')
        lease_id = self.request.query_params.get('lease_id')
        category = self.request.query_params.get('category')
        current_only = self.request.query_params.get('current_only', 'true')

        if lease_id:
            qs = qs.filter(lease__lease_id=lease_id)
        if category:
            qs = qs.filter(category=category)
        if current_only.lower() == 'true':
            qs = qs.filter(is_current=True)

        return qs

    def perform_create(self, serializer):
        # Auto-increment version if a previous document exists for the same lease+category
        lease = serializer.validated_data.get('lease')
        category = serializer.validated_data.get('category')

        existing = LeaseDocument.objects.filter(
            lease=lease, category=category, is_current=True
        ).first()

        version = 1
        supersedes = None
        if existing:
            version = existing.version + 1
            supersedes = existing
            existing.is_current = False
            existing.save(update_fields=['is_current'])

        serializer.save(
            uploaded_by=self.request.user,
            version=version,
            supersedes=supersedes,
            is_current=True,
        )

    @action(detail=False, methods=['get'], url_path='categories')
    def categories(self, request):
        """GET /api/leases/documents/categories/ — return all category choices."""
        return Response([
            {'value': c[0], 'label': c[1]}
            for c in LeaseDocument.CATEGORY_CHOICES
        ])


# ─── Production Record Views ───────────────────────────────────────────────────

class ProductionRecordViewSet(viewsets.ModelViewSet):
    """
    Module 3: Operational & Financial Information Management
    GET    /api/leases/production/
    POST   /api/leases/production/
    GET    /api/leases/production/{id}/
    PATCH  /api/leases/production/{id}/
    """
    permission_classes = [IsAuthenticated, RoleBasedPermission]
    serializer_class = ProductionRecordSerializer

    def get_queryset(self):
        qs = ProductionRecord.objects.select_related('lease', 'submitted_by')
        lease_id = self.request.query_params.get('lease_id')
        period_year = self.request.query_params.get('year')
        status_filter = self.request.query_params.get('status')
        flagged_only = self.request.query_params.get('flagged_only')

        if lease_id:
            qs = qs.filter(lease__lease_id=lease_id)
        if period_year:
            qs = qs.filter(period_year=period_year)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if flagged_only and flagged_only.lower() == 'true':
            qs = qs.filter(anomaly_score__gte=0.6)

        return qs

    def perform_create(self, serializer):
        record = serializer.save(submitted_by=self.request.user)
        self._run_anomaly_detection(record)

    def perform_update(self, serializer):
        record = serializer.save()
        self._run_anomaly_detection(record)

    def _run_anomaly_detection(self, record: ProductionRecord):
        """
        Module 3: True AI/ML-Based Anomaly Detection.
        Passes current record vector into the Scikit-Learn IsolationForest Pipeline.
        """
        from .ml_service import anomaly_engine
        
        score, flags = anomaly_engine.evaluate_record(record)

        if flags:
            new_status = 'FLAGGED'
        else:
            new_status = record.status if record.status != 'FLAGGED' else 'SUBMITTED'

        ProductionRecord.objects.filter(pk=record.pk).update(
            anomaly_score=score,
            anomaly_flags=flags,
            status=new_status if flags else record.status,
        )

    @action(detail=False, methods=['get'], url_path='financial-summary')
    def financial_summary(self, request: Request) -> Response:
        """
        GET /api/leases/production/financial-summary/?year=2024
        Returns revenue collection summary for Module 3 financial tracking.
        """
        from django.db.models import Sum, Avg, Count
        year = request.query_params.get('year', timezone.now().year)

        qs = ProductionRecord.objects.filter(period_year=year, period_type='MONTHLY')
        summary = qs.aggregate(
            total_payable=Sum('royalty_payable'),
            total_collected=Sum('royalty_paid'),
            total_penalties=Sum('penalty_amount'),
            total_production_mt=Sum('quantity_produced_mt'),
            total_dispatched_mt=Sum('quantity_dispatched_mt'),
            record_count=Count('id'),
            flagged_count=Count('id', filter=drf_serializers.BooleanField().to_internal_value(True))
        )

        payable = float(summary['total_payable'] or 0)
        collected = float(summary['total_collected'] or 0)

        return Response({
            'year': year,
            'total_royalty_payable': payable,
            'total_royalty_collected': collected,
            'total_royalty_outstanding': payable - collected,
            'collection_efficiency_pct': round((collected / payable * 100) if payable > 0 else 0, 1),
            'total_penalty_amount': float(summary['total_penalties'] or 0),
            'total_production_mt': float(summary['total_production_mt'] or 0),
            'total_dispatched_mt': float(summary['total_dispatched_mt'] or 0),
            'record_count': summary['record_count'],
        })

    @action(detail=False, methods=['get'], url_path='anomaly-alerts')
    def anomaly_alerts(self, request: Request) -> Response:
        """
        GET /api/leases/production/anomaly-alerts/
        Returns all flagged production records requiring investigation.
        """
        flagged = ProductionRecord.objects.select_related('lease').filter(
            anomaly_score__gte=0.5
        ).order_by('-anomaly_score')[:50]

        data = []
        for rec in flagged:
            data.append({
                'id': rec.id,
                'lease_id': rec.lease.lease_id,
                'mine_name': rec.lease.mine_name,
                'district': rec.lease.district,
                'period': f"{rec.period_year}-{rec.period_month or 'Q' + str(rec.period_quarter or '')}",
                'anomaly_score': round(rec.anomaly_score, 2),
                'anomaly_flags': rec.anomaly_flags,
                'quantity_produced_mt': float(rec.quantity_produced_mt),
            })


        return Response({'anomaly_alerts': data, 'count': len(data)})

    @action(detail=True, methods=['post'], url_path='resolve-anomaly')
    def resolve_anomaly(self, request: Request, pk=None) -> Response:
        """
        POST /api/leases/production/{id}/resolve-anomaly/
        Allows officers to update status and add notes to flagged records.
        """
        record = self.get_object()
        new_status = request.data.get('new_status')
        new_notes = request.data.get('notes')

        if new_status not in dict(ProductionRecord.STATUS_CHOICES):
            return Response({'detail': f'Invalid status. Choices: {list(dict(ProductionRecord.STATUS_CHOICES).keys())}'}, status=400)

        record.status = new_status
        if new_notes:
            record.notes = f"{record.notes}\n\n[Resolution by {request.user.get_full_name() or request.user.username} at {timezone.now().strftime('%Y-%m-%d %H:%M')}]:\n{new_notes}"
        
        record.save()
        
        # Audit log entry for governance
        from apps.audit.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action_type='APPROVE' if new_status == 'VERIFIED' else 'REJECT',
            entity_type='ProductionRecord',
            entity_id=str(record.id),
            description=f"Anomaly resolution: Record set to {new_status}. Notes: {new_notes[:50]}..."
        )

        return Response(self.get_serializer(record).data)
