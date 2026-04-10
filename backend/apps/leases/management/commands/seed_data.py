"""
Django management command: seed_data
Seeds realistic Telangana mining data:
- 15 Mining Leases across 6 districts
- 8 Vehicles (inspection, enforcement, survey)
- 20 DGPS Survey Points
- Spatial layers (forest, water, eco zones)
- 12 Vehicle Alerts spanning last 7 days
"""
import random
from datetime import date, timedelta, datetime, timezone as dt_timezone
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.contrib.gis.geos import MultiPolygon, Polygon, Point
from django.utils import timezone


def make_polygon(center_lon: float, center_lat: float, size_deg: float = 0.02) -> MultiPolygon:
    """Create a realistic irregular quadrilateral polygon around a center point."""
    # Add random jitter to make each polygon look unique
    jitter = lambda: random.uniform(-size_deg * 0.3, size_deg * 0.3)
    hs = size_deg / 2

    # Compute first point ONCE and reuse as closing point (GEOS requires identical first/last)
    p0 = (center_lon - hs + jitter(), center_lat - hs + jitter())
    coords = [
        p0,
        (center_lon + hs + jitter(), center_lat - hs * 0.8 + jitter()),
        (center_lon + hs * 1.1 + jitter(), center_lat + hs * 0.9 + jitter()),
        (center_lon - hs * 0.9 + jitter(), center_lat + hs + jitter()),
        p0,  # exact same tuple — closes the ring correctly
    ]
    return MultiPolygon(Polygon(coords, srid=4326), srid=4326)


LEASE_DATA = [
    # ─── Khammam District (Coal) ────────────────────────────────────────
    {
        "lease_id": "ML/TS/2018/00123",
        "mine_name": "Sri Balaji Coal Mine",
        "mineral_type": "COAL",
        "leaseholder_name": "Sri Balaji Collieries Pvt Ltd",
        "leaseholder_pan": "AABCB1234M",
        "leaseholder_contact": "+919849123456",
        "leaseholder_email": "sribalaji@mines.com",
        "district": "Khammam",
        "mandal": "Yellandu",
        "village": "Bonakal",
        "survey_number": "R.S. No. 234/1A",
        "center_lon": 80.3512, "center_lat": 17.5234, "size": 0.030,
        "area_hectares": "248.5600",
        "grant_date": date(2018, 3, 15),
        "commencement_date": date(2018, 9, 1),
        "valid_from": date(2018, 3, 15),
        "valid_till": date(2038, 3, 14),
        "status": "ACTIVE",
        "royalty_due": "145000.00",
    },
    {
        "lease_id": "ML/TS/2016/00089",
        "mine_name": "Lakshmi Coal Enterprises",
        "mineral_type": "COAL",
        "leaseholder_name": "Lakshmi Mining & Minerals Pvt Ltd",
        "leaseholder_pan": "AABCL5678N",
        "leaseholder_contact": "+919948765432",
        "leaseholder_email": "lakshmi.mining@gmail.com",
        "district": "Khammam",
        "mandal": "Kallur",
        "village": "Thimmapur",
        "survey_number": "S. No. 45/2B",
        "center_lon": 80.1876, "center_lat": 17.2734, "size": 0.025,
        "area_hectares": "189.2400",
        "grant_date": date(2016, 7, 22),
        "commencement_date": date(2017, 1, 5),
        "valid_from": date(2016, 7, 22),
        "valid_till": date(2026, 7, 21),
        "status": "EXPIRED",
        "royalty_due": "78500.00",
    },
    {
        "lease_id": "ML/TS/2021/00456",
        "mine_name": "Saraswati Granite Quarry",
        "mineral_type": "GRANITE",
        "leaseholder_name": "Saraswati Minerals Corporation",
        "leaseholder_pan": "AABCS9012P",
        "leaseholder_contact": "+919866543210",
        "leaseholder_email": "saraswati.corp@yahoo.com",
        "district": "Khammam",
        "mandal": "Khammam",
        "village": "Mudigonda",
        "survey_number": "S. No. 112/3A",
        "center_lon": 80.1514, "center_lat": 17.2473, "size": 0.018,
        "area_hectares": "92.1800",
        "grant_date": date(2021, 11, 3),
        "commencement_date": date(2022, 2, 10),
        "valid_from": date(2021, 11, 3),
        "valid_till": date(2041, 11, 2),
        "status": "ACTIVE",
        "royalty_due": "0.00",
    },
    {
        "lease_id": "ML/TS/2022/00578",
        "mine_name": "Telangana Sand Mining Area — Yellandu",
        "mineral_type": "SAND",
        "leaseholder_name": "Telangana Minerals Development Corp",
        "leaseholder_pan": "AABCT3456Q",
        "leaseholder_contact": "+919876543212",
        "leaseholder_email": "tmdc@telangana.gov.in",
        "district": "Khammam",
        "mandal": "Sathupalli",
        "village": "Palvancha",
        "survey_number": "R.S. No. 67/4C",
        "center_lon": 80.7234, "center_lat": 17.4312, "size": 0.015,
        "area_hectares": "55.3400",
        "grant_date": date(2022, 4, 1),
        "commencement_date": date(2022, 8, 15),
        "valid_from": date(2022, 4, 1),
        "valid_till": date(2027, 3, 31),
        "status": "ACTIVE",
        "royalty_due": "22000.00",
    },
    # ─── Bhadradri Kothagudem (Coal) ─────────────────────────────────────
    {
        "lease_id": "ML/TS/2017/00234",
        "mine_name": "SCCL Block-IV Kothagudem",
        "mineral_type": "COAL",
        "leaseholder_name": "Singareni Collieries Company Limited",
        "leaseholder_pan": "AABCS1111A",
        "leaseholder_contact": "+914040123456",
        "leaseholder_email": "cmd@scclmines.com",
        "district": "Bhadradri Kothagudem",
        "mandal": "Kothagudem",
        "village": "Yellandu Colony",
        "survey_number": "SCCL Block No. IV-A",
        "center_lon": 80.6201, "center_lat": 17.5617, "size": 0.045,
        "area_hectares": "512.7800",
        "grant_date": date(2017, 9, 1),
        "commencement_date": date(2018, 3, 1),
        "valid_from": date(2017, 9, 1),
        "valid_till": date(2047, 8, 31),
        "status": "ACTIVE",
        "royalty_due": "580000.00",
    },
    {
        "lease_id": "ML/TS/2019/00312",
        "mine_name": "Bhadrachalam Coal Block",
        "mineral_type": "COAL",
        "leaseholder_name": "Godavari Minerals Pvt Ltd",
        "leaseholder_pan": "AABCG4567B",
        "leaseholder_contact": "+919440987654",
        "leaseholder_email": "info@godavariminerals.com",
        "district": "Bhadradri Kothagudem",
        "mandal": "Bhadrachalam",
        "village": "Bhadrachalam",
        "survey_number": "R.S. No. 456/1",
        "center_lon": 80.8934, "center_lat": 17.6712, "size": 0.035,
        "area_hectares": "334.2200",
        "grant_date": date(2019, 5, 15),
        "commencement_date": date(2020, 1, 1),
        "valid_from": date(2019, 5, 15),
        "valid_till": date(2039, 5, 14),
        "status": "ACTIVE",
        "royalty_due": "0.00",
    },
    {
        "lease_id": "ML/TS/2015/00045",
        "mine_name": "Palwancha Iron Ore Mine",
        "mineral_type": "IRON_ORE",
        "leaseholder_name": "Palwancha Steel & Minerals Ltd",
        "leaseholder_pan": "AABCP7890C",
        "leaseholder_contact": "+919848765430",
        "leaseholder_email": "palwancha.steel@gmail.com",
        "district": "Bhadradri Kothagudem",
        "mandal": "Palwancha",
        "village": "Nagaram",
        "survey_number": "S. No. 234/A",
        "center_lon": 80.5123, "center_lat": 17.3456, "size": 0.022,
        "area_hectares": "156.7800",
        "grant_date": date(2015, 8, 10),
        "commencement_date": date(2016, 2, 1),
        "valid_from": date(2015, 8, 10),
        "valid_till": date(2025, 8, 9),
        "status": "SUSPENDED",
        "royalty_due": "234500.00",
    },
    # ─── Karimnagar ─────────────────────────────────────────────────────
    {
        "lease_id": "ML/TS/2020/00389",
        "mine_name": "Karimnagar Iron Ore Mining Area",
        "mineral_type": "IRON_ORE",
        "leaseholder_name": "Deccan Iron & Steel Pvt Ltd",
        "leaseholder_pan": "AABCD2345D",
        "leaseholder_contact": "+919849234567",
        "leaseholder_email": "deccan.iron@email.com",
        "district": "Karimnagar",
        "mandal": "Huzurabad",
        "village": "Konaraopet",
        "survey_number": "R.S. No. 89/2A",
        "center_lon": 79.1288, "center_lat": 18.4386, "size": 0.028,
        "area_hectares": "214.5600",
        "grant_date": date(2020, 3, 25),
        "commencement_date": date(2020, 9, 10),
        "valid_from": date(2020, 3, 25),
        "valid_till": date(2040, 3, 24),
        "status": "ACTIVE",
        "royalty_due": "0.00",
    },
    {
        "lease_id": "ML/TS/2019/00278",
        "mine_name": "Sri Venkateswara Granite — Karimnagar",
        "mineral_type": "GRANITE",
        "leaseholder_name": "Sri Venkateswara Mines & Minerals",
        "leaseholder_pan": "AABCV3456E",
        "leaseholder_contact": "+919908765432",
        "leaseholder_email": "svmm.karimnagar@gmail.com",
        "district": "Karimnagar",
        "mandal": "Peddapalli",
        "village": "Ramagundam",
        "survey_number": "S. No. 177/3B",
        "center_lon": 79.4567, "center_lat": 18.7612, "size": 0.016,
        "area_hectares": "78.4500",
        "grant_date": date(2019, 9, 12),
        "commencement_date": date(2020, 3, 1),
        "valid_from": date(2019, 9, 12),
        "valid_till": date(2029, 9, 11),
        "status": "PENDING",
        "royalty_due": "15000.00",
    },
    # ─── Nalgonda ────────────────────────────────────────────────────────
    {
        "lease_id": "ML/TS/2018/00156",
        "mine_name": "Nalgonda Limestone Quarry",
        "mineral_type": "LIMESTONE",
        "leaseholder_name": "Nalgonda Cement Materials Pvt Ltd",
        "leaseholder_pan": "AABCN4567F",
        "leaseholder_contact": "+919866234567",
        "leaseholder_email": "nalcementml@gmail.com",
        "district": "Nalgonda",
        "mandal": "Nakrekal",
        "village": "Thipparthi",
        "survey_number": "R.S. No. 334/1B",
        "center_lon": 79.2677, "center_lat": 17.0575, "size": 0.025,
        "area_hectares": "178.2300",
        "grant_date": date(2018, 1, 20),
        "commencement_date": date(2018, 7, 1),
        "valid_from": date(2018, 1, 20),
        "valid_till": date(2038, 1, 19),
        "status": "ACTIVE",
        "royalty_due": "67800.00",
    },
    {
        "lease_id": "ML/TS/2023/00612",
        "mine_name": "Krishna Valley Fluorite Mine",
        "mineral_type": "FLUORITE",
        "leaseholder_name": "Krishna Valley Minerals Ltd",
        "leaseholder_pan": "AABCK5678G",
        "leaseholder_contact": "+919849345678",
        "leaseholder_email": "kvm.mining@yahoo.com",
        "district": "Nalgonda",
        "mandal": "Miryalaguda",
        "village": "Kodad",
        "survey_number": "S. No. 212/2C",
        "center_lon": 79.5634, "center_lat": 16.8712, "size": 0.014,
        "area_hectares": "62.3400",
        "grant_date": date(2023, 6, 15),
        "commencement_date": date(2023, 12, 1),
        "valid_from": date(2023, 6, 15),
        "valid_till": date(2033, 6, 14),
        "status": "ACTIVE",
        "royalty_due": "0.00",
    },
    # ─── Rangareddy ──────────────────────────────────────────────────────
    {
        "lease_id": "ML/TS/2017/00198",
        "mine_name": "Rangareddy Granite Block-A",
        "mineral_type": "GRANITE",
        "leaseholder_name": "Hyderabad Granites Pvt Ltd",
        "leaseholder_pan": "AABCH6789H",
        "leaseholder_contact": "+914023456789",
        "leaseholder_email": "hyd.granites@gmail.com",
        "district": "Rangareddy",
        "mandal": "Shamshabad",
        "village": "Tukkuguda",
        "survey_number": "R.S. No. 78/4A",
        "center_lon": 78.2022, "center_lat": 17.3266, "size": 0.018,
        "area_hectares": "98.6700",
        "grant_date": date(2017, 11, 5),
        "commencement_date": date(2018, 4, 1),
        "valid_from": date(2017, 11, 5),
        "valid_till": date(2037, 11, 4),
        "status": "ACTIVE",
        "royalty_due": "42000.00",
    },
    {
        "lease_id": "ML/TS/2021/00489",
        "mine_name": "South Hyderabad Granite Quarry",
        "mineral_type": "GRANITE",
        "leaseholder_name": "South Deccan Minerals Pvt Ltd",
        "leaseholder_pan": "AABCS7890I",
        "leaseholder_contact": "+919908456789",
        "leaseholder_email": "sdminerals@gmail.com",
        "district": "Rangareddy",
        "mandal": "Chevella",
        "village": "Moinabad",
        "survey_number": "S. No. 89/1A",
        "center_lon": 77.9345, "center_lat": 17.1823, "size": 0.020,
        "area_hectares": "112.4500",
        "grant_date": date(2021, 7, 20),
        "commencement_date": date(2022, 1, 10),
        "valid_from": date(2021, 7, 20),
        "valid_till": date(2041, 7, 19),
        "status": "ACTIVE",
        "royalty_due": "0.00",
    },
    # ─── Mahbubnagar ─────────────────────────────────────────────────────
    {
        "lease_id": "ML/TS/2019/00345",
        "mine_name": "Mahbubnagar Dolomite Mine",
        "mineral_type": "DOLOMITE",
        "leaseholder_name": "Palamuru Rock Industries Pvt Ltd",
        "leaseholder_pan": "AABCP9012J",
        "leaseholder_contact": "+919440234567",
        "leaseholder_email": "palamuru.rocks@email.com",
        "district": "Mahabubnagar",
        "mandal": "Achampet",
        "village": "Badepally",
        "survey_number": "R.S. No. 556/2B",
        "center_lon": 77.9834, "center_lat": 16.7373, "size": 0.022,
        "area_hectares": "142.8900",
        "grant_date": date(2019, 2, 14),
        "commencement_date": date(2019, 8, 1),
        "valid_from": date(2019, 2, 14),
        "valid_till": date(2039, 2, 13),
        "status": "ACTIVE",
        "royalty_due": "38500.00",
    },
    {
        "lease_id": "ML/TS/2020/00423",
        "mine_name": "Narayanpet Granite Quarry",
        "mineral_type": "GRANITE",
        "leaseholder_name": "Narayanpet Stone Crushers Ltd",
        "leaseholder_pan": "AABCN1234K",
        "leaseholder_contact": "+919849456789",
        "leaseholder_email": "npstone@gmail.com",
        "district": "Mahabubnagar",
        "mandal": "Narayanpet",
        "village": "Devapur",
        "survey_number": "S. No. 345/3C",
        "center_lon": 77.4923, "center_lat": 16.7456, "size": 0.016,
        "area_hectares": "71.3400",
        "grant_date": date(2020, 10, 5),
        "commencement_date": date(2021, 3, 20),
        "valid_from": date(2020, 10, 5),
        "valid_till": date(2030, 10, 4),
        "status": "ACTIVE",
        "royalty_due": "0.00",
    },
]

VEHICLE_DATA = [
    {
        "netradyne_device_id": "ND-TS-001",
        "vehicle_number": "TS05UE3699",
        "vehicle_type": "INSPECTION",
        "driver_name": "K. Ramesh",
        "driver_license": "TS-09-2019-1234567",
        "assigned_district": "Khammam",
        "init_lat": 17.2473, "init_lon": 80.1514,
    },
    {
        "netradyne_device_id": "ND-TS-002",
        "vehicle_number": "TS05UE0999",
        "vehicle_type": "INSPECTION",
        "driver_name": "P. Suresh Kumar",
        "driver_license": "TS-09-2020-7654321",
        "assigned_district": "Bhadradri Kothagudem",
        "init_lat": 17.5617, "init_lon": 80.6201,
    },
    {
        "netradyne_device_id": "ND-TS-003",
        "vehicle_number": "TG05T8099",
        "vehicle_type": "ENFORCEMENT",
        "driver_name": "G. Narasimha Rao",
        "driver_license": "TS-11-2018-2345678",
        "assigned_district": "Karimnagar",
        "init_lat": 18.4386, "init_lon": 79.1288,
    },
    {
        "netradyne_device_id": "ND-TS-004",
        "vehicle_number": "TG05U2349",
        "vehicle_type": "INSPECTION",
        "driver_name": "B. Venkateswara Reddy",
        "driver_license": "TS-11-2021-3456789",
        "assigned_district": "Nalgonda",
        "init_lat": 17.0575, "init_lon": 79.2677,
    },
    {
        "netradyne_device_id": "ND-TS-005",
        "vehicle_number": "TS05UE9099",
        "vehicle_type": "ENFORCEMENT",
        "driver_name": "M. Srinivas",
        "driver_license": "TS-13-2022-4567890",
        "assigned_district": "Rangareddy",
        "init_lat": 17.3266, "init_lon": 78.2022,
    },
    {
        "netradyne_device_id": "ND-TS-006",
        "vehicle_number": "TS 13 EF 7890",
        "vehicle_type": "SURVEY",
        "driver_name": "R. Chandrashekhar",
        "driver_license": "TS-13-2019-5678901",
        "assigned_district": "Khammam",
        "init_lat": 17.4312, "init_lon": 80.7234,
    },
    {
        "netradyne_device_id": "ND-TS-007",
        "vehicle_number": "TS 15 EG 4567",
        "vehicle_type": "SURVEY",
        "driver_name": "A. Ravi Shankar",
        "driver_license": "TS-15-2020-6789012",
        "assigned_district": "Mahabubnagar",
        "init_lat": 16.7373, "init_lon": 77.9834,
    },
    {
        "netradyne_device_id": "ND-TS-008",
        "vehicle_number": "TS 09 EH 1357",
        "vehicle_type": "INSPECTION",
        "driver_name": "S. Nagraj",
        "driver_license": "TS-09-2021-7890123",
        "assigned_district": "Bhadradri Kothagudem",
        "init_lat": 17.3456, "init_lon": 80.5123,
    },
]

SPATIAL_LAYERS = [
    # Forest boundaries around Bhadrachalam
    {
        "layer_type": "FOREST",
        "name": "Bhadrachalam Reserve Forest — North",
        "center_lon": 80.7234, "center_lat": 17.8912, "size": 0.08,
        "properties": {"area_sq_km": 124.5, "category": "Reserved Forest", "authority": "Forest Dept TS"},
        "source": "Telangana Forest Department GIS",
        "last_updated": date(2024, 3, 15),
    },
    {
        "layer_type": "FOREST",
        "name": "Eturnagaram Wildlife Sanctuary Buffer",
        "center_lon": 80.5678, "center_lat": 18.3456, "size": 0.10,
        "properties": {"area_sq_km": 245.8, "category": "Wildlife Sanctuary", "authority": "Forest Dept TS"},
        "source": "MOEF&CC GIS Layer 2023",
        "last_updated": date(2023, 11, 20),
    },
    {
        "layer_type": "FOREST",
        "name": "Khammam Protected Forest — Singareni",
        "center_lon": 80.0312, "center_lat": 17.4567, "size": 0.06,
        "properties": {"area_sq_km": 87.2, "category": "Protected Forest", "authority": "Forest Dept TS"},
        "source": "Telangana Forest Department GIS",
        "last_updated": date(2024, 1, 10),
    },
    # Water bodies
    {
        "layer_type": "WATER",
        "name": "Godavari River — Bhadrachalam Segment",
        "center_lon": 80.8934, "center_lat": 17.6712, "size": 0.12,
        "properties": {"river": "Godavari", "width_m": 820, "classification": "Major River"},
        "source": "CWC India River Atlas",
        "last_updated": date(2024, 2, 1),
    },
    {
        "layer_type": "WATER",
        "name": "Krishna River — Nalgonda Segment",
        "center_lon": 79.3456, "center_lat": 16.9234, "size": 0.10,
        "properties": {"river": "Krishna", "width_m": 650, "classification": "Major River"},
        "source": "CWC India River Atlas",
        "last_updated": date(2024, 2, 1),
    },
    {
        "layer_type": "WATER",
        "name": "Nagarjuna Sagar Reservoir Buffer",
        "center_lon": 79.3178, "center_lat": 16.5734, "size": 0.09,
        "properties": {"reservoir": "Nagarjuna Sagar", "capacity_tmcft": 312, "classification": "Major Reservoir"},
        "source": "APGENCO / TSGENCO GIS",
        "last_updated": date(2024, 1, 15),
    },
    {
        "layer_type": "WATER",
        "name": "Musi River — Rangareddy Corridor",
        "center_lon": 78.4234, "center_lat": 17.2345, "size": 0.07,
        "properties": {"river": "Musi", "width_m": 120, "classification": "Urban River"},
        "source": "HMDA GIS Data",
        "last_updated": date(2024, 3, 1),
    },
    # Eco-sensitive zones
    {
        "layer_type": "ECO",
        "name": "Amrabad Tiger Reserve — Eco-Sensitive Zone",
        "center_lon": 78.7034, "center_lat": 16.3456, "size": 0.11,
        "properties": {
            "sanctuary": "Amrabad Tiger Reserve",
            "notification": "MoEF/ESZ/2022/445",
            "area_sq_km": 450.2,
        },
        "source": "MOEF&CC Eco-Sensitive Zone Notification 2022",
        "last_updated": date(2022, 9, 15),
    },
    {
        "layer_type": "ECO",
        "name": "Kawal Tiger Reserve — Eco-Sensitive Zone",
        "center_lon": 79.0312, "center_lat": 19.0234, "size": 0.09,
        "properties": {
            "sanctuary": "Kawal Tiger Reserve",
            "notification": "MoEF/ESZ/2021/312",
            "area_sq_km": 310.5,
        },
        "source": "MOEF&CC Eco-Sensitive Zone Notification 2021",
        "last_updated": date(2021, 11, 20),
    },
]


class Command(BaseCommand):
    help = 'Seed realistic Telangana mining data (leases, vehicles, spatial layers, alerts)'

    def handle(self, *args, **options):
        from apps.leases.models import MiningLease
        from apps.gis.models import SpatialLayer, DGPSSurveyPoint
        from apps.vehicle_tracking.models import Vehicle, VehicleLocationHistory, VehicleAlert

        self.stdout.write('Seeding Telangana mining data...')

        # Get or create admin user
        admin_user, _ = User.objects.get_or_create(
            username='admin@minegis.ts.gov.in',
            defaults={
                'email': 'admin@minegis.ts.gov.in',
                'first_name': 'System',
                'last_name': 'Administrator',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if not admin_user.has_usable_password():
            admin_user.set_password('MineGIS@2026')
            admin_user.save()

        # Create sample officers
        officers = {}
        officer_data = [
            ('do.khammam@mines.ts.gov.in', 'V. Ranga Rao', 'District Officer', 'Khammam'),
            ('do.bhadradri@mines.ts.gov.in', 'P. Krishna Murthy', 'District Officer', 'Bhadradri Kothagudem'),
            ('do.karimnagar@mines.ts.gov.in', 'T. Narasimha Reddy', 'District Officer', 'Karimnagar'),
        ]
        for uname, full_name, desig, district in officer_data:
            first, *rest = full_name.split(' ')
            last = ' '.join(rest)
            u, _ = User.objects.get_or_create(
                username=uname,
                defaults={
                    'email': uname,
                    'first_name': first,
                    'last_name': last,
                },
            )
            if not u.has_usable_password():
                u.set_password('MineGIS@2026')
                u.save()
            officers[district] = u

        # ─── Seed Mining Leases ─────────────────────────────────
        self.stdout.write('  Creating 15 mining leases...')
        leases = {}
        for data in LEASE_DATA:
            if MiningLease.objects.filter(lease_id=data['lease_id']).exists():
                leases[data['lease_id']] = MiningLease.objects.get(lease_id=data['lease_id'])
                continue

            boundary = make_polygon(
                data['center_lon'], data['center_lat'], data['size']
            )
            lease = MiningLease.objects.create(
                lease_id=data['lease_id'],
                mine_name=data['mine_name'],
                mineral_type=data['mineral_type'],
                leaseholder_name=data['leaseholder_name'],
                leaseholder_pan=data['leaseholder_pan'],
                leaseholder_contact=data['leaseholder_contact'],
                leaseholder_email=data['leaseholder_email'],
                district=data['district'],
                mandal=data['mandal'],
                village=data['village'],
                survey_number=data['survey_number'],
                boundary=boundary,
                area_hectares=data['area_hectares'],
                grant_date=data['grant_date'],
                commencement_date=data['commencement_date'],
                valid_from=data['valid_from'],
                valid_till=data['valid_till'],
                status=data['status'],
                royalty_due=data['royalty_due'],
                created_by=admin_user,
            )
            leases[data['lease_id']] = lease
        self.stdout.write(self.style.SUCCESS(f'  ✅ {len(LEASE_DATA)} leases ready'))

        # ─── Seed Spatial Layers ────────────────────────────────
        self.stdout.write('  Creating spatial layers (forest, water, eco)...')
        for data in SPATIAL_LAYERS:
            if SpatialLayer.objects.filter(name=data['name']).exists():
                continue
            from django.contrib.gis.geos import Polygon as GEOSPolygon
            geom = make_polygon(data['center_lon'], data['center_lat'], data['size'])
            # Use single polygon for spatial layers
            SpatialLayer.objects.create(
                layer_type=data['layer_type'],
                name=data['name'],
                geometry=geom.convex_hull,
                properties=data['properties'],
                source=data['source'],
                last_updated=data['last_updated'],
            )
        self.stdout.write(self.style.SUCCESS(f'  ✅ {len(SPATIAL_LAYERS)} spatial layers ready'))

        # ─── Seed DGPS Survey Points ────────────────────────────
        self.stdout.write('  Creating 20 DGPS survey points...')
        surveyor_names = [
            'K. Srinivas Murthy', 'T. Ravi Kumar', 'P. Nageswara Rao',
            'B. Sridhar', 'G. Venkataramana',
        ]
        point_count = 0
        lease_list = list(leases.values())[:8]  # Points for first 8 leases
        for i, lease in enumerate(lease_list):
            if not lease.centroid:
                continue
            for j in range(3 if i < 4 else 2):
                survey_id = f"DGPS/TS/{lease.lease_id.split('/')[-1]}/{j+1:02d}"
                if DGPSSurveyPoint.objects.filter(survey_id=survey_id).exists():
                    continue
                offset_lat = random.uniform(-0.01, 0.01)
                offset_lon = random.uniform(-0.01, 0.01)
                DGPSSurveyPoint.objects.create(
                    survey_id=survey_id,
                    lease=lease,
                    location=Point(
                        lease.centroid.x + offset_lon,
                        lease.centroid.y + offset_lat,
                        srid=4326,
                    ),
                    accuracy_meters=round(random.uniform(2.0, 15.0), 2),
                    survey_date=date.today() - timedelta(days=random.randint(30, 365)),
                    surveyor_name=random.choice(surveyor_names),
                    elevation=round(random.uniform(100, 450), 1),
                    notes=f"Corner point {j+1} of {lease.mine_name}",
                )
                point_count += 1
        self.stdout.write(self.style.SUCCESS(f'  ✅ {point_count} DGPS points ready'))

        # ─── Seed Vehicles ──────────────────────────────────────
        self.stdout.write('  Creating 8 vehicles...')
        vehicles = {}
        for data in VEHICLE_DATA:
            if Vehicle.objects.filter(netradyne_device_id=data['netradyne_device_id']).exists():
                vehicles[data['netradyne_device_id']] = Vehicle.objects.get(
                    netradyne_device_id=data['netradyne_device_id']
                )
                continue

            officer = officers.get(data['assigned_district'])
            v = Vehicle.objects.create(
                netradyne_device_id=data['netradyne_device_id'],
                vehicle_number=data['vehicle_number'],
                vehicle_type=data['vehicle_type'],
                driver_name=data['driver_name'],
                driver_license=data['driver_license'],
                assigned_district=data['assigned_district'],
                assigned_officer=officer,
                last_location=Point(
                    data['init_lon'] + random.uniform(-0.02, 0.02),
                    data['init_lat'] + random.uniform(-0.02, 0.02),
                    srid=4326,
                ),
                last_seen=timezone.now() - timedelta(minutes=random.randint(1, 15)),
                current_speed_kmh=round(random.uniform(0, 55), 1),
                current_heading=round(random.uniform(0, 360), 1),
                is_online=random.random() > 0.25,
                engine_on=random.random() > 0.2,
            )
            # Assign some to active leases
            if data['assigned_district'] == 'Khammam':
                v.current_lease = leases.get('ML/TS/2021/00456')
                v.save(update_fields=['current_lease'])
            vehicles[data['netradyne_device_id']] = v
        self.stdout.write(self.style.SUCCESS(f'  ✅ {len(VEHICLE_DATA)} vehicles ready'))

        # ─── Seed Vehicle Alerts ────────────────────────────────
        self.stdout.write('  Creating 12 vehicle alerts over last 7 days...')
        alert_scenarios = [
            {
                "vehicle_key": "ND-TS-001",
                "alert_type": "GEOFENCE_UNAUTHORIZED",
                "severity": "HIGH",
                "lease_key": "ML/TS/2018/00123",
                "hours_ago": 2,
                "description": "Vehicle TS 09 EA 1234 entered ML/TS/2018/00123 boundary without an active inspection order.",
            },
            {
                "vehicle_key": "ND-TS-002",
                "alert_type": "OVERSPEEDING",
                "severity": "MEDIUM",
                "lease_key": None,
                "hours_ago": 5,
                "description": "Vehicle TS 09 EB 5678 detected at 78 km/h in a 50 km/h zone near Bhadrachalam bypass road.",
            },
            {
                "vehicle_key": "ND-TS-001",
                "alert_type": "GEOFENCE_EXIT",
                "severity": "LOW",
                "lease_key": "ML/TS/2021/00456",
                "hours_ago": 8,
                "description": "Vehicle completed inspection at ML/TS/2021/00456 and exited geofence.",
            },
            {
                "vehicle_key": "ND-TS-003",
                "alert_type": "HARSH_BRAKING",
                "severity": "MEDIUM",
                "lease_key": None,
                "hours_ago": 18,
                "description": "Harsh braking event detected for vehicle TS 11 EC 2345 near NH-63.",
            },
            {
                "vehicle_key": "ND-TS-005",
                "alert_type": "IDLE_ENGINE",
                "severity": "LOW",
                "lease_key": None,
                "hours_ago": 26,
                "description": "Engine idle for 45 minutes at Rangareddy inspection site.",
            },
            {
                "vehicle_key": "ND-TS-004",
                "alert_type": "GEOFENCE_ENTRY",
                "severity": "LOW",
                "lease_key": "ML/TS/2018/00156",
                "hours_ago": 30,
                "description": "Vehicle TS 11 ED 9012 commenced inspection at ML/TS/2018/00156 (Nalgonda Limestone).",
            },
            {
                "vehicle_key": "ND-TS-008",
                "alert_type": "GEOFENCE_UNAUTHORIZED",
                "severity": "HIGH",
                "lease_key": "ML/TS/2015/00045",
                "hours_ago": 48,
                "description": "ALERT: Unauthorized access to SUSPENDED lease ML/TS/2015/00045 by vehicle TS 09 EH 1357.",
            },
            {
                "vehicle_key": "ND-TS-002",
                "alert_type": "OVERSPEEDING",
                "severity": "HIGH",
                "lease_key": None,
                "hours_ago": 72,
                "description": "Vehicle TS 09 EB 5678 detected at 91 km/h on NH-30 — critical overspeeding.",
            },
            {
                "vehicle_key": "ND-TS-006",
                "alert_type": "ROUTE_DEVIATION",
                "severity": "MEDIUM",
                "lease_key": "ML/TS/2022/00578",
                "hours_ago": 96,
                "description": "Survey vehicle TS 13 EF 7890 deviated from assigned route to ML/TS/2022/00578.",
            },
            {
                "vehicle_key": "ND-TS-007",
                "alert_type": "GEOFENCE_ENTRY",
                "severity": "LOW",
                "lease_key": "ML/TS/2019/00345",
                "hours_ago": 120,
                "description": "Survey vehicle commenced DGPS work at ML/TS/2019/00345 (Mahbubnagar Dolomite).",
            },
            {
                "vehicle_key": "ND-TS-003",
                "alert_type": "GEOFENCE_UNAUTHORIZED",
                "severity": "HIGH",
                "lease_key": "ML/TS/2016/00089",
                "hours_ago": 144,
                "description": "Enforcement vehicle detected at EXPIRED lease ML/TS/2016/00089 without prior authorization.",
            },
            {
                "vehicle_key": "ND-TS-005",
                "alert_type": "HARSH_BRAKING",
                "severity": "MEDIUM",
                "lease_key": None,
                "hours_ago": 162,
                "description": "Multiple harsh braking events recorded near Rangareddy Granite Block-A.",
            },
        ]

        alert_count = 0
        for scenario in alert_scenarios:
            vehicle = vehicles.get(scenario['vehicle_key'])
            if not vehicle:
                continue
            lease = leases.get(scenario['lease_key']) if scenario['lease_key'] else None
            ts = timezone.now() - timedelta(hours=scenario['hours_ago'])
            loc = None
            if vehicle.last_location:
                loc = Point(
                    vehicle.last_location.x + random.uniform(-0.005, 0.005),
                    vehicle.last_location.y + random.uniform(-0.005, 0.005),
                    srid=4326,
                )

            # Check if already exists (by approximate timestamp)
            if not VehicleAlert.objects.filter(vehicle=vehicle, alert_type=scenario['alert_type'],
                                               timestamp__date=ts.date()).exists():
                VehicleAlert.objects.create(
                    vehicle=vehicle,
                    alert_type=scenario['alert_type'],
                    severity=scenario['severity'],
                    lease=lease,
                    location=loc,
                    timestamp=ts,
                    description=scenario['description'],
                    is_resolved=scenario['hours_ago'] > 48,
                )
                alert_count += 1

        self.stdout.write(self.style.SUCCESS(f'  ✅ {alert_count} vehicle alerts created'))

        # Create UserProfiles for all users
        from apps.authentication.models import UserProfile
        for user in User.objects.all():
            if not hasattr(user, 'profile'):
                role = 'ADMIN' if user.is_superuser else 'DISTRICT_OFFICER'
                UserProfile.objects.get_or_create(user=user, defaults={'role': role})

        self.stdout.write(self.style.SUCCESS('✅ Seed data complete! Default login: admin@minegis.ts.gov.in / MineGIS@2026'))
