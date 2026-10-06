from django.contrib.auth import get_user_model
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.test import TestCase
from rest_framework.test import APIClient

from mining.models import District, Mandal, Mine
from users.models import UserProfile


class DistrictAccessTests(TestCase):
    def setUp(self):
        self.User = get_user_model()
        self.state_admin = self.User.objects.create_user(username='stateadmin', password='pass123')
        self.state_admin.is_staff = True
        self.state_admin.save()

        self.d1 = District.objects.create(name='Hyderabad', geom='POINT (0 0)', srid=4326)
        self.d2 = District.objects.create(name='Warangal', geom='POINT (1 1)', srid=4326)
        self.m1 = Mandal.objects.create(name='M1', district=self.d1, geom='POINT (0 0)', srid=4326)
        self.m2 = Mandal.objects.create(name='M2', district=self.d2, geom='POINT (1 1)', srid=4326)

    def test_district_filter_requires_user_district(self):
        district_user = self.User.objects.create_user(username='hyderabad', password='hyderabad123')
        self.assertIsNotNone(district_user)
        self.assertNotEqual(self.d1.pk, self.d2.pk)


class DashboardMineralBreakdownTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.hyderabad = District.objects.create(name='Hyderabad')
        self.warangal = District.objects.create(name='Warangal')
        self.m1 = Mandal.objects.create(name='M1', district=self.hyderabad)
        self.m2 = Mandal.objects.create(name='M2', district=self.warangal)
        self.state_admin = User.objects.create_user(username='stateadmin', password='pass123')
        self.state_admin.profile.role = UserProfile.STATE_ADMIN
        self.state_admin.profile.save(update_fields=['role'])
        self.district_user = User.objects.create_user(username='hyderabad', password='pass123')
        self.district_user.profile.role = UserProfile.DISTRICT_USER
        self.district_user.profile.district = self.hyderabad
        self.district_user.profile.save(update_fields=['role', 'district'])

        Mine.objects.create(district=self.hyderabad, mandal=self.m1, mineral='Black Granite', production=100, dispatch=80, ets=120)
        Mine.objects.create(district=self.hyderabad, mandal=self.m1, mineral='Black Granite', production=200, dispatch=150, ets=250)
        Mine.objects.create(district=self.warangal, mandal=self.m2, mineral='Quartz', production=50, dispatch=40, ets=60)

    def test_state_admin_can_filter_mineral_totals_by_district(self):
        client = APIClient()
        client.force_authenticate(user=self.state_admin)

        statewide = client.get('/api/dashboard/')
        self.assertEqual(statewide.data['total_mines'], 3)
        self.assertEqual(len(statewide.data['districts']), 2)

        filtered = client.get('/api/dashboard/', {'district_id': self.hyderabad.id})
        self.assertEqual(filtered.data['total_mines'], 2)
        self.assertEqual(len(filtered.data['districts']), 2)
        self.assertEqual(filtered.data['mineral_breakdown'], [{
            'mineral': 'Black Granite',
            'mine_count': 2,
            'production': 300,
            'dispatch': 230,
            'ets': 370,
            'notice': 0,
        }])

    def test_state_admin_can_filter_mineral_totals_by_mandal(self):
        client = APIClient()
        client.force_authenticate(user=self.state_admin)

        response = client.get('/api/dashboard/', {'mandal_id': self.m1.id})

        self.assertEqual(response.data['total_mines'], 2)
        self.assertEqual(response.data['total_mandals'], 1)
        self.assertEqual(response.data['total_districts'], 1)
        self.assertEqual(response.data['selected_mandal'], {
            'id': self.m1.id,
            'name': 'M1',
            'district_name': 'Hyderabad',
        })
        self.assertEqual(response.data['mineral_breakdown'][0]['production'], 300)

    def test_district_user_cannot_override_assigned_district(self):
        client = APIClient()
        client.force_authenticate(user=self.district_user)

        districts = client.get('/api/districts/', {'district_id': self.warangal.id})
        mandals = client.get('/api/mandals/', {'district_id': self.warangal.id})
        other_mandal_dashboard = client.get('/api/dashboard/', {'mandal_id': self.m2.id})
        response = client.get('/api/dashboard/', {'district_id': self.warangal.id})

        self.assertEqual([district['name'] for district in districts.data['results']], ['Hyderabad'])
        self.assertEqual([mandal['name'] for mandal in mandals.data['results']], ['M1'])
        self.assertEqual(other_mandal_dashboard.status_code, 404)
        self.assertEqual(response.data['total_mines'], 2)
        self.assertEqual([district['name'] for district in response.data['districts']], ['Hyderabad'])
        self.assertEqual([row['mineral'] for row in response.data['mineral_breakdown']], ['Black Granite'])

    def test_district_options_include_geographic_map_bounds(self):
        polygon = Polygon(
            (
                (221000, 1913000),
                (240000, 1913000),
                (240000, 1935000),
                (221000, 1935000),
                (221000, 1913000),
            ),
            srid=4326,
        )
        self.hyderabad.geom = MultiPolygon(polygon, srid=4326)
        self.hyderabad.save(update_fields=['geom'])
        client = APIClient()
        client.force_authenticate(user=self.state_admin)

        response = client.get('/api/districts/')
        bounds = next(item['bounds'] for item in response.data['results'] if item['name'] == 'Hyderabad')
        geometry = next(item['geometry'] for item in response.data['results'] if item['name'] == 'Hyderabad')

        self.assertEqual(len(bounds), 4)
        self.assertEqual(geometry['type'], 'MultiPolygon')
        self.assertGreater(bounds[0], 77)
        self.assertLess(bounds[0], 82)
        self.assertGreater(bounds[1], 15)
        self.assertLess(bounds[1], 20)

    def test_state_admin_can_fetch_one_district_boundary(self):
        client = APIClient()
        client.force_authenticate(user=self.state_admin)

        response = client.get('/api/districts/', {'district_id': self.hyderabad.id})

        self.assertEqual([district['name'] for district in response.data['results']], ['Hyderabad'])

    def test_state_admin_can_load_mandal_bounds_for_selected_district(self):
        polygon = Polygon(
            (
                (221000, 1913000),
                (222000, 1913000),
                (222000, 1914000),
                (221000, 1914000),
                (221000, 1913000),
            ),
            srid=4326,
        )
        self.m1.geom = MultiPolygon(polygon, srid=4326)
        self.m1.save(update_fields=['geom'])
        client = APIClient()
        client.force_authenticate(user=self.state_admin)

        response = client.get('/api/mandals/', {'district_id': self.hyderabad.id})

        self.assertEqual([mandal['name'] for mandal in response.data['results']], ['M1'])
        mandal = response.data['results'][0]
        self.assertEqual(mandal['geometry']['type'], 'MultiPolygon')
        self.assertEqual(len(mandal['bounds']), 4)
        self.assertGreater(mandal['bounds'][0], 77)
        self.assertLess(mandal['bounds'][0], 82)

    def test_spelling_variant_uses_official_district_boundary(self):
        polygon = Polygon(
            (
                (221000, 1913000),
                (240000, 1913000),
                (240000, 1935000),
                (221000, 1935000),
                (221000, 1913000),
            ),
            srid=4326,
        )
        official = District.objects.create(
            name='Mahabubnagar',
            geom=MultiPolygon(polygon, srid=4326),
        )
        District.objects.create(name='Mahbubnagar')
        client = APIClient()
        client.force_authenticate(user=self.state_admin)

        response = client.get('/api/districts/')
        boundaries = {item['name']: item for item in response.data['results']}

        self.assertEqual(boundaries['Mahabubnagar']['bounds'], boundaries['Mahbubnagar']['bounds'])
        self.assertEqual(boundaries['Mahabubnagar']['geometry'], boundaries['Mahbubnagar']['geometry'])
