#!/bin/bash
set -e

echo "==========================================="
echo " MineGIS-TS DigitalOcean Setup Script "
echo "==========================================="

# 1. Setup 4GB Swap Space
echo "▶ Setting up 4GB Swap Space..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✔ Swap space configured."
else
    echo "✔ Swap space already exists."
fi

# 2. Install prerequisites
echo "▶ Installing prerequisites..."
sudo apt-get update -y
sudo apt-get install -y git curl wget jq

# 3. Install Docker & Docker Compose
echo "▶ Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    echo "✔ Docker installed."
else
    echo "✔ Docker already installed."
fi

# 4. Clone repository
echo "▶ Cloning MineGIS repository..."
cd /opt
if [ ! -d "minegis-ts" ]; then
    # Note: If your repo is private, this will prompt you for your GitHub Username and a Personal Access Token
    sudo git clone https://github.com/veenavikas/minegis-ts.git
    echo "✔ Repository cloned."
else
    echo "✔ Repository already exists. Pulling latest..."
    cd minegis-ts
    sudo git pull origin main
    cd ..
fi

cd minegis-ts

# 5. Environment variables
echo "▶ Setting up environment variables..."
if [ ! -f ".env" ]; then
    sudo cp .env.example .env
    
    # Generate random secure passwords for the DB and GeoServer
    SECRET_KEY=$(head -c 32 /dev/urandom | base64)
    DB_PASSWORD=$(head -c 16 /dev/urandom | base64 | tr -d '+/')
    GS_PASSWORD=$(head -c 16 /dev/urandom | base64 | tr -d '+/')
    
    sudo sed -i "s/DJANGO_SECRET_KEY=.*/DJANGO_SECRET_KEY=${SECRET_KEY}/" .env
    sudo sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD}/" .env
    sudo sed -i "s/GEOSERVER_ADMIN_PASSWORD=.*/GEOSERVER_ADMIN_PASSWORD=${GS_PASSWORD}/" .env
    
    echo "✔ secure .env file created."
else
    echo "✔ .env already exists."
fi

# 6. Launch the App
echo "▶ Starting Docker containers..."
sudo docker compose up -d

echo "==========================================="
echo "✔ Deployment Complete!"
echo "It may take 1-2 minutes for GeoServer and PostgreSQL to fully boot up."
echo "You can check the progress by running: cd /opt/minegis-ts && sudo docker compose logs -f backend"
echo "==========================================="
