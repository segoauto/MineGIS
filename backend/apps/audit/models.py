"""
Module 5 & 8 — Immutable Audit Log
Tracks all system actions with cryptographic hash chaining to prevent tampering.
"""
import uuid
import json
import hashlib
from django.db import models
from django.contrib.auth.models import User
from django.core.serializers.json import DjangoJSONEncoder

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('CREATE', 'Created'),
        ('READ', 'Read'),
        ('UPDATE', 'Updated'),
        ('DELETE', 'Deleted'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('EXPORT', 'Exported'),
        ('PRINT', 'Printed'),
        ('APPROVE', 'Approved'),
        ('REJECT', 'Rejected'),
    ]

    STATUS_CHOICES = [
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
        ('BLOCKED', 'Blocked'),
    ]

    log_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    # User Context
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    user_name = models.CharField(max_length=255, blank=True)
    user_role = models.CharField(max_length=50, blank=True)
    user_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    session_id = models.CharField(max_length=255, blank=True)

    # Action Context
    action_type = models.CharField(max_length=20, choices=ACTION_CHOICES, default='READ')
    module = models.CharField(max_length=100, blank=True)
    entity_type = models.CharField(max_length=100, default='System')
    entity_id = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)

    # Payload
    before_value = models.JSONField(default=dict, blank=True, encoder=DjangoJSONEncoder)
    after_value = models.JSONField(default=dict, blank=True, encoder=DjangoJSONEncoder)

    # Outcome
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SUCCESS')
    failure_reason = models.TextField(blank=True)

    # Cryptographic Hash Chaining (Immutable compliance)
    previous_hash = models.CharField(max_length=64, blank=True, editable=False)
    current_hash = models.CharField(max_length=64, blank=True, editable=False)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['action_type', 'timestamp']),
            models.Index(fields=['status']),
        ]
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'

    def __str__(self):
        return f"{self.user_name} — {self.action_type} {self.entity_type} — {self.timestamp}"

    def compute_hash(self):
        """Computes SHA-256 hash of the critical fields + previous hash"""
        data = {
            'log_id': str(self.log_id),
            'user_id': str(self.user_id) if self.user_id else '',
            'action_type': self.action_type,
            'entity_type': self.entity_type,
            'entity_id': str(self.entity_id),
            'before_value': json.dumps(self.before_value, cls=DjangoJSONEncoder, sort_keys=True),
            'after_value': json.dumps(self.after_value, cls=DjangoJSONEncoder, sort_keys=True),
            'status': self.status,
            'previous_hash': self.previous_hash,
        }
        hash_string = json.dumps(data, sort_keys=True).encode('utf-8')
        return hashlib.sha256(hash_string).hexdigest()

    @classmethod
    def verify_chain(cls):
        """
        Traverses the entire audit log to verify the integrity of the cryptographic chain.
        Returns (is_valid, broken_log_id_str, error_message)
        """
        # We process in small chunks or all at once? Since it's for verification, 
        # let's fetch all (usually audits are not millions in dev).
        logs = cls.objects.order_by('timestamp')
        prev_hash = "0" * 64
        
        for i, log in enumerate(logs):
            # 1. Check if previous_hash matches the actual previous current_hash
            if log.previous_hash != prev_hash:
                return False, str(log.log_id), f"Hash chain broken at index {i}. Expected previous hash {prev_hash[:8]}... but found {log.previous_hash[:8]}..."
            
            # 2. Check if current_hash is still valid for the current data
            recomputed = log.compute_hash()
            if log.current_hash != recomputed:
                return False, str(log.log_id), f"Data integrity violation at index {i}. Stored hash does not match computed data hash."
                
            prev_hash = log.current_hash
            
        return True, None, "Audit chain integrity verified successfully."

    def save(self, *args, **kwargs):
        if not self.pk or not self.current_hash:
            # Get the previous record in the chain
            last_log = AuditLog.objects.order_by('-timestamp').first()
            self.previous_hash = last_log.current_hash if last_log else "0" * 64
            
            # Compute new hash
            self.current_hash = self.compute_hash()
            
        # Ensure immutability on update attempts (only initial save allowed)
        if self.pk:
            existing = AuditLog.objects.filter(pk=self.pk).first()
            if existing and existing.current_hash and existing.current_hash != self.current_hash:
                raise ValueError("Immutable Audit Log cannot be modified after creation!")
                
        super().save(*args, **kwargs)
