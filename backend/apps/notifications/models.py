from django.db import models
from django.utils import timezone
import uuid

class NotificationLog(models.Model):
    class NotificationType(models.TextChoices):
        SMS = 'SMS', 'SMS'
        EMAIL = 'EMAIL', 'Email'

    class NotificationStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        SENT = 'SENT', 'Sent'
        FAILED = 'FAILED', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notification_type = models.CharField(max_length=10, choices=NotificationType.choices)
    recipient = models.CharField(max_length=255, help_text="Email address or Phone number")
    subject = models.CharField(max_length=255, null=True, blank=True)
    message_body = models.TextField()
    
    status = models.CharField(max_length=10, choices=NotificationStatus.choices, default=NotificationStatus.PENDING)
    error_message = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'minegis_notification_log'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.notification_type} to {self.recipient} [{self.status}]"


class Notification(models.Model):
    class Severity(models.TextChoices):
        INFO = 'INFO', 'Info'
        WARNING = 'WARNING', 'Warning'
        CRITICAL = 'CRITICAL', 'Critical'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.INFO)
    is_read = models.BooleanField(default=False)
    
    # Metadata for deep linking
    link = models.CharField(max_length=255, null=True, blank=True)
    module = models.CharField(max_length=50, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'minegis_notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username}: {self.title}"
