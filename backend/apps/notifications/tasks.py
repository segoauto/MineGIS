from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from .models import NotificationLog
import logging

logger = logging.getLogger(__name__)

def _get_twilio_client():
    from twilio.rest import Client
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        return None
    return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

@shared_task(queue='notifications')
def send_sms_alert(log_id: str):
    """
    Async task to dispatch SMS using Twilio.
    Falls back to console mock if keys are absent.
    """
    try:
        log = NotificationLog.objects.get(id=log_id, notification_type=NotificationLog.NotificationType.SMS)
    except NotificationLog.DoesNotExist:
        return 'Log missing'

    client = _get_twilio_client()

    if not client:
        # Development / Offline mode: Mock the SMS terminal trace
        logger.warning(f"[MOCK SMS] To: {log.recipient} | Body: {log.message_body}")
        log.status = NotificationLog.NotificationStatus.SENT
        log.sent_at = timezone.now()
        log.save(update_fields=['status', 'sent_at'])
        return 'Mocked SMS sent'

    try:
        message = client.messages.create(
            body=log.message_body,
            from_=settings.TWILIO_FROM_NUMBER,
            to=log.recipient
        )
        log.status = NotificationLog.NotificationStatus.SENT
        log.sent_at = timezone.now()
        log.save(update_fields=['status', 'sent_at'])
        return message.sid
    except Exception as e:
        log.status = NotificationLog.NotificationStatus.FAILED
        log.error_message = str(e)
        log.save(update_fields=['status', 'error_message'])
        logger.error(f"Twilio SMS Failure: {e}")
        raise e

@shared_task(queue='notifications')
def send_email_alert(log_id: str):
    """
    Async task to dispatch Email via SMTP.
    """
    try:
        log = NotificationLog.objects.get(id=log_id, notification_type=NotificationLog.NotificationType.EMAIL)
    except NotificationLog.DoesNotExist:
        return 'Log missing'

    try:
        if not settings.EMAIL_HOST_USER:
            # Mock mode
            logger.warning(f"[MOCK EMAIL] To: {log.recipient} | Subject: {log.subject} | Body: {log.message_body}")
            log.status = NotificationLog.NotificationStatus.SENT
            log.sent_at = timezone.now()
            log.save(update_fields=['status', 'sent_at'])
            return 'Mocked Email sent'

        send_mail(
            subject=log.subject or 'MineGIS Notice',
            message=log.message_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[log.recipient],
            fail_silently=False,
        )
        log.status = NotificationLog.NotificationStatus.SENT
        log.sent_at = timezone.now()
        log.save(update_fields=['status', 'sent_at'])
        return 'Email sent'
    except Exception as e:
        log.status = NotificationLog.NotificationStatus.FAILED
        log.error_message = str(e)
        log.save(update_fields=['status', 'error_message'])
        logger.error(f"Django SMTP Failure: {e}")
        raise e
