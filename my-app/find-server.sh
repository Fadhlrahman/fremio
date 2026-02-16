#!/bin/bash

# ============================================
# FREMIO DEPLOYMENT - SSH TROUBLESHOOTER
# ============================================

echo "🔍 Mencari server Fremio yang bisa diakses..."
echo ""

# List of possible IPs
IPS=(
  "72.61.210.203"  # Server 2 (known_hosts)
  "76.13.192.32"   # api.fremio.id (DNS current)
  "72.61.214.5"    # Old server (deploy scripts)
)

WORKING_IP=""
SSH_KEY="$HOME/.ssh/fremio_production"

echo "Testing SSH connections..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for IP in "${IPS[@]}"; do
  echo -n "Testing $IP ... "
  
  # Test port 22
  if nc -z -w 2 "$IP" 22 &>/dev/null; then
    echo "✅ Port 22 open"
    
    # Test SSH with key
    echo "   Trying SSH with key..."
    if ssh -i "$SSH_KEY" -o ConnectTimeout=5 -o StrictHostKeyChecking=no -o BatchMode=yes root@"$IP" "echo OK" &>/dev/null; then
      echo "   ✅ SSH KEY WORKS!"
      WORKING_IP="$IP"
      break
    else
      echo "   ⚠️  Key auth failed (might need password)"
    fi
  else
    echo "❌ Port 22 closed/filtered"
  fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -n "$WORKING_IP" ]; then
  echo "🎉 FOUND WORKING SERVER: $WORKING_IP"
  echo ""
  echo "Getting server info..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no root@"$WORKING_IP" << 'EOF'
    echo "Hostname: $(hostname)"
    echo "IP: $(hostname -I | awk '{print $1}')"
    echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
    echo ""
    echo "Web Directories:"
    ls -la /var/www/ 2>/dev/null | grep -E "^d" | awk '{print "  " $9}'
    echo ""
    echo "PM2 Processes:"
    pm2 list 2>/dev/null | grep -E "fremio|online|stopped" || echo "  PM2 not running"
    echo ""
    echo "Nginx Status:"
    systemctl is-active nginx 2>/dev/null || echo "  Nginx status unknown"
EOF
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "✅ Deploy to this server with:"
  echo ""
  echo "  cd /Users/salwa/Documents/fremio/my-app"
  echo "  rsync -avz dist/ root@$WORKING_IP:/var/www/fremio/"
  echo "  ssh root@$WORKING_IP 'pm2 restart fremio-backend && sudo systemctl reload nginx'"
  echo ""
  
else
  echo "❌ Tidak ada server yang bisa diakses via SSH"
  echo ""
  echo "Kemungkinan masalah:"
  echo "  1. VPN required untuk akses SSH"
  echo "  2. SSH key tidak cocok (perlu password)"
  echo "  3. Firewall blocking dari IP Anda"
  echo "  4. Server maintenance/offline"
  echo ""
  echo "Alternatif deployment:"
  echo "  - Pakai FTP/SFTP (FileZilla, Cyberduck)"
  echo "  - Pakai cPanel File Manager"
  echo "  - Kontak hosting provider"
  echo ""
  echo "Archive ready untuk manual upload:"
  echo "  /Users/salwa/Documents/fremio/my-app/frontend-overlay-fix.tar.gz"
fi
