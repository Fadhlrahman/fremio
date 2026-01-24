#!/bin/bash
# Check webhook endpoint accessibility and recent logs

echo "=== 1. Check if webhook endpoint is accessible ==="
curl -X POST http://72.61.214.5:5050/api/payment/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "ping"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  2>&1 | head -20

echo ""
echo "=== 2. Check backend logs for webhook errors ==="
ssh root@72.61.214.5 "tail -100 /root/fremio/backend/logs/backend.log | grep -i 'webhook\|notification\|📥' | tail -20"

echo ""
echo "=== 3. Check if backend is running ==="
ssh root@72.61.214.5 "ps aux | grep 'node.*server.js' | grep -v grep"

echo ""
echo "=== 4. Check backend port 5050 ==="
ssh root@72.61.214.5 "netstat -tulpn | grep 5050"
