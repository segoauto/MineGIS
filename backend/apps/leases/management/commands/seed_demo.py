"""
Management command: seed_demo — inserts realistic demo data for MineGIS-TS.
Telangana mining leases, vehicles, alerts.
"""
import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.contrib.gis.geos import MultiPolygon, Polygon, Point


TELANGANA_LEASES = [
    {
        "lease_id": "ML/TS/2019/00234",
        "mine_name": "Singareni Collieries Block-A",
        "mineral_type": "COAL",
        "leaseholder_name": "Singareni Collieries Company Ltd",
        "leaseholder_pan": "AAACS1234B",
        "leaseholder_contact": "9876543210",
        "leaseholder_email": "ceo@sccl.in",
        "district": "Bhadradri Kothagudem",
        "mandal": "Yellandu",
        "village": "Paloncha",
        "survey_number": "SV/233/2019",
        "area_hectares": 485.75,
        "status": "ACTIVE",
        "center": (80.5, 17.6),
        "grant_date": date(2019, 3, 15),
        "valid_from": date(2019, 3, 15),
        "valid_till": date(2039, 3, 14),
    },
    {
        "lease_id": "ML/TS/2020/00456",
        "mine_name": "Nalgonda Limestone Quarry",
        "mineral_type": "LIMESTONE",
        "leaseholder_name": "Penna Cement Industries Ltd",
        "leaseholder_pan": "AAACP5678C",
        "leaseholder_contact": "9123456789",
        "leaseholder_email": "mines@penna.in",
        "district": "Nalgonda",
        "mandal": "Miryalaguda",
        "village": "Chinthapally",
        "survey_number": "SV/112/2020",
        "area_hectares": 62.30,
        "status": "ACTIVE",
        "center": (79.56, 16.88),
        "grant_date": date(2020, 7, 1),
        "valid_from": date(2020, 7, 1),
        "valid_till": date(2030, 6, 30),
    },
    {
        "lease_id": "ML/TS/2018/00789",
        "mine_name": "Karimnagar Granite Quarry",
        "mineral_type": "GRANITE",
        "leaseholder_name": "Sri Venkateshwara Minerals Pvt Ltd",
        "leaseholder_pan": "AAASV2345D",
        "leaseholder_contact": "9988776655",
        "leaseholder_email": "info@svminerals.in",
        "district": "Karimnagar",
        "mandal": "Karimnagar",
        "village": "Dharmasagar",
        "survey_number": "SV/089/2018",
        "area_hectares": 18.45,
        "status": "ACTIVE",
        "center": (79.12, 18.44),
        "grant_date": date(2018, 11, 20),
        "valid_from": date(2018, 11, 20),
        "valid_till": date(2025, 11, 19),
    },
    {
        "lease_id": "ML/TS/2015/00345",
        "mine_name": "Khammam Iron Ore Block",
        "mineral_type": "IRON_ORE",
        "leaseholder_name": "NMDC Limited",
        "leaseholder_pan": "AAACN6789E",
        "leaseholder_contact": "9871234560",
        "leaseholder_email": "khammam@nmdc.in",
        "district": "Khammam",
        "mandal": "Bhadrachalam",
        "village": "Raghavapuram",
        "survey_number": "SV/054/2015",
        "area_hectares": 312.80,
        "status": "EXPIRED",
        "center": (80.80, 17.68),
        "grant_date": date(2015, 1, 12),
        "valid_from": date(2015, 1, 12),
        "valid_till": date(2024, 1, 11),
    },
    {
        "lease_id": "ML/TS/2021/00567",
        "mine_name": "Mancherial Dolomite Quarry",
        "mineral_type": "DOLOMITE",
        "leaseholder_name": "Ramco Cements Ltd",
        "leaseholder_pan": "AAARC1112F",
        "leaseholder_contact": "9800112233",
        "leaseholder_email": "mancherial@ramcocements.in",
        "district": "Mancherial",
        "mandal": "Luxettipet",
        "village": "Mamada",
        "survey_number": "SV/201/2021",
        "area_hectares": 94.20,
        "status": "ACTIVE",
        "center": (79.40, 18.88),
        "grant_date": date(2021, 5, 3),
        "valid_from": date(2021, 5, 3),
        "valid_till": date(2041, 5, 2),
    },
    {
        "lease_id": "ML/TS/2022/00678",
        "mine_name": "Nizamabad Fluorite Mine",
        "mineral_type": "FLUORITE",
        "leaseholder_name": "Indian Rare Earths Ltd",
        "leaseholder_pan": "AAACI2345G",
        "leaseholder_contact": "9922334455",
        "leaseholder_email": "nizamabad@irel.in",
        "district": "Nizamabad",
        "mandal": "Armoor",
        "village": "Kothapally",
        "survey_number": "SV/311/2022",
        "area_hectares": 45.60,
        "status": "PENDING",
        "center": (78.09, 18.68),
        "grant_date": date(2022, 9, 15),
        "valid_from": date(2022, 9, 15),
        "valid_till": date(2042, 9, 14),
    },
    {
        "lease_id": "ML/TS/2017/00124",
        "mine_name": "Warangal Sand Mine Block-C",
        "mineral_type": "SAND",
        "leaseholder_name": "Telangana State Mineral Development Corporation",
        "leaseholder_pan": "AAACT9876H",
        "leaseholder_contact": "9711223344",
        "leaseholder_email": "warangal@tsmdc.gov.in",
        "district": "Hanamkonda",
        "mandal": "Warangal",
        "village": "Hasanparthy",
        "survey_number": "SV/067/2017",
        "area_hectares": 28.15,
        "status": "SUSPENDED",
        "center": (79.59, 18.00),
        "grant_date": date(2017, 3, 22),
        "valid_from": date(2017, 3, 22),
        "valid_till": date(2027, 3, 21),
    },
    {
        "lease_id": "ML/TS/2023/00890",
        "mine_name": "Adilabad Coal Block",
        "mineral_type": "COAL",
        "leaseholder_name": "Coal India Ltd",
        "leaseholder_pan": "AAACI6543J",
        "leaseholder_contact": "9600223344",
        "leaseholder_email": "adilabad@coalindia.in",
        "district": "Adilabad",
        "mandal": "Sirpur",
        "village": "Bhainsa",
        "survey_number": "SV/400/2023",
        "area_hectares": 221.50,
        "status": "ACTIVE",
        "center": (78.53, 19.67),
        "grant_date": date(2023, 2, 10),
        "valid_from": date(2023, 2, 10),
        "valid_till": date(2043, 2, 9),
    },
]

VEHICLES = [
    {"number": "TS 09 EA 1234", "type": "INSPECTION", "driver": "Ramesh Kumar", "district": "Bhadradri Kothagudem", "lat": 17.6, "lon": 80.5},
    {"number": "TS 07 BF 5678", "type": "ENFORCEMENT", "driver": "Suresh Reddy", "district": "Nalgonda", "lat": 16.88, "lon": 79.56},
    {"number": "TS 11 CD 9012", "type": "SURVEY", "driver": "Vijay Babu", "district": "Karimnagar", "lat": 18.44, "lon": 79.12},
    {"number": "TS 05 EG 3456", "type": "TRANSPORT", "driver": "Arun Sharma", "district": "Khammam", "lat": 17.68, "lon": 80.80},
    {"number": "TS 13 HK 7890", "type": "OFFICIAL", "driver": "Nagaraju Rao", "district": "Mancherial", "lat": 18.88, "lon": 79.40},
]


def make_lease_polygon(center_lon, center_lat, scale=0.005):
    """Make a simple quadrilateral polygon around a center point."""
    cx, cy = center_lon, center_lat
    import math
    n = 6
    coords = []
    for i in range(n):
        angle = 2 * math.pi * i / n
        rx = scale * (0.8 + 0.2 * random.random())
        ry = scale * 0.6 * (0.8 + 0.2 * random.random())
        coords.append((cx + rx * math.cos(angle), cy + ry * math.sin(angle)))
    coords.append(coords[0])  # close ring
    return coords


class Command(BaseCommand):
    help = "Seed demo data: leases, vehicles, alerts for MineGIS-TS showcase"

    def handle(self, *args, **options):
        self.stdout.write("🌱 Seeding demo data...")

        # Get or create admin user
        admin, _ = User.objects.get_or_create(
            username="admin",
            defaults={"is_staff": True, "is_superuser": True, "first_name": "System", "last_name": "Administrator"}
        )

        # 1 — Mining Leases
        created_leases = 0
        from apps.leases.models import MiningLease
        for data in TELANGANA_LEASES:
            if MiningLease.objects.filter(lease_id=data["lease_id"]).exists():
                continue
            coords = make_lease_polygon(data["center"][0], data["center"][1])
            ring = coords
            poly = Polygon(ring)
            multi = MultiPolygon(poly)
            centroid_pt = Point(data["center"][0], data["center"][1], srid=4326)
            lease = MiningLease.objects.create(
                lease_id=data["lease_id"],
                mine_name=data["mine_name"],
                mineral_type=data["mineral_type"],
                leaseholder_name=data["leaseholder_name"],
                leaseholder_pan=data["leaseholder_pan"],
                leaseholder_contact=data["leaseholder_contact"],
                leaseholder_email=data["leaseholder_email"],
                district=data["district"],
                mandal=data["mandal"],
                village=data["village"],
                survey_number=data["survey_number"],
                area_hectares=data["area_hectares"],
                status=data["status"],
                boundary=multi,
                centroid=centroid_pt,
                grant_date=data["grant_date"],
                commencement_date=data["grant_date"],
                valid_from=data["valid_from"],
                valid_till=data["valid_till"],
                royalty_due=random.uniform(50000, 2000000),
                created_by=admin,
            )
            created_leases += 1
            
            # --- Generate Approved Mine Plan (Inset Polygon) ---
            from apps.gis.models import ApprovedMinePlan, DGPSSurveyPoint, ETSSurveyPoint, SpatialLayer
            
            inset_coords = []
            for cx, cy in ring[:-1]:
                # Pull vertices 10% towards centroid
                ix = cx + (centroid_pt.x - cx) * 0.1
                iy = cy + (centroid_pt.y - cy) * 0.1
                inset_coords.append((ix, iy))
            inset_coords.append(inset_coords[0])
            
            ApprovedMinePlan.objects.create(
                plan_id=f"AMP/{data['lease_id'][-5:]}",
                lease=lease,
                boundary=MultiPolygon(Polygon(inset_coords)),
                approval_date=data["grant_date"],
                valid_till=data["valid_till"],
                approved_by="Director of Mines",
            )
            
            # --- Generate DGPS Points (On vertices) ---
            survey_date = date.today() - timedelta(days=random.randint(30, 365))
            for idx, (px, py) in enumerate(ring[:-1]):
                DGPSSurveyPoint.objects.create(
                    survey_id=f"DGPS/{data['lease_id'][-5:]}/P{idx+1}",
                    lease=lease,
                    location=Point(px, py, srid=4326),
                    accuracy_meters=random.uniform(0.1, 1.5),
                    survey_date=survey_date,
                    surveyor_name="Govt Authorized Surveyor",
                    elevation=random.uniform(150, 600)
                )

            # --- Generate ETS Points (Scattered inside) ---
            for idx in range(12):
                # Random point blending centroid and a vertex
                v = random.choice(ring[:-1])
                ratio = random.uniform(0.2, 0.8)
                ex = centroid_pt.x * ratio + v[0] * (1 - ratio)
                ey = centroid_pt.y * ratio + v[1] * (1 - ratio)
                
                ETSSurveyPoint.objects.create(
                    survey_id=f"ETS/{data['lease_id'][-5:]}/{idx+1}",
                    lease=lease,
                    location=Point(ex, ey, srid=4326),
                    accuracy_meters=random.uniform(0.01, 0.5),
                    survey_date=survey_date + timedelta(days=2),
                    surveyor_name="Internal Mine Surveyor",
                    elevation=random.uniform(140, 580)
                )

            # --- Generate Nearby Forest/Eco Zones (For 50% of leased) ---
            if random.choice([True, False]):
                # Distribute features to look geographically realistic (less overlapping blob)
                
                # Forest to the north-east (further away)
                fx = centroid_pt.x + random.uniform(0.015, 0.035)
                fy = centroid_pt.y + random.uniform(0.015, 0.035)
                f_poly = Polygon(make_lease_polygon(fx, fy, scale=0.01))
                SpatialLayer.objects.create(
                    layer_type="FOREST",
                    name=f"Reserve Forest near {data['mine_name']}",
                    geometry=f_poly,
                    source="Dept of Forestry",
                    last_updated=date.today()
                )
                
                # Eco zone buffering the forest EXACTLY (slightly larger concentric)
                e_poly = Polygon(make_lease_polygon(fx, fy, scale=0.012))
                SpatialLayer.objects.create(
                    layer_type="ECO",
                    name=f"Eco-Sensitive Buffer {data['mine_name']}",
                    geometry=e_poly,
                    source="Ministry of Environment",
                    last_updated=date.today()
                )

                # Water body (South west)
                wx = centroid_pt.x - random.uniform(0.01, 0.03)
                wy = centroid_pt.y - random.uniform(0.01, 0.03)
                w_poly = Polygon(make_lease_polygon(wx, wy, scale=0.004))
                SpatialLayer.objects.create(
                    layer_type="WATER",
                    name=f"Reservoir near {data['village']}",
                    geometry=w_poly,
                    source="Irrigation Dept",
                    last_updated=date.today()
                )

                # Transport road (Long Line crossing the landscape)
                from django.contrib.gis.geos import LineString
                road = LineString(
                    (centroid_pt.x - 0.04, centroid_pt.y + 0.03),
                    (centroid_pt.x - 0.01, centroid_pt.y + 0.005), # Intercept point
                    (centroid_pt.x + 0.03, centroid_pt.y - 0.03),
                    srid=4326
                )
                SpatialLayer.objects.create(
                    layer_type="TRANSPORT",
                    name=f"State Highway {random.randint(10, 99)}",
                    geometry=road,
                    source="Roads Dept",
                    last_updated=date.today()
                )

        self.stdout.write(f"  ✓ Created {created_leases} mining leases & associated spatial layers")

        # 2 — Vehicles
        created_vehs = 0
        from apps.vehicle_tracking.models import Vehicle
        for v in VEHICLES:
            if Vehicle.objects.filter(vehicle_number=v["number"]).exists():
                continue
            loc = Point(v["lon"], v["lat"], srid=4326) if v.get("lat") else None
            from django.utils import timezone
            Vehicle.objects.create(
                netradyne_device_id=f"ND-{v['number'].replace(' ', '-')}",
                vehicle_number=v["number"],
                vehicle_type=v["type"],
                driver_name=v["driver"],
                driver_license=f"TS{random.randint(100000,999999)}",
                assigned_district=v["district"],
                last_location=loc,
                last_seen=timezone.now() - timedelta(minutes=random.randint(1, 120)),
                current_speed_kmh=random.uniform(0, 80),
                current_heading=random.uniform(0, 360),
                is_online=random.choice([True, True, False]),
                engine_on=random.choice([True, True, False]),
            )
            created_vehs += 1
        self.stdout.write(f"  ✓ Created {created_vehs} vehicles ({Vehicle.objects.count()} total)")

        self.stdout.write(self.style.SUCCESS("✅ Demo data seeded successfully!"))
