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
