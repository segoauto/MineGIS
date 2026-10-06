from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

from mining.models import District

UserModel = get_user_model()


class UserProfile(models.Model):
    STATE_ADMIN = 'STATE_ADMIN'
    DISTRICT_USER = 'DISTRICT_USER'
    ROLE_CHOICES = [
        (STATE_ADMIN, 'State Admin'),
        (DISTRICT_USER, 'District User'),
    ]

    user = models.OneToOneField(UserModel, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default=DISTRICT_USER)
    district = models.ForeignKey(District, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_users')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['user__username']

    def __str__(self):
        return f'{self.user.username} ({self.role})'


@receiver(post_save, sender=UserModel)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)


@receiver(post_save, sender=UserModel)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()
