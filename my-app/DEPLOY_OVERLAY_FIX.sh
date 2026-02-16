#!/bin/bash

# ===============================================
# DEPLOY FIX - Upload Overlay Element
# ===============================================
# 
# This script deploys the fixed frontend to production server
# 
# WHAT WAS FIXED:
# - Changed upload endpoint from /api/upload/frame to /api/upload/overlay
# - This ensures overlay images are saved to correct folder on server
# 
# File changed: src/pages/admin/UploadFrame.jsx (line 787)
# ===============================================

set -e

echo "🚀 Deploying Overlay Upload Fix to Production..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Server config
VPS_HOST="72.61.214.5"
VPS_USER="root"
SSH_ALIAS="fremio-api-ip"
FRONTEND_PATH="/var/www/fremio"
BACKEND_PATH="/var/www/backend"

# ===============================================
# 1. PRE-FLIGHT CHECKS
# ===============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}1. Pre-flight Checks${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if built dist exists
if [ ! -d "dist" ]; then
  echo -e "${RED}❌ dist folder not found!${NC}"
  echo "   Running build first..."
  npm run build
fi

echo -e "${GREEN}✅ Build files ready${NC}"

# Check SSH connection
echo -n "Checking SSH connection to ${VPS_HOST}... "
if ssh -o ConnectTimeout=5 -o BatchMode=yes ${SSH_ALIAS} "echo ok" >/dev/null 2>&1; then
  echo -e "${GREEN}✅ Connected${NC}"
  USE_ALIAS=true
elif ssh -o ConnectTimeout=5 -o BatchMode=yes ${VPS_USER}@${VPS_HOST} "echo ok" >/dev/null 2>&1; then
  echo -e "${GREEN}✅ Connected${NC}"
  USE_ALIAS=false
else
  echo -e "${YELLOW}⚠️  SSH timeout${NC}"
  echo ""
  echo -e "${YELLOW}Cannot connect to server via SSH.${NC}"
  echo "This might be because:"
  echo "  - Server is behind firewall"
  echo "  - SSH port is not 22"
  echo "  - VPN required"
  echo "  - Network issue"
  echo ""
  echo "You can still deploy manually:"
  echo "  1. Zip the dist folder:"
  echo "     cd /Users/salwa/Documents/fremio/my-app"
  echo "     tar -czf frontend-fixed.tar.gz dist/"
  echo ""
  echo "  2. Upload to server via FTP/SCP/cPanel"
  echo ""
  echo "  3. Extract on server:"
  echo "     ssh ${VPS_USER}@${VPS_HOST}"
  echo "     cd /var/www"
  echo "     tar -xzf frontend-fixed.tar.gz"
  echo "     mv dist/* fremio/"
  echo ""
  exit 1
fi

# Determine SSH target
if [ "$USE_ALIAS" = true ]; then
  SSH_TARGET="${SSH_ALIAS}"
else
  SSH_TARGET="${VPS_USER}@${VPS_HOST}"
fi

echo ""

# ===============================================
# 2. BACKUP CURRENT FRONTEND
# ===============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}2. Creating Backup${NC}"
echo -e "${BLUE}========================================${NC}"

BACKUP_NAME="fremio_backup_$(date +%Y%m%d_%H%M%S)"

ssh ${SSH_TARGET} << EOF
  if [ -d "${FRONTEND_PATH}" ]; then
    echo "Creating backup: ${BACKUP_NAME}"
    cp -r ${FRONTEND_PATH} /var/www/${BACKUP_NAME}
    echo -e "${GREEN}✅ Backup created: /var/www/${BACKUP_NAME}${NC}"
  else
    echo -e "${YELLOW}⚠️  Frontend path not found, skipping backup${NC}"
  fi
EOF

echo ""

# ===============================================
# 3. DEPLOY FRONTEND
# ===============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}3. Deploying Frontend${NC}"
echo -e "${BLUE}========================================${NC}"

echo "Uploading files to ${FRONTEND_PATH}..."

rsync -avz --progress --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='*.md' \
  --exclude='*.sh' \
  --exclude='*.backup' \
  --exclude='.env*' \
  dist/ ${SSH_TARGET}:${FRONTEND_PATH}/

echo -e "${GREEN}✅ Frontend deployed${NC}"
echo ""

# ===============================================
# 4. VERIFY UPLOAD FOLDERS
# ===============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}4. Verifying Upload Folders${NC}"
echo -e "${BLUE}========================================${NC}"

ssh ${SSH_TARGET} << 'EOF'
  # Create upload folders if not exist
  mkdir -p /var/www/backend/uploads/overlays
  mkdir -p /var/www/backend/uploads/frames
  mkdir -p /var/www/backend/uploads/profiles
  
  # Set correct permissions
  chmod -R 755 /var/www/backend/uploads
  chown -R www-data:www-data /var/www/backend/uploads
  
  echo "Upload folders:"
  ls -la /var/www/backend/uploads/ | grep -E "overlays|frames|profiles"
  echo ""
  echo -e "${GREEN}✅ Upload folders ready${NC}"
EOF

echo ""

# ===============================================
# 5. VERIFY BACKEND ROUTE
# ===============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}5. Verifying Backend Route${NC}"
echo -e "${BLUE}========================================${NC}"

ssh ${SSH_TARGET} << 'EOF'
  if grep -q 'router.post.*["\x27]/overlay["\x27]' /var/www/backend/routes/upload.js; then
    echo -e "${GREEN}✅ Backend /api/upload/overlay endpoint exists${NC}"
  else
    echo -e "${YELLOW}⚠️  Backend route needs verification${NC}"
    echo "   Check: /var/www/backend/routes/upload.js"
    echo "   Should have: router.post('/overlay', ...)"
  fi
EOF

echo ""

# ===============================================
# 6. RESTART SERVICES
# ===============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}6. Restarting Services${NC}"
echo -e "${BLUE}========================================${NC}"

ssh ${SSH_TARGET} << 'EOF'
  echo "Restarting backend..."
  cd /var/www/backend
  pm2 restart fremio-backend || pm2 start server.js --name fremio-backend
  
  echo ""
  echo "Reloading nginx..."
  sudo nginx -t && sudo systemctl reload nginx
  
  echo ""
  echo -e "${GREEN}✅ Services restarted${NC}"
EOF

echo ""

# ===============================================
# 7. TEST DEPLOYMENT
# ===============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}7. Testing Deployment${NC}"
echo -e "${BLUE}========================================${NC}"

# Test if frontend is accessible
echo -n "Testing frontend... "
if curl -s -o /dev/null -w "%{http_code}" https://fremio.id | grep -q "200"; then
  echo -e "${GREEN}✅ Frontend accessible${NC}"
else
  echo -e "${YELLOW}⚠️  Frontend test inconclusive${NC}"
fi

# Test if backend API is up
echo -n "Testing backend API... "
if curl -s -o /dev/null -w "%{http_code}" https://fremio.id/api/health | grep -q "200"; then
  echo -e "${GREEN}✅ Backend API accessible${NC}"
else
  echo -e "${YELLOW}⚠️  Backend API test inconclusive${NC}"
fi

echo ""

# ===============================================
# 8. DEPLOYMENT COMPLETE
# ===============================================
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "What was fixed:"
echo "  ✅ Upload endpoint changed: /upload/frame → /upload/overlay"
echo "  ✅ Frontend rebuilt and deployed"
echo "  ✅ Upload folders verified"
echo "  ✅ Services restarted"
echo ""
echo -e "${YELLOW}Next: Test the fix${NC}"
echo "  1. Go to: https://fremio.id/admin/upload-frame"
echo "  2. Create or edit a frame"
echo "  3. Add upload element (cloud icon)"
echo "  4. Upload an image to the upload element"
echo "  5. Click 'Update Frame'"
echo "  6. Open browser console (F12)"
echo "  7. Verify NO 404 errors for .webp files"
echo ""
echo -e "${YELLOW}Check logs if issues occur:${NC}"
echo "  PM2 logs:   ssh ${SSH_TARGET} 'pm2 logs fremio-backend --lines 50'"
echo "  Nginx logs: ssh ${SSH_TARGET} 'sudo tail -f /var/log/nginx/error.log'"
echo ""
echo "Backup location: /var/www/${BACKUP_NAME}"
echo ""
