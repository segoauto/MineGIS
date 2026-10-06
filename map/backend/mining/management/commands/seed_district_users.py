from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from mining.models import District
from users.models import UserProfile

User = get_user_model()


class Command(BaseCommand):
    help = 'Create the initial district user accounts required for the Telangana Mining system.'

    def normalize_username(self, name):
        return ''.join(ch for ch in name.strip().lower().replace(' ', '') if ch.isalnum())

    def handle(self, *args, **options):
        for district in District.objects.order_by('name'):
            username = self.normalize_username(district.name)
            if not username:
                continue
            if username[0].isdigit():
                username = f'd{username}'
            user, created = User.objects.get_or_create(username=username)
            user.set_password(f'{district.name}123')
            user.save()
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.role = UserProfile.DISTRICT_USER
            profile.district = district
            profile.is_active = True
            profile.save()
            self.stdout.write(f'Created district user: {username} for {district.name}')

        state_admin, created = User.objects.get_or_create(username='stateadmin')
        state_admin.set_password('StateAdmin123')
        state_admin.save()
        profile, _ = UserProfile.objects.get_or_create(user=state_admin)
        profile.role = UserProfile.STATE_ADMIN
        profile.district = None
        profile.is_active = True
        profile.save()
        self.stdout.write('Created state admin: stateadmin')
