"""
Django management command: setup_periodic_tasks
Registers Celery Beat periodic tasks in the database.
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Set up Celery Beat periodic tasks for vehicle tracking'

    def handle(self, *args, **options):
        from django_celery_beat.models import PeriodicTask, IntervalSchedule
        from django.conf import settings
        import json

        interval_seconds = settings.VEHICLE_SYNC_INTERVAL_SECONDS

        schedule, created = IntervalSchedule.objects.get_or_create(
            every=interval_seconds,
            period=IntervalSchedule.SECONDS,
        )

        task, created = PeriodicTask.objects.update_or_create(
            name='Sync Vehicle Locations from Netradyne',
            defaults={
                'task': 'apps.vehicle_tracking.tasks.sync_vehicle_locations',
                'interval': schedule,
                'args': json.dumps([]),
                'kwargs': json.dumps({}),
                'enabled': True,
                'queue': 'vehicle_tracking',
            }
        )

        action = 'Created' if created else 'Updated'
        self.stdout.write(
            self.style.SUCCESS(
                f'{action} periodic task: sync every {interval_seconds}s'
            )
        )
