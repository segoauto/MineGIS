"""
Authentication app — models
UserProfile extends Django User with role, district, MFA
"""
import pyotp
from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('R01_SUPER_ADMIN', 'Super Admin'),
        ('R02_STATE_EXEC', 'State Executive'),
        ('R03_STATE_MGR', 'State Manager'),
        ('R04_DISTRICT_OFFICER', 'District Officer'),
        ('R05_FIELD_OFFICER', 'Field Officer'),
        ('R06_DATA_ENTRY', 'Data Entry Operator'),
        ('R07_GIS_ANALYST', 'GIS Analyst'),
        ('R08_AUDITOR', 'Auditor'),
        ('R09_LEASEHOLDER', 'Leaseholder'),
        ('R10_HELPDESK', 'Helpdesk'),
        ('R11_REPORT_VIEWER', 'Report Viewer'),
    ]

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='profile'
    )
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='R11_REPORT_VIEWER')
    district = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=15, blank=True)
    designation = models.CharField(max_length=200, blank=True)
    employee_id = models.CharField(max_length=50, blank=True, unique=True, null=True)

    # MFA
    mfa_enabled = models.BooleanField(default=False)
    mfa_secret = models.CharField(max_length=32, blank=True)

    # SSO
    nic_epramaan_id = models.CharField(max_length=100, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.role})"

    def generate_mfa_secret(self):
        self.mfa_secret = pyotp.random_base32()
        return self.mfa_secret

    def get_mfa_totp_uri(self):
        return pyotp.totp.TOTP(self.mfa_secret).provisioning_uri(
            name=self.user.email,
            issuer_name='MineGIS-TS'
        )

    def verify_mfa_token(self, token: str) -> bool:
        if not self.mfa_secret:
            return False
        totp = pyotp.TOTP(self.mfa_secret)
        return totp.verify(token, valid_window=1)

    class Meta:
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'
