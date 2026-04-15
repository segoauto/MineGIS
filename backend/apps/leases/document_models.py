"""
Module 2: Lease Document Management & Production Records
- LeaseDocument: Version-controlled document repository per lease
- ProductionRecord: Monthly/quarterly operational data capture
"""
from django.db import models
from django.contrib.auth.models import User
from .models import MiningLease


class LeaseDocument(models.Model):
    CATEGORY_CHOICES = [
        ('LEASE_DEED',           'Lease Deed'),
        ('MINE_PLAN',            'Mine Plan'),
        ('SURVEY_REPORT',        'Survey Report'),
        ('ENV_CLEARANCE',        'Environmental Clearance'),
        ('COMPLIANCE_CERT',      'Compliance Certificate'),
        ('RENEWAL_ORDER',        'Renewal Order'),
        ('LEGAL_DOCUMENT',       'Legal Document'),
        ('ROYALTY_RECEIPT',      'Royalty Receipt'),
        ('INSPECTION_REPORT',    'Inspection Report'),
        ('OTHER',                'Other'),
    ]

    lease = models.ForeignKey(
        MiningLease, on_delete=models.CASCADE,
        related_name='documents'
    )
    title = models.CharField(max_length=300)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    file_name = models.CharField(max_length=255)
    file_size_bytes = models.PositiveIntegerField(default=0)
    file_mime_type = models.CharField(max_length=100, default='application/pdf')

    # Version control
    version = models.PositiveSmallIntegerField(default=1)
    is_current = models.BooleanField(default=True)
    supersedes = models.ForeignKey(
        'self', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='superseded_by'
    )

    # Metadata
    description = models.TextField(blank=True)
    valid_from = models.DateField(null=True, blank=True)
    valid_till = models.DateField(null=True, blank=True)
    document_date = models.DateField(null=True, blank=True)

    uploaded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, related_name='uploaded_documents'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['lease', 'category']),
            models.Index(fields=['is_current']),
        ]
        verbose_name = 'Lease Document'
        verbose_name_plural = 'Lease Documents'

    def __str__(self):
        return f"{self.lease.lease_id} — {self.title} (v{self.version})"


class ProductionRecord(models.Model):
    """Module 3: Operational Information Capture."""
    PERIOD_CHOICES = [
        ('MONTHLY',    'Monthly'),
        ('QUARTERLY',  'Quarterly'),
        ('ANNUAL',     'Annual'),
    ]
    STATUS_CHOICES = [
        ('DRAFT',     'Draft'),
        ('SUBMITTED', 'Submitted'),
        ('VERIFIED',  'Verified'),
        ('FLAGGED',   'Flagged - Anomaly Detected'),
    ]

    lease = models.ForeignKey(
        MiningLease, on_delete=models.CASCADE,
        related_name='production_records'
    )

    # Period
    period_type = models.CharField(max_length=10, choices=PERIOD_CHOICES, default='MONTHLY')
    period_year = models.PositiveSmallIntegerField()
    period_month = models.PositiveSmallIntegerField(null=True, blank=True)   # 1-12 for monthly
    period_quarter = models.PositiveSmallIntegerField(null=True, blank=True) # 1-4 for quarterly

    # Production quantities (MT = Metric Tonnes)
    quantity_produced_mt = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    quantity_dispatched_mt = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    quantity_stockpile_mt = models.DecimalField(max_digits=12, decimal_places=3, default=0)

    # Operational indicators
    operating_days = models.PositiveSmallIntegerField(default=0)
    machinery_deployed = models.PositiveSmallIntegerField(default=0)
    workforce_strength = models.PositiveSmallIntegerField(default=0)

    # Financial (Statutory Levies)
    royalty_payable = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    royalty_paid = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    nmet_payable = models.DecimalField(max_digits=15, decimal_places=2, default=0, help_text="2% of Royalty")
    dmf_payable = models.DecimalField(max_digits=15, decimal_places=2, default=0, help_text="10% or 30% of Royalty")
    penalty_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    # AI/ML anomaly detection
    anomaly_score = models.FloatField(default=0.0)  # 0.0 (normal) - 1.0 (highly anomalous)
    anomaly_flags = models.JSONField(default=list)  # list of flag strings

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='DRAFT')
    notes = models.TextField(blank=True)

    submitted_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, related_name='submitted_production_records'
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['lease', 'period_type', 'period_year', 'period_month', 'period_quarter']
        ordering = ['-period_year', '-period_month']
        verbose_name = 'Production Record'
        verbose_name_plural = 'Production Records'

    def __str__(self):
        return f"{self.lease.lease_id} — {self.period_type} {self.period_year}/{self.period_month}"

    @property
    def royalty_outstanding(self):
        return float(self.royalty_payable) - float(self.royalty_paid)

    @property
    def dispatch_efficiency(self):
        if self.quantity_produced_mt > 0:
            return round(float(self.quantity_dispatched_mt / self.quantity_produced_mt) * 100, 1)
        return 0.0

    def save(self, *args, **kwargs):
        """
        Calculates Royalty, NMET, and DMF dynamically natively from the Rate Config!
        """
        from apps.leases.models import RoyaltyRateConfig
        from datetime import date
        import decimal

        if self.quantity_dispatched_mt:
            # Retrieve the dynamic rate configuration
            config = RoyaltyRateConfig.objects.filter(mineral_type=self.lease.mineral_type).first()
            if config:
                self.royalty_payable = self.quantity_dispatched_mt * config.rate_per_mt
            
            if self.royalty_payable > 0:
                # NMET is strictly 2% of Royalty nationally
                self.nmet_payable = self.royalty_payable * decimal.Decimal('0.02')

                # DMF dynamically resolves off the Jan 12, 2015 grant threshold
                dmf_threshold_date = date(2015, 1, 12)
                if self.lease.grant_date < dmf_threshold_date:
                    self.dmf_payable = self.royalty_payable * decimal.Decimal('0.30')
                else:
                    self.dmf_payable = self.royalty_payable * decimal.Decimal('0.10')

        super().save(*args, **kwargs)
