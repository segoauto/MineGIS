from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    created_at_relative = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'severity', 'severity_display',
            'is_read', 'link', 'module', 'created_at', 'created_at_relative'
        ]
        read_only_fields = ['id', 'created_at']

    def get_created_at_relative(self, obj):
        from django.utils.timesince import timesince
        return timesince(obj.created_at)
