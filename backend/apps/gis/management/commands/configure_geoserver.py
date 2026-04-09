"""
Django management command: configure_geoserver
Called by entrypoint.sh on backend startup.
"""
from django.core.management.base import BaseCommand
from apps.gis.geoserver_config import GeoServerConfigurator


class Command(BaseCommand):
    help = 'Configure GeoServer workspace, data store, layers, and SLD styles'

    def handle(self, *args, **options):
        self.stdout.write('Configuring GeoServer...')
        configurator = GeoServerConfigurator()
        configurator.configure_all()
        self.stdout.write(self.style.SUCCESS('GeoServer configuration complete'))
