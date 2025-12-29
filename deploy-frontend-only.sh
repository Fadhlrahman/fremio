#!/bin/bash

#############################################
# Fremio Frontend-Only Deployment Script
# Quick deploy for frontend changes only
#############################################

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
VPS_USER="root"
VPS_HOST="72.61.214.5"
FRONTEND_PATH="/var/www/fremio"

echo -e "${BLUE}🚀 Fremio Frontend-Only Deployment${NC}"
echo ""

# Build Frontend
echo -e "${BLUE}📦 Building frontend...${NC}"
cd my-app
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo -e "${GREEN}✅ Build complete!${NC}"
echo ""

# Deploy to VPS
echo -e "${BLUE}🌐 Deploying to VPS...${NC}"
cd ..
rsync -avz --delete my-app/dist/ ${VPS_USER}@${VPS_HOST}:${FRONTEND_PATH}/

echo ""
echo -e "${GREEN}✅ Frontend deployed successfully!${NC}"
echo -e "${YELLOW}🌍 Visit: https://fremio.id${NC}"
