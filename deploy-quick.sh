#!/bin/bash
# Quick deployment script for fremio.id
# Run: bash deploy-quick.sh

set -e

SERVER="root@76.13.192.32"
FRONTEND_PATH="/var/www/fremio/frontend"
BACKEND_PATH="/root/fremio/backend"

echo "🚀 Deploying to fremio.id..."
echo ""

# Deploy frontend
echo "📦 Deploying frontend..."
ssh "$SERVER" << 'ENDSSH'
  cd /root/fremio
  git pull origin main
  echo "✅ Code pulled"
  
  # Copy new frontend build
  cp -r /root/fremio/my-app/dist/* /var/www/fremio/frontend/
  echo "✅ Frontend files copied"
  
  # Verify hash
  ls -la /var/www/fremio/frontend/assets/index-*.js | tail -1
ENDSSH

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "🧪 Test dengan:"
echo "   1. Buka https://fremio.id (incognito mode)"
echo "   2. Tekan Ctrl+Shift+R (hard refresh)"
echo "   3. Buka Console, cari 'VPS API URL'"
echo "   4. Harus tampil: '/api' (BUKAN 'https://api.fremio.id/api')"
echo ""
