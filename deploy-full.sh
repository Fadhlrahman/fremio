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
BACKEND_PATH=""
FRONTEND_PATH="/var/www/fremio"
RELEASE_PATH="/var/www/releases/fremio-launching"
BACKUP_DIR="/var/www/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════╗"
echo "║   FREMIO FULL DEPLOYMENT SCRIPT v2.0      ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Detect the actual backend directory from PM2 to avoid deploying to the wrong folder
echo -e "${BLUE}🔎 Detecting backend path from PM2...${NC}"
BACKEND_PATH=$(ssh ${VPS_USER}@${VPS_HOST} 'node -e "const {execSync}=require(\"child_process\"); const list=JSON.parse(execSync(\"pm2 jlist\",{encoding:\"utf8\"})||\"[]\"); const p=list.find(x=>x.name===\"fremio-api\"); console.log(p?.pm2_env?.pm_cwd||\"\");"' | tr -d '\r')
if [ -z "$BACKEND_PATH" ]; then
    echo -e "${YELLOW}⚠️  Could not detect PM2 cwd. Falling back to /var/www/fremio-backend${NC}"
    BACKEND_PATH="/var/www/fremio-backend"
fi
echo -e "${GREEN}✅ Using backend path: ${BACKEND_PATH}${NC}"

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
    --exclude='uploads' \
    --exclude='uploads/**' \
    --exclude='uploads/temp/*' \
    backend/ ${VPS_USER}@${VPS_HOST}:${BACKEND_PATH}/

echo -e "${GREEN}✅ Backend files synced!${NC}"
echo ""

# Step 6: Install dependencies and restart backend
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}♻️  Step 6/6: Restarting Backend Server...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
        # Restart from the same folder PM2 runs in
        BACKEND_CWD=$(node -e "const {execSync}=require('child_process'); const list=JSON.parse(execSync('pm2 jlist',{encoding:'utf8'})||'[]'); const p=list.find(x=>x.name==='fremio-api'); console.log(p?.pm2_env?.pm_cwd||'');")
        if [ -z "$BACKEND_CWD" ]; then
            BACKEND_CWD="/var/www/fremio-backend"
        fi

        cd "$BACKEND_CWD"
    
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

# Optional: run DB migration for flow_type when credentials are available on server
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🗄️  Optional: Running DB migration (flow_type)...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
        set -e
        BACKEND_CWD=$(node -e "const {execSync}=require('child_process'); const list=JSON.parse(execSync('pm2 jlist',{encoding:'utf8'})||'[]'); const p=list.find(x=>x.name==='fremio-api'); console.log(p?.pm2_env?.pm_cwd||'');")
        if [ -z "$BACKEND_CWD" ]; then
            BACKEND_CWD="/var/www/fremio-backend"
        fi
        cd "$BACKEND_CWD"

        MIG_FILE="migrations/add_flow_type_column.sql"
        if [ ! -f "$MIG_FILE" ]; then
            echo "⚠️  Migration file not found: $MIG_FILE (skipping)"
            exit 0
        fi

        if ! command -v psql >/dev/null 2>&1; then
            echo "⚠️  psql not installed on server (skipping migration)"
            exit 0
        fi

        # Try to load DB creds from .env without printing them
        if [ -f ".env" ]; then
            set -a
            . ./.env
            set +a
        fi

        # Support both DB_* and PG* styles
        DB_HOST_VAL="${DB_HOST:-${PGHOST:-localhost}}"
        DB_PORT_VAL="${DB_PORT:-${PGPORT:-5432}}"
        DB_NAME_VAL="${DB_NAME:-${PGDATABASE:-fremio}}"
        DB_USER_VAL="${DB_USER:-${PGUSER:-fremio_user}}"
        DB_PASS_VAL="${DB_PASSWORD:-${PGPASSWORD:-}}"

        if [ -z "$DB_PASS_VAL" ]; then
            echo "⚠️  DB password not found in backend .env (DB_PASSWORD/PGPASSWORD). Run migration manually.";
            echo "   File: $BACKEND_CWD/$MIG_FILE";
            exit 0
        fi

        echo "✅ Running migration: $MIG_FILE"
        PGPASSWORD="$DB_PASS_VAL" psql -h "$DB_HOST_VAL" -p "$DB_PORT_VAL" -U "$DB_USER_VAL" -d "$DB_NAME_VAL" -f "$MIG_FILE"
        echo "✅ Migration applied"
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
