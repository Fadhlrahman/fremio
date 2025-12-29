#!/bin/bash

#############################################
# Fremio Full Deployment Script
# Deploys frontend + backend to VPS Hostinger
#############################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
VPS_USER="root"
VPS_HOST="72.61.214.5"
BACKEND_PATH="/var/www/fremio-backend"
FRONTEND_PATH="/var/www/fremio"
RELEASE_PATH="/var/www/releases/fremio-launching"
BACKUP_DIR="/var/www/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════╗"
echo "║   FREMIO FULL DEPLOYMENT SCRIPT v2.0      ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Step 1: Build Frontend
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 Step 1/6: Building Frontend...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd my-app

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist

# Build
echo "⚙️  Running npm run build..."
npm run build

# Verify build
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Error: dist folder not found after build!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend build complete!${NC}"
echo ""

# Step 2: Copy dist to backend/public
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 Step 2/6: Preparing backend static files...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd ..
echo "🔄 Copying dist to backend/public..."
rm -rf backend/public/*
cp -r my-app/dist/* backend/public/

echo -e "${GREEN}✅ Backend public folder updated!${NC}"
echo ""

# Step 3: Create backup on VPS
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}💾 Step 3/6: Creating backup on VPS...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
    # Create backup directory if not exists
    mkdir -p /var/www/backups
    
    # Backup backend
    if [ -d "/var/www/fremio-backend" ]; then
        echo "📦 Backing up backend..."
        tar -czf /var/www/backups/backend-backup-$(date +%Y%m%d_%H%M%S).tar.gz \
            -C /var/www fremio-backend \
            --exclude='node_modules' \
            --exclude='*.log' \
            --exclude='uploads/*'
        echo "✅ Backend backup created"
    fi
    
    # Backup frontend
    if [ -d "/var/www/fremio" ]; then
        echo "📦 Backing up frontend..."
        tar -czf /var/www/backups/frontend-backup-$(date +%Y%m%d_%H%M%S).tar.gz \
            -C /var/www fremio
        echo "✅ Frontend backup created"
    fi
    
    # Keep only last 5 backups
    cd /var/www/backups
    ls -t backend-backup-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm
    ls -t frontend-backup-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm
    
    echo "✅ Backup complete!"
ENDSSH

echo -e "${GREEN}✅ Backup created successfully!${NC}"
echo ""

# Step 4: Deploy Frontend to VPS
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🌐 Step 4/6: Deploying Frontend to VPS...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "🚀 Syncing frontend files..."
rsync -avz --delete \
    --exclude='.DS_Store' \
    my-app/dist/ ${VPS_USER}@${VPS_HOST}:${FRONTEND_PATH}/

echo -e "${GREEN}✅ Frontend deployed successfully!${NC}"
echo ""

# Step 5: Deploy Backend to VPS
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Step 5/6: Deploying Backend to VPS...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "🚀 Syncing backend files..."
rsync -avz --delete \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='*.log' \
    --exclude='.git' \
    --exclude='uploads/temp/*' \
    backend/ ${VPS_USER}@${VPS_HOST}:${BACKEND_PATH}/

echo -e "${GREEN}✅ Backend files synced!${NC}"
echo ""

# Step 6: Install dependencies and restart backend
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}♻️  Step 6/6: Restarting Backend Server...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
    cd /var/www/fremio-backend
    
    # Install/update dependencies
    echo "📦 Installing dependencies..."
    npm install --production --no-audit
    
    # Restart PM2 process
    echo "♻️  Restarting fremio-api..."
    pm2 restart fremio-api
    
    # Wait a bit for process to start
    sleep 2
    
    # Show status
    echo ""
    echo "📊 Current PM2 Status:"
    pm2 list
    
    echo ""
    echo "📝 Recent logs:"
    pm2 logs fremio-api --lines 10 --nostream
ENDSSH

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📍 Deployment Information:${NC}"
echo -e "   Frontend URL: ${GREEN}https://fremio.id${NC}"
echo -e "   Backend API:  ${GREEN}https://api.fremio.id${NC}"
echo -e "   Deployed at:  ${GREEN}${TIMESTAMP}${NC}"
echo ""
echo -e "${YELLOW}📊 Useful Commands:${NC}"
echo -e "   View logs:    ${BLUE}ssh ${VPS_USER}@${VPS_HOST} 'pm2 logs fremio-api'${NC}"
echo -e "   View status:  ${BLUE}ssh ${VPS_USER}@${VPS_HOST} 'pm2 status'${NC}"
echo -e "   Restart:      ${BLUE}ssh ${VPS_USER}@${VPS_HOST} 'pm2 restart fremio-api'${NC}"
echo ""
