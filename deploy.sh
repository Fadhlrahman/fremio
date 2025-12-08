#!/bin/bash

# ================================================
# FREMIO DEPLOYMENT SCRIPT
# ================================================

set -e  # Exit on error

echo "🚀 Starting Fremio Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# ================================================
# 1. ENVIRONMENT CHECK
# ================================================
echo -e "\n${YELLOW}1. Checking environment...${NC}"

# Check Node.js version
NODE_VERSION=$(node -v)
echo "   Node.js version: $NODE_VERSION"

# Check npm version
NPM_VERSION=$(npm -v)
echo "   npm version: $NPM_VERSION"

# ================================================
# 2. BUILD FRONTEND
# ================================================
echo -e "\n${YELLOW}2. Building frontend...${NC}"

cd my-app

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}Error: .env.production not found in my-app directory${NC}"
    echo "Please create .env.production with production settings"
    exit 1
fi

# Copy production env
cp .env.production .env.production.local 2>/dev/null || true

# Install dependencies
echo "   Installing dependencies..."
npm install --legacy-peer-deps

# Build
echo "   Building production bundle..."
npm run build

if [ -d "dist" ]; then
    echo -e "${GREEN}   ✅ Frontend build successful${NC}"
    echo "   Build size: $(du -sh dist | cut -f1)"
else
    echo -e "${RED}   ❌ Frontend build failed${NC}"
    exit 1
fi

cd ..

# ================================================
# 3. BUILD BACKEND
# ================================================
echo -e "\n${YELLOW}3. Preparing backend...${NC}"

cd backend

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}Error: .env.production not found in backend directory${NC}"
    echo "Please create .env.production with production settings"
    exit 1
fi

# Install dependencies
echo "   Installing dependencies..."
npm install --production

echo -e "${GREEN}   ✅ Backend prepared${NC}"

cd ..

# ================================================
# 4. CREATE DEPLOYMENT PACKAGE
# ================================================
echo -e "\n${YELLOW}4. Creating deployment package...${NC}"

DEPLOY_DIR="deploy_$(date +%Y%m%d_%H%M%S)"
mkdir -p $DEPLOY_DIR

# Copy frontend build
cp -r my-app/dist $DEPLOY_DIR/frontend

# Copy backend (excluding node_modules and dev files)
mkdir -p $DEPLOY_DIR/backend
rsync -av --exclude='node_modules' --exclude='.env' --exclude='*.log' --exclude='uploads/*' \
    backend/ $DEPLOY_DIR/backend/

# Copy .env.production files (user should update these)
cp my-app/.env.production $DEPLOY_DIR/frontend.env.example
cp backend/.env.production $DEPLOY_DIR/backend.env.example

# Create deployment readme
cat > $DEPLOY_DIR/DEPLOY_README.md << 'EOF'
# Fremio Deployment Package

## Files Included:
- `frontend/` - Built frontend static files
- `backend/` - Backend server files
- `frontend.env.example` - Example frontend environment config
- `backend.env.example` - Example backend environment config

## Deployment Steps:

### 1. Setup Database (PostgreSQL)
```bash
# Create database
createdb fremio

# Import schema
psql -U your_user -d fremio -f backend/database/schema.sql
```

### 2. Configure Environment
```bash
# Backend
cp backend.env.example backend/.env
# Edit backend/.env with your production settings

# Update frontend API URL in nginx config
```

### 3. Install Backend Dependencies
```bash
cd backend
npm install --production
```

### 4. Setup PM2 for Process Management
```bash
npm install -g pm2
cd backend
pm2 start server.js --name fremio-backend
pm2 save
pm2 startup
```

### 5. Configure Nginx
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Frontend
    location / {
        root /var/www/fremio/frontend;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Uploaded files
    location /uploads {
        proxy_pass http://localhost:3000/uploads;
    }
}
```

### 6. Setup SSL with Certbot
```bash
sudo certbot --nginx -d yourdomain.com
```

EOF

# Create tarball
tar -czf fremio_deploy.tar.gz $DEPLOY_DIR

echo -e "${GREEN}   ✅ Deployment package created: fremio_deploy.tar.gz${NC}"
echo "   Package size: $(du -sh fremio_deploy.tar.gz | cut -f1)"

# Cleanup
rm -rf $DEPLOY_DIR

# ================================================
# 5. SUMMARY
# ================================================
echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}🎉 Deployment package ready!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Transfer fremio_deploy.tar.gz to your VPS"
echo "2. Extract: tar -xzf fremio_deploy.tar.gz"
echo "3. Follow instructions in DEPLOY_README.md"
echo ""
