"""
GIS models — Spatial layers and DGPS survey points
"""
from django.contrib.gis.db import models
from apps.leases.models import MiningLease


class SpatialLayer(models.Model):
    LAYER_TYPES = [
        ('FOREST', 'Forest Boundary'),
        ('WATER', 'Water Body'),
        ('ECO', 'Eco-Sensitive Zone'),
        ('ADMIN', 'Administrative Boundary'),
        ('TRANSPORT', 'Transportation Network'),
    ]
    layer_type = models.CharField(max_length=20, choices=LAYER_TYPES)
    name = models.CharField(max_length=200)
    geometry = models.GeometryField(srid=4326)
    properties = models.JSONField(default=dict)
    source = models.CharField(max_length=200)
    last_updated = models.DateField()

    class Meta:
        indexes = [
            models.Index(fields=['layer_type']),
        ]
        verbose_name = 'Spatial Layer'
        verbose_name_plural = 'Spatial Layers'

    def __str__(self):
        return f"{self.get_layer_type_display()} — {self.name}"


class DGPSSurveyPoint(models.Model):
    survey_id = models.CharField(max_length=50, unique=True)
    lease = models.ForeignKey(
        MiningLease, on_delete=models.CASCADE,
        related_name='dgps_points'
    )
    location = models.PointField(srid=4326)
    accuracy_meters = models.FloatField()
    survey_date = models.DateField()
    surveyor_name = models.CharField(max_length=200)
    elevation = models.FloatField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = 'DGPS Survey Point'
        verbose_name_plural = 'DGPS Survey Points'
        ordering = ['-survey_date']

    def __str__(self):
        return f"{self.survey_id} — {self.lease.lease_id}"


class ETSSurveyPoint(models.Model):
    survey_id = models.CharField(max_length=50, unique=True)
    lease = models.ForeignKey(
        MiningLease, on_delete=models.CASCADE,
        related_name='ets_points'
    )
    location = models.PointField(srid=4326)
    accuracy_meters = models.FloatField()
    survey_date = models.DateField()
    surveyor_name = models.CharField(max_length=200)
    elevation = models.FloatField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = 'ETS Survey Point'
        verbose_name_plural = 'ETS Survey Points'
        ordering = ['-survey_date']

    def __str__(self):
        return f"{self.survey_id} — {self.lease.lease_id}"


class ApprovedMinePlan(models.Model):
    plan_id = models.CharField(max_length=50, unique=True)
    lease = models.OneToOneField(
        MiningLease, on_delete=models.CASCADE,
        related_name='approved_plan'
    )
    boundary = models.MultiPolygonField(srid=4326)
    approval_date = models.DateField()
    valid_till = models.DateField()
    approved_by = models.CharField(max_length=200)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Approved Mine Plan'
        verbose_name_plural = 'Approved Mine Plans'
        ordering = ['-approval_date']

    def __str__(self):
        return f"{self.plan_id} — {self.lease.lease_id}"
