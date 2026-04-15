#!/bin/bash
# ============================================================
# MineGIS-TS — Production Deploy Script
# Run from /opt/minegis-ts on the droplet for updates
# Usage: bash scripts/deploy.sh
# ============================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info() { echo -e "${GREEN}▶ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }

DEPLOY_DIR="/opt/minegis-ts"
cd "$DEPLOY_DIR"

echo "==========================================="
echo "   MineGIS-TS Production Deployment        "
echo "   $(date '+%Y-%m-%d %H:%M:%S IST')        "
echo "==========================================="

# ── 1. Pull Latest Code ──────────────────────────────────────
info "Pulling latest code from git..."
git pull origin main
echo -e "${GREEN}✔ Code updated${NC}"

# ── 2. Build Frontend ────────────────────────────────────────
info "Building frontend production bundle..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    build --no-cache frontend
echo -e "${GREEN}✔ Frontend built${NC}"

# ── 3. Copy frontend dist to nginx volume ────────────────────
info "Publishing frontend assets..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    run --rm frontend
echo -e "${GREEN}✔ Frontend assets published${NC}"

# ── 4. Pull & rebuild backend if requirements changed ────────
info "Rebuilding backend if needed..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    build backend
echo -e "${GREEN}✔ Backend image ready${NC}"

# ── 5. Rolling restart (zero downtime for backend) ──────────
info "Restarting services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    up -d --no-deps backend celery_worker celery_beat nginx
echo -e "${GREEN}✔ Services restarted${NC}"

# ── 6. Run Migrations ────────────────────────────────────────
info "Running database migrations..."
docker exec minegis_backend python manage.py migrate --noinput
echo -e "${GREEN}✔ Migrations complete${NC}"

# ── 7. Collect Static Files ──────────────────────────────────
info "Collecting Django static files..."
docker exec minegis_backend python manage.py collectstatic --noinput --clear
echo -e "${GREEN}✔ Static files collected${NC}"

# ── 8. Reload Nginx ──────────────────────────────────────────
info "Reloading nginx..."
docker kill -s HUP minegis_nginx
echo -e "${GREEN}✔ Nginx reloaded${NC}"

# ── 9. Health Check ─────────────────────────────────────────
info "Running health check..."
sleep 3
DOMAIN=$(grep '^DOMAIN=' .env | cut -d= -f2)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}/api/auth/login/" -X OPTIONS || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "405" ]; then
    echo -e "${GREEN}✔ Backend healthy (HTTP ${HTTP_CODE})${NC}"
else
    warn "Backend returned HTTP ${HTTP_CODE} — check logs: docker compose logs backend"
fi

echo ""
echo -e "${GREEN}==========================================="
echo -e "✔ Deployment complete!"
echo -e "  https://${DOMAIN}"
echo "==========================================="
