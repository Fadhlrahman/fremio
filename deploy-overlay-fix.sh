#!/bin/bash

# Deploy Backend & Frontend - Overlay Fix
# This script deploys the backend overlay endpoint and syncs frontend

set -e

echo "======================================"
echo "🚀 DEPLOYING OVERLAY FIX"
echo "======================================"

# Configuration
SERVER_USER="root"
SERVER_IP="76.13.192.32"
BACKEND_PATH="/root/fremio/backend"
FRONTEND_PATH="/var/www/fremio"

echo ""
echo "📦 Step 1: Deploying Backend..."
echo "--------------------------------------"

# Upload backend files
echo "Uploading backend/src/routes/upload.js..."
scp backend/src/routes/upload.js ${SERVER_USER}@${SERVER_IP}:${BACKEND_PATH}/src/routes/

echo "Uploading backend/src/routes/frames.js..."
scp backend/src/routes/frames.js ${SERVER_USER}@${SERVER_IP}:${BACKEND_PATH}/src/routes/

echo "Uploading backend/src/index.js..."
scp backend/src/index.js ${SERVER_USER}@${SERVER_IP}:${BACKEND_PATH}/src/

# Restart backend
echo ""
echo "🔄 Restarting backend..."
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
cd /root/fremio/backend
pm2 restart fremio-backend
pm2 logs fremio-backend --lines 20
EOF

echo ""
echo "✅ Backend deployed successfully!"

echo ""
echo "📦 Step 2: Deploying Frontend..."
echo "--------------------------------------"

# Create tarball of dist folder
cd my-app
echo "Creating tarball from dist folder..."
tar -czf dist.tar.gz -C dist .

# Upload to server
echo "Uploading frontend dist.tar.gz..."
scp dist.tar.gz ${SERVER_USER}@${SERVER_IP}:/tmp/

# Extract on server
echo "Extracting on server..."
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
cd /var/www/fremio
rm -rf assets *.html *.js *.css *.json 2>/dev/null || true
tar -xzf /tmp/dist.tar.gz
rm /tmp/dist.tar.gz
chown -R www-data:www-data /var/www/fremio
echo "✅ Frontend extracted and permissions set"
EOF

# Cleanup
rm dist.tar.gz

echo ""
echo "✅ Frontend deployed successfully!"

echo ""
echo "📦 Step 3: Creating overlays directory..."
echo "--------------------------------------"

ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
# Ensure overlay directories exist
mkdir -p /root/fremio/backend/uploads/overlays
mkdir -p /var/www/fremio/uploads/overlays
chown -R www-data:www-data /var/www/fremio/uploads
chmod -R 755 /var/www/fremio/uploads
echo "✅ Overlay directories created"
EOF

echo ""
echo "======================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "======================================"
echo ""
echo "🔍 Testing..."
echo ""
echo "1. Test overlay upload endpoint:"
echo "   Open: https://fremio.id/admin/upload-frame"
echo "   Add overlay → Save → Check if it persists after edit"
echo ""
echo "2. Manual sync if needed:"
echo "   ssh ${SERVER_USER}@${SERVER_IP} '/root/sync-uploads.sh'"
echo ""
echo "3. Check backend logs:"
echo "   ssh ${SERVER_USER}@${SERVER_IP} 'pm2 logs fremio-backend --lines 50'"
echo ""
