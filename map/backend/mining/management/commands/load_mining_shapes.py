import json
from pathlib import Path

from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from django.core.management.base import BaseCommand
from shapefile import Reader

from mining.models import District, Mandal, Mine


class Command(BaseCommand):
    help = 'Load the existing district, mandal, and mine shapefiles into the PostGIS database.'

    def handle(self, *args, **options):
        candidate_dirs = [
            Path('/data/shapefiles'),
            Path(__file__).resolve().parents[4] / 'data' / 'shapefiles',
            Path(__file__).resolve().parents[3] / 'data' / 'shapefiles',
        ]
        base_dir = next((p for p in candidate_dirs if p.exists()), candidate_dirs[0])

        self.stdout.write(f'Using shapefile directory: {base_dir}')

        self.stdout.write('Loading Districts...')
        district_path = base_dir / 'Districts.shp'
        reader = Reader(str(district_path))
        try:
            fields = [f[0] for f in reader.fields[1:]]
            for rec, shape in zip(reader.records(), reader.shapes()):
                data = dict(zip(fields, rec))
                district_name = str(data.get('District') or data.get('DISTRICT') or '').strip()
                if not district_name:
                    continue
                geom = GEOSGeometry(json.dumps(shape.__geo_interface__), srid=4326)
                if geom.geom_type == 'Polygon':
                    geom = MultiPolygon(geom)
                District.objects.update_or_create(
                    name=district_name,
                    defaults={'area': data.get('AREA'), 'geom': geom}
                )
        finally:
            reader.close()

        self.stdout.write('Loading Mandals...')
        mandal_path = base_dir / 'Mandals.shp'
        reader = Reader(str(mandal_path))
        try:
            fields = [f[0] for f in reader.fields[1:]]
            for rec, shape in zip(reader.records(), reader.shapes()):
                data = dict(zip(fields, rec))
                district_name = str(data.get('District') or data.get('DISTRICT') or '').strip()
                mandal_name = str(data.get('Mandal') or data.get('MANDAL') or '').strip()
                if not district_name or not mandal_name:
                    continue
                district, _ = District.objects.get_or_create(name=district_name)
                geom = GEOSGeometry(json.dumps(shape.__geo_interface__), srid=4326)
                if geom.geom_type == 'Polygon':
                    geom = MultiPolygon(geom)
                Mandal.objects.update_or_create(
                    district=district,
                    name=mandal_name,
                    defaults={'geom': geom}
                )
        finally:
            reader.close()

        self.stdout.write('Loading Mines...')
        mine_path = base_dir / 'Mines.shp'
        reader = Reader(str(mine_path))
        try:
            fields = [f[0] for f in reader.fields[1:]]
            for rec, shape in zip(reader.records(), reader.shapes()):
                data = dict(zip(fields, rec))
                district_name = str(data.get('District') or data.get('DISTRICT') or '').strip()
                mandal_name = str(data.get('Mandal') or data.get('MANDAL') or '').strip()
                if not district_name:
                    continue
                district, _ = District.objects.get_or_create(name=district_name)
                mandal = None
                if mandal_name:
                    mandal = Mandal.objects.filter(district=district, name__iexact=mandal_name).first()
                geom = GEOSGeometry(json.dumps(shape.__geo_interface__), srid=4326)
                Mine.objects.update_or_create(
                    district=district,
                    company=data.get('Company') or '',
                    defaults={
                        'mandal': mandal,
                        'mandal_name': mandal_name,
                        'address': data.get('Address'),
                        'mineral': data.get('Mineral'),
                        'mineral_type': data.get('MineralTyp'),
                        'survey_number': data.get('SurveyNumb'),
                        'land_type': data.get('LandType'),
                        'production': data.get('Production'),
                        'dispatch': data.get('Dispatch'),
                        'ets': data.get('ETS'),
                        'notice': data.get('Notice'),
                        'reg_from': data.get('Reg_From'),
                        'reg_to': data.get('Reg_To'),
                        'geom': geom,
                    }
                )
        finally:
            reader.close()

        self.stdout.write(self.style.SUCCESS('Mining GIS shapefiles loaded successfully.'))
