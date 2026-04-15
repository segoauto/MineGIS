"""
Mining Lease models — core domain model for MineGIS-TS
"""
from django.contrib.gis.db import models
from django.contrib.auth.models import User


class MiningLease(models.Model):
    # ─── Identity ─────────────────────────────────────────────
    lease_id = models.CharField(max_length=30, unique=True)  # ML/TS/2019/00234
    mine_name = models.CharField(max_length=200)

    # ─── Classification ───────────────────────────────────────
    MINERAL_CHOICES = [
        ('COAL', 'Coal'),
        ('IRON_ORE', 'Iron Ore'),
        ('GRANITE', 'Granite'),
        ('LIMESTONE', 'Limestone'),
        ('FLUORITE', 'Fluorite'),
        ('DOLOMITE', 'Dolomite'),
        ('SAND', 'Sand'),
        ('OTHER', 'Other'),
    ]
    mineral_type = models.CharField(max_length=20, choices=MINERAL_CHOICES)

    # ─── Leaseholder ──────────────────────────────────────────
    leaseholder_name = models.CharField(max_length=300)
    leaseholder_pan = models.CharField(max_length=10)
    leaseholder_contact = models.CharField(max_length=15)
    leaseholder_email = models.EmailField()

    # ─── Location ─────────────────────────────────────────────
    state = models.CharField(max_length=50, default='Telangana')
    district = models.CharField(max_length=100)
    mandal = models.CharField(max_length=100)
    village = models.CharField(max_length=100)
    survey_number = models.CharField(max_length=50)

    # ─── Spatial (PostGIS) ────────────────────────────────────
    boundary = models.MultiPolygonField(srid=4326, null=True, blank=True)
    area_hectares = models.DecimalField(max_digits=10, decimal_places=4)
    centroid = models.PointField(srid=4326, null=True, blank=True)

    # ─── Dates ────────────────────────────────────────────────
    grant_date = models.DateField()
    commencement_date = models.DateField()
    valid_from = models.DateField()
    valid_till = models.DateField()

    # ─── Status ───────────────────────────────────────────────
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('EXPIRED', 'Expired'),
        ('PENDING', 'Pending'),
        ('SUSPENDED', 'Suspended'),
        ('SURRENDERED', 'Surrendered'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')

    # ─── Financial ────────────────────────────────────────────
    royalty_due = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    last_payment_date = models.DateField(null=True, blank=True)

    # ─── Meta ─────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, related_name='leases_created'
    )

    class Meta:
        indexes = [
            models.Index(fields=['lease_id']),
            models.Index(fields=['district']),
            models.Index(fields=['status']),
            models.Index(fields=['mineral_type']),
            models.Index(fields=['valid_till']),
        ]
        ordering = ['-created_at']
        verbose_name = 'Mining Lease'
        verbose_name_plural = 'Mining Leases'

    def save(self, *args, **kwargs):
        # Auto-calculate centroid from boundary
        if self.boundary:
            self.centroid = self.boundary.centroid
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.lease_id} — {self.mine_name}"

    @property
    def is_expiring_soon(self):
        """Returns True if lease expires within 90 days."""
        from django.utils import timezone
        delta = self.valid_till - timezone.now().date()
        return 0 < delta.days <= 90

    @property
    def days_remaining(self):
        from django.utils import timezone
        delta = self.valid_till - timezone.now().date()
        return delta.days

class RoyaltyRateConfig(models.Model):
    """
    Module 3: Royalty configuration pricing table
    Allows the Department to update Royalty base rates natively.
    """
    mineral_type = models.CharField(max_length=20, choices=MiningLease.MINERAL_CHOICES, unique=True)
    rate_per_mt = models.DecimalField(max_digits=10, decimal_places=2, help_text="Base Royalty INR per Metric Tonne")
    effective_from = models.DateField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Royalty Rate Configuration'
        verbose_name_plural = 'Royalty Rate Configurations'

    def __str__(self):
        return f"{self.get_mineral_type_display()} - {self.rate_per_mt} INR/MT"

class InspectionOrder(models.Model):
    """
    Module 4 & 5: Statutory authorization for vehicle entry into mining leases.
    Used to distinguish between legal transport and unauthorized entry.
    """
    order_id = models.CharField(max_length=50, unique=True)
    lease = models.ForeignKey(
        MiningLease, on_delete=models.CASCADE, related_name='inspection_orders'
    )
    # Using string reference for Vehicle to avoid circular imports if any
    vehicle = models.ForeignKey(
        'vehicle_tracking.Vehicle', on_delete=models.CASCADE, related_name='inspection_orders'
    )
    
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    
    PURPOSE_CHOICES = [
        ('INSPECTION', 'Official Inspection'),
        ('TRANSPORT', 'Mineral Transportation'),
        ('SURVEY', 'DGPS/ETS Survey'),
        ('RECOVERY', 'Disaster Recovery'),
    ]
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES, default='TRANSPORT')
    
    authorized_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='authorized_orders'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['order_id']),
            models.Index(fields=['start_date', 'end_date']),
            models.Index(fields=['is_active']),
        ]
        verbose_name = 'Inspection Order'
        verbose_name_plural = 'Inspection Orders'

    def __str__(self):
        return f"{self.order_id} — {self.vehicle.vehicle_number} -> {self.lease.lease_id}"
