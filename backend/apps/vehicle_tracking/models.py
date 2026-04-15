"""
Vehicle tracking models — Vehicle, VehicleLocationHistory, VehicleAlert
Netradyne integration data models.
"""
from django.contrib.gis.db import models
from django.contrib.auth.models import User
from apps.leases.models import MiningLease


class Vehicle(models.Model):
    # ─── Netradyne device info ────────────────────────────────
    netradyne_device_id = models.CharField(max_length=100, unique=True)
    vehicle_number = models.CharField(max_length=20, unique=True)  # TS 09 EA 1234

    VEHICLE_TYPES = [
        ('INSPECTION', 'Inspection Vehicle'),
        ('ENFORCEMENT', 'Enforcement Vehicle'),
        ('SURVEY', 'Survey Vehicle'),
        ('TRANSPORT', 'Transport/Haul Truck'),
        ('OFFICIAL', 'Official Vehicle'),
    ]
    vehicle_type = models.CharField(max_length=20, choices=VEHICLE_TYPES)

    # ─── Driver info ──────────────────────────────────────────
    driver_name = models.CharField(max_length=200)
    driver_license = models.CharField(max_length=50)
    assigned_district = models.CharField(max_length=100)
    assigned_officer = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='assigned_vehicles'
    )

    # ─── Current state (updated via Netradyne) ────────────────
    last_location = models.PointField(srid=4326, null=True, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    current_speed_kmh = models.FloatField(default=0)
    current_heading = models.FloatField(default=0)
    is_online = models.BooleanField(default=False)
    engine_on = models.BooleanField(default=False)

    # ─── Assignment ───────────────────────────────────────────
    current_lease = models.ForeignKey(
        MiningLease, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='assigned_vehicles'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['netradyne_device_id']),
            models.Index(fields=['assigned_district']),
            models.Index(fields=['is_online']),
        ]
        verbose_name = 'Vehicle'
        verbose_name_plural = 'Vehicles'

    def __str__(self):
        return f"{self.vehicle_number} ({self.driver_name})"


class VehicleLocationHistory(models.Model):
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.CASCADE,
        related_name='location_history'
    )
    location = models.PointField(srid=4326)
    timestamp = models.DateTimeField(db_index=True)
    speed_kmh = models.FloatField()
    heading = models.FloatField()   # degrees 0-360
    altitude = models.FloatField(null=True, blank=True)
    accuracy = models.FloatField(default=5.0)

    # ─── Netradyne enriched data ──────────────────────────────
    engine_on = models.BooleanField(default=True)
    harsh_braking = models.BooleanField(default=False)
    harsh_acceleration = models.BooleanField(default=False)
    overspeeding = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=['vehicle', 'timestamp']),
        ]
        ordering = ['-timestamp']
        verbose_name = 'Vehicle Location History'
        verbose_name_plural = 'Vehicle Location History'


class VehicleAlert(models.Model):
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.CASCADE,
        related_name='alerts'
    )

    ALERT_TYPES = [
        ('VA01', 'Unauthorized Mine Entry'),
        ('VA02', 'Geofence Entry (authorized)'),
        ('VA03', 'Geofence Exit'),
        ('VA04', 'Overspeeding'),
        ('VA05', 'Harsh Braking'),
        ('VA06', 'Harsh Acceleration'),
        ('VA07', 'Driver Distraction'),
        ('VA08', 'Driver Drowsiness'),
        ('VA09', 'Seatbelt Violation'),
        ('VA10', 'Engine Idle > 30 min'),
        ('VA11', 'Route Deviation'),
        ('VA12', 'Vehicle Offline > 2 hours'),
        ('VA13', 'Vehicle in eco-sensitive zone'),
        ('VA14', 'Speed in forest area'),
    ]
    alert_type = models.CharField(max_length=30, choices=ALERT_TYPES)

    SEVERITY = [
        ('HIGH', 'High'),
        ('MEDIUM', 'Medium'),
        ('LOW', 'Low'),
    ]
    severity = models.CharField(max_length=10, choices=SEVERITY)

    location = models.PointField(srid=4326, null=True, blank=True)
    lease = models.ForeignKey(
        MiningLease, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='vehicle_alerts'
    )
    timestamp = models.DateTimeField()
    description = models.TextField()
    is_resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='resolved_alerts'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    raw_netradyne_payload = models.JSONField(default=dict)

    class Meta:
        indexes = [
            models.Index(fields=['vehicle', 'timestamp']),
            models.Index(fields=['severity', 'is_resolved']),
            models.Index(fields=['alert_type']),
        ]
        ordering = ['-timestamp']
        verbose_name = 'Vehicle Alert'
        verbose_name_plural = 'Vehicle Alerts'

    def __str__(self):
        return f"{self.vehicle.vehicle_number} — {self.get_alert_type_display()} ({self.severity})"
