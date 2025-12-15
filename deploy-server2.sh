#!/bin/bash

# ================================================
# FREMIO DEPLOYMENT TO SECOND SERVER
# Server: 72.61.210.203
# ================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Server Configuration
SERVER_HOST="72.61.210.203"
SERVER_USER="root"
SERVER_PORT="22"
BACKEND_DIR="/var/www/fremio-backend"
FRONTEND_DIR="/var/www/fremio-frontend"

# Local Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR_LOCAL="$SCRIPT_DIR/my-app"
BACKEND_DIR_LOCAL="$SCRIPT_DIR/backend"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}🚀 Deploying Fremio to 72.61.210.203${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# ================================================
# 1. BUILD FRONTEND
# ================================================
echo -e "${YELLOW}[1/5] Building frontend...${NC}"
cd "$FRONTEND_DIR_LOCAL"

if [ ! -d "node_modules" ]; then
    echo "   Installing frontend dependencies..."
    npm install --legacy-peer-deps
fi

echo "   Building production bundle..."
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

BUILD_SIZE=$(du -sh dist | cut -f1)
echo -e "${GREEN}✅ Frontend built successfully ($BUILD_SIZE)${NC}"
echo ""

cd "$SCRIPT_DIR"

# ================================================
# 2. PREPARE BACKEND
# ================================================
echo -e "${YELLOW}[2/5] Preparing backend...${NC}"
cd "$BACKEND_DIR_LOCAL"

if [ ! -d "node_modules" ]; then
    echo "   Installing backend dependencies..."
    npm install
fi

echo -e "${GREEN}✅ Backend prepared${NC}"
echo ""

cd "$SCRIPT_DIR"

# ================================================
# 3. DEPLOY FRONTEND
# ================================================
echo -e "${YELLOW}[3/5] Deploying frontend to server...${NC}"

# Create remote directory if not exists
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "mkdir -p $FRONTEND_DIR"

# Sync frontend files
rsync -avz --delete \
    --exclude='node_modules' \
    --exclude='.env*' \
    --exclude='src' \
    --exclude='public' \
    --exclude='.git' \
    -e "ssh -p $SERVER_PORT" \
    "$FRONTEND_DIR_LOCAL/dist/" \
    "$SERVER_USER@$SERVER_HOST:$FRONTEND_DIR/"

echo -e "${GREEN}✅ Frontend deployed${NC}"
echo ""

# ================================================
# 4. DEPLOY BACKEND
# ================================================
echo -e "${YELLOW}[4/5] Deploying backend to server...${NC}"

# Create remote directories
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "mkdir -p $BACKEND_DIR/logs $BACKEND_DIR/uploads"

# Sync backend files
rsync -avz \
    --exclude='node_modules' \
    --exclude='logs/*' \
    --exclude='uploads/*' \
    --exclude='.env.local' \
    --exclude='*.log' \
    -e "ssh -p $SERVER_PORT" \
    "$BACKEND_DIR_LOCAL/" \
    "$SERVER_USER@$SERVER_HOST:$BACKEND_DIR/"

# Install production dependencies on server
echo "   Installing dependencies on server..."
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "cd $BACKEND_DIR && npm install --production"

echo -e "${GREEN}✅ Backend deployed${NC}"
echo ""

# ================================================
# 5. RESTART SERVICES
# ================================================
echo -e "${YELLOW}[5/5] Restarting services...${NC}"

# Restart PM2 backend
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "cd $BACKEND_DIR && pm2 restart fremio-api || pm2 start server.js --name fremio-api"

# Reload nginx
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "systemctl reload nginx"

echo -e "${GREEN}✅ Services restarted${NC}"
echo ""

# ================================================
# 6. CHECK STATUS
# ================================================
echo -e "${YELLOW}Checking deployment status...${NC}"

# Check PM2 status
echo ""
echo -e "${BLUE}PM2 Status:${NC}"
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "pm2 list | grep fremio"

# Check nginx status
echo ""
echo -e "${BLUE}Nginx Status:${NC}"
ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "systemctl status nginx | grep Active"

# ================================================
# 7. SUMMARY
# ================================================
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "Server: ${BLUE}$SERVER_HOST${NC}"
echo -e "Backend: ${BLUE}$BACKEND_DIR${NC}"
echo -e "Frontend: ${BLUE}$FRONTEND_DIR${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Check logs: ssh root@$SERVER_HOST \"pm2 logs fremio-api --lines 20\""
echo "2. Verify website is running"
echo "3. Test API endpoints"
echo ""
echo -e "${GREEN}✅ Done!${NC}"
