#!/bin/bash
set -e

echo "========================================"
echo " MineGIS-TS Backend Startup"
echo "========================================"

# ─── Wait for PostgreSQL ───────────────────────────────────
echo "⏳ Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
until nc -z "${DB_HOST:-db}" "${DB_PORT:-5432}"; do
  sleep 1
done
echo "✅ PostgreSQL is ready"

# ─── Wait for Redis ─────────────────────────────────────────
echo "⏳ Waiting for Redis..."
until nc -z "${REDIS_HOST:-redis}" 6379; do
  sleep 1
done
echo "✅ Redis is ready"

# ─── Make migrations for custom apps (idempotent) ───────────
echo "🔄 Making migrations for custom apps..."
python manage.py makemigrations authentication leases gis vehicle_tracking audit notifications --noinput 2>/dev/null || true
echo "✅ Makemigrations done"

# ─── Run Django migrations ──────────────────────────────────
echo "🔄 Running database migrations..."
python manage.py migrate --noinput
echo "✅ Migrations complete"

# ─── Create superuser if not exists ─────────────────────────
echo "🔄 Creating admin user if not exists..."
python manage.py shell -c "
from apps.authentication.models import User
if not User.objects.filter(email='admin@minegis.ts.gov.in').exists():
    u = User.objects.create_superuser(
        email='admin@minegis.ts.gov.in',
        password='MineGIS@2026',
        first_name='Admin',
        last_name='MineGIS'
    )
    u.username = 'admin@minegis.ts.gov.in'
    u.role = 'R01_SUPER_ADMIN'
    u.is_verified = True
    u.save()
    print('Admin user created: ' + u.email)
else:
    u = User.objects.get(email='admin@minegis.ts.gov.in')
    u.username = 'admin@minegis.ts.gov.in'
    u.set_password('MineGIS@2026')
    u.role = 'R01_SUPER_ADMIN'
    u.is_verified = True
    u.is_active = True
    u.is_staff = True
    u.is_superuser = True
    u.save()
    print('Admin user verified: ' + u.email)
" || true

# ─── Run seed data ──────────────────────────────────────────
echo "🔄 Seeding Telangana mining data..."
python manage.py seed_data || echo "⚠️  Seed data failed (non-fatal — check logs)"
echo "✅ Seed data step done"

# ─── Setup Celery Beat schedule ─────────────────────────────
echo "🔄 Setting up periodic task schedule..."
python manage.py setup_periodic_tasks || echo "⚠️  Periodic tasks setup failed (non-fatal)"
echo "✅ Periodic tasks step done"

# ─── Configure GeoServer ───────────────────────────────────
echo "🔄 Configuring GeoServer workspace and layers..."
python manage.py configure_geoserver || echo "⚠️  GeoServer config failed (will retry on next start)"
echo "✅ GeoServer configuration attempted"

# ─── Collect static files ───────────────────────────────────
echo "🔄 Collecting static files..."
python manage.py collectstatic --noinput --clear 2>/dev/null || true
echo "✅ Static files collected"

# ─── Start Daphne ASGI server ──────────────────────────────
echo "🚀 Starting Daphne ASGI server..."
exec daphne -b 0.0.0.0 -p 8000 config.asgi:application
