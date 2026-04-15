#!/bin/bash
# ============================================================
# MineGIS-TS — SSL Certificate Setup (Let's Encrypt)
# Run AFTER setup_droplet.sh and DNS has propagated
# Usage: bash scripts/setup_ssl.sh
# ============================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info() { echo -e "${GREEN}▶ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }

# Load domain and email from .env
if [ -f /opt/minegis-ts/.env ]; then
    source /opt/minegis-ts/.env
else
    read -p "Enter your domain: "    DOMAIN
    read -p "Enter your SSL email: " SSL_EMAIL
fi

info "Installing Certbot..."
apt-get install -y certbot

# Temporarily stop nginx so port 80 is free for the ACME challenge
info "Stopping nginx to obtain certificate..."
docker stop minegis_nginx 2>/dev/null || true

info "Requesting Let's Encrypt certificate for ${DOMAIN}..."
certbot certonly \
    --standalone \
    --agree-tos \
    --non-interactive \
    --email "${SSL_EMAIL}" \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}"

# Restart nginx with SSL
info "Restarting nginx with SSL..."
docker start minegis_nginx

# Set up auto-renewal cron
info "Setting up auto-renewal..."
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && docker kill -s HUP minegis_nginx") | crontab -

echo ""
echo -e "${GREEN}==========================================="
echo -e "✔ SSL certificate installed!"
echo -e "  https://${DOMAIN}"
echo -e "==========================================${NC}"
echo ""
warn "Auto-renewal cron set for 3:00 AM daily."
warn "Test renewal with: certbot renew --dry-run"
