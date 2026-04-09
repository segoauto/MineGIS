# MineGIS-TS — Web-GIS Mining Governance Platform
## Government of Telangana, Department of Mines & Geology

<div align="center">
  <img src="https://img.shields.io/badge/Django-5.0.6-green?logo=django" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql" />
  <img src="https://img.shields.io/badge/PostGIS-3.4-blue" />
  <img src="https://img.shields.io/badge/React-18.3-blue?logo=react" />
  <img src="https://img.shields.io/badge/OpenLayers-9.2-blue" />
  <img src="https://img.shields.io/badge/GeoServer-2.25.1-orange" />
  <img src="https://img.shields.io/badge/Docker-Compose-blue?logo=docker" />
</div>

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend (React 18 + OpenLayers 9 + Tailwind CSS)         :3000        │
│  → MapView (OL WMS/WFS) + LayerPanel + LeaseInfoPanel                   │
│  → VehicleTrackingPanel (live WebSocket) + SearchBar                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Nginx Reverse Proxy                                        :80          │
│  /api/ → Django   /ws/ → Channels   /geoserver/ → GeoServer            │
├─────────────────────────────────────────────────────────────────────────┤
│  Django 5 (Daphne/ASGI)         │  GeoServer 2.25.1                     │
│  + DRF + Channels + SimpleJWT   │  WMS/WFS (PostGIS store)              │
│  + GeoDjango                    │  SLD styles (status colors)           │
├─────────────────────────────────────────────────────────────────────────┤
│  Celery Worker + Celery Beat    │  Redis 7 (channels + celery)          │
│  Vehicle sync every 30s         │                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL 16 + PostGIS 3.4                                :5432        │
│  Mining leases (MultiPolygon) + Vehicles + Spatial layers               │
└─────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Docker Desktop ≥ 24 (6 GB RAM minimum allocated)
- Docker Compose ≥ 2.22
- Git

### 1. Clone and configure

```bash
git clone <repo>
cd minegis-ts
cp .env.example .env
# Edit .env — at minimum set DB_PASSWORD and SECRET_KEY
```

### 2. Start the full stack

```bash
docker compose up -d
```

All 7 services will start. On first boot, the backend entrypoint will:
1. Wait for PostgreSQL + Redis to be healthy
2. Run Django migrations
3. Seed 15 mining leases, 8 vehicles, spatial layers, and alerts
4. Configure GeoServer workspace, PostGIS store, and layers
5. Set up Celery Beat periodic tasks

### 3. Access the application

| Service | URL | Credentials |
|---------|-----|-------------|
| **MineGIS-TS Frontend** | http://localhost | `admin@minegis.ts.gov.in` / `MineGIS@2026` |
| **GeoServer Admin** | http://localhost/geoserver/web | `admin` / `geoserver` |
| **Django Admin** | http://localhost/admin | `admin@minegis.ts.gov.in` / `MineGIS@2026` |
| **API Docs (Swagger)** | http://localhost/api/docs/ | (JWT required) |

### 4. View logs

```bash
docker compose logs -f backend    # Django + Daphne
docker compose logs -f celery_worker  # Vehicle sync
docker compose logs -f geoserver  # GeoServer
```

---

## Services

| Container | Image | Purpose |
|-----------|-------|---------|
| `db` | `postgis/postgis:16-3.4` | Spatial database |
| `redis` | `redis:7-alpine` | WebSocket channels + Celery broker |
| `geoserver` | Custom (GeoServer 2.25.1) | WMS/WFS tile server |
| `backend` | Custom (Django 5) | REST API + WebSocket server |
| `celery_worker` | Same as backend | Background tasks |
| `celery_beat` | Same as backend | Periodic task scheduler |
| `frontend` | Node 20 Alpine | React/Vite dev server |
| `nginx` | Nginx 1.25 | Reverse proxy |

---

## API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login/` | JWT login |
| `POST` | `/api/auth/refresh/` | Refresh token |
| `POST` | `/api/auth/logout/` | Logout + blacklist |
| `GET`  | `/api/auth/me/` | Current user profile |

### Mining Leases
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/leases/` | List with filters |
| `GET` | `/api/leases/{id}/` | Lease details |
| `GET` | `/api/leases/{id}/geojson/` | GeoJSON boundary |
| `GET` | `/api/leases/geojson/all/` | All lease geometries |
| `GET` | `/api/leases/{id}/conflicts/` | PostGIS ST_Intersects |
| `GET` | `/api/leases/{id}/buffer/?radius=500` | PostGIS ST_Buffer |
| `GET` | `/api/leases/search/?q=string` | Full-text search |

### Vehicle Tracking
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/vehicles/` | All vehicles |
| `GET` | `/api/vehicles/live/` | GeoJSON current positions |
| `GET` | `/api/vehicles/{id}/history/?from=&to=` | Trip replay |
| `GET` | `/api/vehicles/{id}/alerts/` | Vehicle alerts |
| `GET` | `/api/vehicles/alerts/` | All alerts |
| `POST` | `/api/vehicles/alerts/{id}/resolve/` | Resolve alert |
| `POST` | `/api/vehicles/netradyne/webhook/` | Netradyne events |

### GIS / Spatial
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/gis/layers/` | Spatial layer listing |
| `GET` | `/api/gis/dgps-points/` | DGPS survey points |
| `GET` | `/api/gis/compliance-report/{lease_id}/` | Compliance analysis |

### WebSocket
```
ws://localhost/ws/vehicles/?token=<JWT_ACCESS_TOKEN>
```
Receives: `VEHICLE_UPDATE` (every 30s) and `VEHICLE_ALERT` (real-time)

---

## GeoServer Layers

| Layer | Type | Style |
|-------|------|-------|
| `minegis_ts:mining_leases` | WMS Polygon | Color-coded by status |
| `minegis_ts:spatial_layers` | WMS Polygon | Forest/Water/Eco SLD styles |
| `minegis_ts:dgps_survey_points` | WMS Point | Red dot markers |
| `minegis_ts:vehicle_locations` | WMS Point (SQL View) | Green=online, Grey=offline |

---

## Netradyne Integration

Set environment variables:
```
NETRADYNE_MOCK_MODE=false          # Switch from mock to real API
NETRADYNE_API_KEY=your_key_here    # Production key
NETRADYNE_API_URL=https://api.netradyne.com
NETRADYNE_WEBHOOK_SECRET=secret    # HMAC webhook validation
```

The mock client generates realistic vehicle movements around 8 Telangana mine site anchors.

---

## Environment Variables

See `.env.example` for the complete list. Critical settings:

```bash
SECRET_KEY=<50+ char random key>
DB_PASSWORD=<strong password>
GEOSERVER_ADMIN_PASSWORD=<strong password>
NETRADYNE_MOCK_MODE=true        # false for production
VEHICLE_SYNC_INTERVAL_SECONDS=30
```

---

## Production Deployment

1. Set `DJANGO_SETTINGS_MODULE=config.settings.production`
2. Generate strong `SECRET_KEY`
3. Set `ALLOWED_HOSTS` to your domain
4. Configure SSL (Let's Encrypt recommended) in Nginx
5. Use managed PostgreSQL (AWS RDS / Azure Database for PostgreSQL)
6. Set `NETRADYNE_MOCK_MODE=false` with real API key
7. See `k8s/` for Kubernetes manifests

---

## Project Structure

```
minegis-ts/
├── backend/
│   ├── apps/
│   │   ├── authentication/    # JWT auth, UserProfile
│   │   ├── leases/            # MiningLease, PostGIS spatial ops
│   │   ├── gis/               # SpatialLayer, DGPS, GeoServer config
│   │   ├── vehicle_tracking/  # Vehicle, Netradyne, WebSocket
│   │   └── audit/             # AuditLog middleware
│   ├── config/                # Django settings (base/dev/prod)
│   └── scripts/               # entrypoint.sh
├── frontend/
│   └── src/
│       ├── api/               # Axios API modules
│       ├── components/
│       │   ├── map/           # MapView, LayerPanel
│       │   ├── panels/        # LeaseInfoPanel
│       │   ├── vehicle/       # VehicleTrackingPanel
│       │   └── ui/            # TopBar, SearchBar, SpatialToolbar
│       ├── hooks/             # useMap, useWebSocket
│       ├── pages/             # LoginPage
│       ├── store/             # Zustand (MapStore + AuthStore)
│       └── types/             # TypeScript domain types
├── geoserver/                 # GeoServer Dockerfile
├── nginx/                     # Nginx config + Dockerfile
├── k8s/                       # Kubernetes manifests
├── docker-compose.yml
└── .env.example
```

---

*Built for the Government of Telangana, Department of Mines & Geology.*
*MineGIS-TS © 2026 — Production Grade Web-GIS Mining Governance Platform*
