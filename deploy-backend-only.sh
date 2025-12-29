#!/bin/bash

#############################################
# Fremio Backend-Only Deployment Script
# Quick deploy for backend changes only
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

# Resolve the actual backend directory from PM2 (prevents deploying to the wrong folder).
# Fallbacks are kept for older deployments.
BACKEND_PATH=""

echo -e "${BLUE}🔎 Detecting backend path from PM2...${NC}"
BACKEND_PATH=$(ssh ${VPS_USER}@${VPS_HOST} 'node -e "const {execSync}=require(\"child_process\"); const list=JSON.parse(execSync(\"pm2 jlist\",{encoding:\"utf8\"})||\"[]\"); const p=list.find(x=>x.name===\"fremio-api\"); const cwd=p?.pm2_env?.pm_cwd||\"\"; console.log(cwd);"' | tr -d '\r')

if [ -z "$BACKEND_PATH" ]; then
    echo -e "${YELLOW}⚠️  Could not detect PM2 cwd. Falling back to /var/www/fremio-backend${NC}"
    BACKEND_PATH="/var/www/fremio-backend"
fi

echo -e "${GREEN}✅ Using backend path: ${BACKEND_PATH}${NC}"

echo -e "${BLUE}🚀 Fremio Backend-Only Deployment${NC}"
echo ""

# Sync backend files
echo -e "${BLUE}🔧 Syncing backend files...${NC}"
rsync -avz --delete \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='*.log' \
    --exclude='.git' \
    --exclude='uploads/temp/*' \
    --exclude='public' \
    backend/ ${VPS_USER}@${VPS_HOST}:${BACKEND_PATH}/

echo -e "${GREEN}✅ Files synced!${NC}"
echo ""

# Restart backend
echo -e "${BLUE}♻️  Restarting backend...${NC}"
ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
        # Restart from the same folder PM2 runs in
        BACKEND_CWD=$(node -e "const {execSync}=require('child_process'); const list=JSON.parse(execSync('pm2 jlist',{encoding:'utf8'})||'[]'); const p=list.find(x=>x.name==='fremio-api'); console.log(p?.pm2_env?.pm_cwd||'');")
        if [ -z "$BACKEND_CWD" ]; then
            BACKEND_CWD="/var/www/fremio-backend"
        fi
        cd "$BACKEND_CWD"
    npm install --production --no-audit
    pm2 restart fremio-api
    sleep 2
    pm2 status
ENDSSH

echo ""
echo -e "${GREEN}✅ Backend deployed and restarted!${NC}"
echo -e "${YELLOW}🔗 API: https://api.fremio.id${NC}"
