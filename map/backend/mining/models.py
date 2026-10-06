from django.contrib.gis.db import models


class District(models.Model):
    name = models.CharField(max_length=100)
    area = models.FloatField(null=True, blank=True)
    geom = models.MultiPolygonField(srid=4326, null=True, blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Mandal(models.Model):
    district = models.ForeignKey('District', on_delete=models.CASCADE, related_name='mandals')
    name = models.CharField(max_length=100)
    geom = models.MultiPolygonField(srid=4326, null=True, blank=True)

    class Meta:
        ordering = ['district__name', 'name']
        unique_together = ('district', 'name')

    def __str__(self):
        return f'{self.district.name} - {self.name}'


class Mine(models.Model):
    district = models.ForeignKey('District', on_delete=models.CASCADE, related_name='mines')
    mandal = models.ForeignKey('Mandal', on_delete=models.SET_NULL, null=True, blank=True, related_name='mines')
    mandal_name = models.CharField(max_length=100, null=True, blank=True)
    company = models.CharField(max_length=255, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    mineral = models.CharField(max_length=255, null=True, blank=True)
    mineral_type = models.CharField(max_length=255, null=True, blank=True)
    survey_number = models.CharField(max_length=255, null=True, blank=True)
    land_type = models.CharField(max_length=255, null=True, blank=True)
    production = models.BigIntegerField(null=True, blank=True)
    dispatch = models.BigIntegerField(null=True, blank=True)
    ets = models.BigIntegerField(null=True, blank=True)
    notice = models.BigIntegerField(null=True, blank=True)
    reg_from = models.DateField(null=True, blank=True)
    reg_to = models.DateField(null=True, blank=True)
    geom = models.PolygonField(srid=4326, null=True, blank=True)

    class Meta:
        ordering = ['district__name', 'company']

    def __str__(self):
        return f'{self.company or self.mineral or "Mine"} - {self.district.name}'
