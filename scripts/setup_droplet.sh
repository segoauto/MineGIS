#!/bin/bash
# ============================================================
# MineGIS-TS — DigitalOcean Droplet Bootstrap Script
# Run once on a fresh Ubuntu 22.04 droplet as root
# Usage: bash scripts/setup_droplet.sh
# ============================================================
set -e

# ── Colors ──────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}▶ $1${NC}"; }
warn()  { echo -e "${YELLOW}⚠ $1${NC}"; }
error() { echo -e "${RED}✖ $1${NC}"; exit 1; }

echo "==========================================="
echo "   MineGIS-TS DigitalOcean Setup Script   "
echo "==========================================="

# ── 1. Swap Space (essential for GeoServer) ─────────────────
info "Setting up 8GB swap space..."
if [ ! -f /swapfile ]; then
    fallocate -l 8G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    sysctl -p
    echo -e "${GREEN}✔ Swap configured${NC}"
else
    echo -e "${GREEN}✔ Swap already exists${NC}"
fi

# ── 2. System packages ───────────────────────────────────────
info "Installing system packages..."
apt-get update -y -q
apt-get install -y -q git curl wget jq ufw fail2ban unzip

# ── 3. Docker ────────────────────────────────────────────────
info "Installing Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker $USER
    echo -e "${GREEN}✔ Docker installed${NC}"
else
    echo -e "${GREEN}✔ Docker already installed: $(docker --version)${NC}"
fi

# ── 4. UFW Firewall ──────────────────────────────────────────
info "Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
echo -e "${GREEN}✔ Firewall configured${NC}"

# ── 5. Fail2Ban (SSH brute-force protection) ─────────────────
info "Configuring Fail2Ban..."
systemctl enable fail2ban --now
echo -e "${GREEN}✔ Fail2Ban active${NC}"

# ── 6. Clone Repository ──────────────────────────────────────
info "Cloning MineGIS-TS repository..."
mkdir -p /opt
cd /opt

if [ ! -d "minegis-ts" ]; then
    echo ""
    read -p "Enter your GitHub repo URL (e.g. https://github.com/yourname/minegis-ts.git): " REPO_URL
    git clone "$REPO_URL" minegis-ts
    echo -e "${GREEN}✔ Repository cloned${NC}"
else
    echo -e "${GREEN}✔ Repository already exists, pulling latest...${NC}"
    cd minegis-ts && git pull origin main && cd ..
fi

cd /opt/minegis-ts

# ── 7. Environment Configuration ─────────────────────────────
info "Setting up production .env..."
if [ ! -f ".env" ]; then
    cp .env.example .env

    # Generate secure random values
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(50))")
    DB_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(20))")
    GS_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(16))")
    SUPERSET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

    echo ""
    read -p "Enter your domain name (e.g. minegis.yourdomain.com): " DOMAIN
    read -p "Enter SSL email for Let's Encrypt: " SSL_EMAIL

    # Patch .env with production values
    sed -i "s|DJANGO_SECRET_KEY=.*|DJANGO_SECRET_KEY=${SECRET_KEY}|" .env
    sed -i "s|DJANGO_DEBUG=.*|DJANGO_DEBUG=False|"                    .env
    sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=${DB_PASSWORD}|"             .env
    sed -i "s|GEOSERVER_ADMIN_PASSWORD=.*|GEOSERVER_ADMIN_PASSWORD=${GS_PASSWORD}|" .env
    sed -i "s|SUPERSET_SECRET_KEY=.*|SUPERSET_SECRET_KEY=${SUPERSET_KEY}|" .env
    sed -i "s|VITE_API_URL=.*|VITE_API_URL=/api|"                     .env
    sed -i "s|VITE_WS_URL=.*|VITE_WS_URL=/ws|"                       .env
    sed -i "s|VITE_GEOSERVER_URL=.*|VITE_GEOSERVER_URL=/geoserver|"   .env

    # Add domain + allowed hosts
    echo "" >> .env
    echo "DOMAIN=${DOMAIN}" >> .env
    echo "SSL_EMAIL=${SSL_EMAIL}" >> .env
    echo "DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,backend,${DOMAIN},www.${DOMAIN}" >> .env

    # Patch nginx production config with domain
    sed -i "s|YOUR_DOMAIN|${DOMAIN}|g" nginx/nginx.prod.conf

    echo -e "${GREEN}✔ .env created with secure passwords${NC}"
    warn "IMPORTANT: Save these credentials:"
    echo "  DB Password:         ${DB_PASSWORD}"
    echo "  GeoServer Password:  ${GS_PASSWORD}"
else
    echo -e "${GREEN}✔ .env already exists${NC}"
fi

# ── 8. Start Application ─────────────────────────────────────
info "Launching Docker containers (first boot takes ~3 min)..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo ""
echo "==========================================="
echo -e "${GREEN}✔ Server bootstrap complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Wait ~3 min for services to start"
echo "  2. Run SSL setup: bash scripts/setup_ssl.sh"
echo "  3. Access at: https://\$(grep DOMAIN .env | cut -d= -f2)"
echo "==========================================="
