#!/bin/bash
# ============================================
# FREMIO VPS SETUP SCRIPT
# For Ubuntu 22.04+ / Debian 11+
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  🚀 FREMIO VPS SETUP SCRIPT                    ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# Install essential tools
echo -e "${YELLOW}🔧 Installing essential tools...${NC}"
apt install -y curl wget git unzip htop

# Install Node.js 20
echo -e "${YELLOW}📦 Installing Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
echo -e "${GREEN}✅ Node.js $(node -v) installed${NC}"
echo -e "${GREEN}✅ NPM $(npm -v) installed${NC}"

# Install PostgreSQL
echo -e "${YELLOW}📦 Installing PostgreSQL...${NC}"
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
echo -e "${GREEN}✅ PostgreSQL installed${NC}"

# Install Nginx
echo -e "${YELLOW}📦 Installing Nginx...${NC}"
apt install -y nginx
systemctl start nginx
systemctl enable nginx
echo -e "${GREEN}✅ Nginx installed${NC}"

# Install PM2
echo -e "${YELLOW}📦 Installing PM2...${NC}"
npm install -g pm2
echo -e "${GREEN}✅ PM2 installed${NC}"

# Install Certbot for SSL
echo -e "${YELLOW}📦 Installing Certbot...${NC}"
apt install -y certbot python3-certbot-nginx
echo -e "${GREEN}✅ Certbot installed${NC}"

# Create fremio user
echo -e "${YELLOW}👤 Creating fremio user...${NC}"
if ! id "fremio" &>/dev/null; then
    useradd -m -s /bin/bash fremio
    echo -e "${GREEN}✅ User 'fremio' created${NC}"
else
    echo -e "${YELLOW}⚠️ User 'fremio' already exists${NC}"
fi

# Create directories
echo -e "${YELLOW}📁 Creating directories...${NC}"
mkdir -p /var/www/fremio/frontend
mkdir -p /var/www/fremio/backend
mkdir -p /var/www/fremio/backend/uploads/frames
mkdir -p /var/www/fremio/backend/uploads/thumbnails
mkdir -p /var/www/fremio/backend/logs
chown -R fremio:fremio /var/www/fremio
echo -e "${GREEN}✅ Directories created${NC}"

# Setup PostgreSQL
echo -e "${YELLOW}🗄️ Setting up PostgreSQL...${NC}"
DB_PASSWORD=$(openssl rand -base64 24)

sudo -u postgres psql << EOF
CREATE USER fremio_user WITH PASSWORD '${DB_PASSWORD}';
CREATE DATABASE fremio OWNER fremio_user;
GRANT ALL PRIVILEGES ON DATABASE fremio TO fremio_user;
\c fremio
GRANT ALL ON SCHEMA public TO fremio_user;
EOF

echo -e "${GREEN}✅ PostgreSQL database created${NC}"
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  DATABASE CREDENTIALS (SAVE THESE!)            ${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
echo -e "  Database: fremio"
echo -e "  User: fremio_user"
echo -e "  Password: ${DB_PASSWORD}"
echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
echo ""

# Save credentials to file
echo "DB_HOST=localhost" > /var/www/fremio/.db_credentials
echo "DB_PORT=5432" >> /var/www/fremio/.db_credentials
echo "DB_NAME=fremio" >> /var/www/fremio/.db_credentials
echo "DB_USER=fremio_user" >> /var/www/fremio/.db_credentials
echo "DB_PASSWORD=${DB_PASSWORD}" >> /var/www/fremio/.db_credentials
chmod 600 /var/www/fremio/.db_credentials
chown fremio:fremio /var/www/fremio/.db_credentials

# Configure firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
apt install -y ufw
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
echo -e "${GREEN}✅ Firewall configured${NC}"

# Setup PM2 startup
echo -e "${YELLOW}⚙️ Setting up PM2 startup...${NC}"
pm2 startup systemd -u fremio --hp /home/fremio
echo -e "${GREEN}✅ PM2 startup configured${NC}"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ SETUP COMPLETE!                            ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Upload your code to /var/www/fremio/"
echo "   scp -r fremio/* root@YOUR_VPS_IP:/var/www/fremio/"
echo ""
echo "2. Run database schema:"
echo "   sudo -u fremio psql -U fremio_user -d fremio -f /var/www/fremio/database/schema.sql"
echo ""
echo "3. Configure backend .env:"
echo "   nano /var/www/fremio/backend/.env"
echo "   (Copy values from /var/www/fremio/.db_credentials)"
echo ""
echo "4. Install backend dependencies:"
echo "   cd /var/www/fremio/backend && npm install"
echo ""
echo "5. Build frontend:"
echo "   cd /var/www/fremio/my-app && npm install && npm run build"
echo "   cp -r dist/* /var/www/fremio/frontend/"
echo ""
echo "6. Start backend with PM2:"
echo "   cd /var/www/fremio/backend"
echo "   pm2 start ecosystem.config.js --env production"
echo "   pm2 save"
echo ""
echo "7. Setup SSL (replace YOUR_DOMAIN):"
echo "   certbot --nginx -d YOUR_DOMAIN -d www.YOUR_DOMAIN"
echo ""
echo "8. Copy and configure Nginx:"
echo "   cp /var/www/fremio/deploy/nginx.conf /etc/nginx/sites-available/fremio"
echo "   ln -s /etc/nginx/sites-available/fremio /etc/nginx/sites-enabled/"
echo "   nginx -t && systemctl restart nginx"
echo ""
echo -e "${GREEN}Database credentials saved to: /var/www/fremio/.db_credentials${NC}"
echo ""
