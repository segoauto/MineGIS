"""
Automated backend tasks for Lease Management.
Includes daily penalty calculations and operational anomaly triggers.
"""
import decimal
from celery import shared_task
from django.utils import timezone
from .models import ProductionRecord
from apps.notifications.models import NotificationLog
from apps.notifications.tasks import send_sms_alert

@shared_task
def calculate_overdue_penalties():
    """
    Runs daily via Celery Beat.
    Identifies submitted/verified production records with outstanding royalty
    that is past 30 days due, and applies a 24% per annum penalty calculation.
    """
    records = ProductionRecord.objects.filter(status__in=['SUBMITTED', 'VERIFIED'])
    updated_count = 0

    for record in records:
        outstanding = record.royalty_outstanding
        if outstanding > 0 and record.period_month and record.period_year:
            # Assuming royalty is due 30 days after the month ends
            due_date = timezone.datetime(record.period_year, record.period_month, 1) + timezone.timedelta(days=60)
            now = timezone.now().replace(tzinfo=None) # naive comparison
            days_overdue = (now - due_date).days

            if days_overdue > 0:
                # 24% per annum = 2% per month or (~0.06575% per day)
                daily_penalty_rate = decimal.Decimal('0.24') / decimal.Decimal('365')
                calculated_penalty = decimal.Decimal(str(outstanding)) * daily_penalty_rate * decimal.Decimal(str(days_overdue))
                
                # Check if penalty increased
                if calculated_penalty > record.penalty_amount:
                    record.penalty_amount = calculated_penalty
                    record.save(update_fields=['penalty_amount'])
                    updated_count += 1
                    
                    # Dispatch SMS
                    leaseholder_phone = getattr(record.lease, 'contact_phone', '+919999999999')
                    log = NotificationLog.objects.create(
                        notification_type=NotificationLog.NotificationType.SMS,
                        recipient=leaseholder_phone,
                        subject="Penalty Alert",
                        message_body=f"URGENT: A penalty of {calculated_penalty:^.2f} INR has been levied on {record.lease.lease_id} for overdue royalty."
                    )
                    send_sms_alert.delay(str(log.id))

    return f"Updated penalties for {updated_count} overdue production records."
