#!/bin/bash
# Quick Fix: Update VPS environment and restart backend

echo "🔧 Fixing VPS Backend Configuration..."
echo ""

# 1. Backup current .env
ssh root@72.61.214.5 << 'ENDSSH'
cd /var/www/fremio-backend

# Backup
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backup created"

# Fix FRONTEND_URL
echo "📝 Updating FRONTEND_URL..."
sed -i 's|FRONTEND_URL=https://localhost:5180|FRONTEND_URL=https://fremio.id|g' .env

# Verify
echo ""
echo "📋 Current configuration:"
grep -E "FRONTEND_URL|MIDTRANS_IS_PRODUCTION" .env

echo ""
echo "🔄 Restarting backend..."

# Find and kill node process
pkill -f "node.*server.js"
sleep 2

# Start backend
cd /var/www/fremio-backend
nohup node server.js > logs/backend.log 2>&1 &

sleep 3

# Check if running
if pgrep -f "node.*server.js" > /dev/null; then
    echo "✅ Backend restarted successfully"
    echo ""
    echo "🌐 Backend running on:"
    echo "   http://72.61.214.5:5050"
    echo "   https://api.fremio.id"
else
    echo "❌ Backend failed to start. Check logs:"
    echo "   tail -100 /var/www/fremio-backend/logs/backend.log"
fi

ENDSSH

echo ""
echo "✅ VPS Configuration Updated!"
echo ""
echo "📋 Next Steps:"
echo "1. Login ke Midtrans Dashboard: https://dashboard.midtrans.com/"
echo "2. Go to: Settings → Configuration"
echo "3. Set Payment Notification URL:"
echo "   Production: https://api.fremio.id/api/payment/webhook"
echo "   Sandbox: http://72.61.214.5:5050/api/payment/webhook"
echo "4. Save configuration"
echo ""
echo "🧪 Test webhook:"
echo "   - Create new payment transaction"
echo "   - Pay with DANA/GOPAY"
echo "   - Check logs: ssh root@72.61.214.5 'tail -f /var/www/fremio-backend/logs/backend.log | grep 📥'"
