#!/bin/bash
# ============================================
# FREMIO - Health Check & Monitoring Script
# Jalankan di Load Balancer atau server monitoring
# ============================================

# Warna untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Konfigurasi - GANTI DENGAN IP ANDA
LOAD_BALANCER_IP="YOUR_LB_IP"
APP_SERVER_1_IP="YOUR_APP1_IP"
APP_SERVER_2_IP="YOUR_APP2_IP"
APP_SERVER_3_IP="YOUR_APP3_IP"
DATABASE_IP="YOUR_DB_IP"
FILE_STORAGE_IP="YOUR_STORAGE_IP"
DOMAIN="yourdomain.com"

# Telegram notification (optional)
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""

# Function untuk kirim notifikasi Telegram
send_telegram() {
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        message=$1
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d chat_id="${TELEGRAM_CHAT_ID}" \
            -d text="${message}" \
            -d parse_mode="HTML" > /dev/null
    fi
}

# Function untuk cek HTTP
check_http() {
    local url=$1
    local name=$2
    local response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$url")
    
    if [ "$response" == "200" ]; then
        echo -e "${GREEN}✓${NC} $name: OK (HTTP $response)"
        return 0
    else
        echo -e "${RED}✗${NC} $name: FAILED (HTTP $response)"
        return 1
    fi
}

# Function untuk cek port
check_port() {
    local ip=$1
    local port=$2
    local name=$3
    
    if nc -z -w5 "$ip" "$port" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $name: Port $port OPEN"
        return 0
    else
        echo -e "${RED}✗${NC} $name: Port $port CLOSED"
        return 1
    fi
}

# Function untuk cek disk usage
check_disk() {
    local ip=$1
    local name=$2
    local threshold=80
    
    usage=$(ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@$ip "df / | tail -1 | awk '{print \$5}' | sed 's/%//'" 2>/dev/null)
    
    if [ -z "$usage" ]; then
        echo -e "${YELLOW}?${NC} $name: Cannot check disk (SSH failed)"
        return 2
    elif [ "$usage" -gt "$threshold" ]; then
        echo -e "${RED}✗${NC} $name: Disk usage ${usage}% (threshold: ${threshold}%)"
        return 1
    else
        echo -e "${GREEN}✓${NC} $name: Disk usage ${usage}%"
        return 0
    fi
}

# Function untuk cek memory
check_memory() {
    local ip=$1
    local name=$2
    local threshold=85
    
    usage=$(ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@$ip "free | grep Mem | awk '{print int(\$3/\$2 * 100)}'" 2>/dev/null)
    
    if [ -z "$usage" ]; then
        echo -e "${YELLOW}?${NC} $name: Cannot check memory (SSH failed)"
        return 2
    elif [ "$usage" -gt "$threshold" ]; then
        echo -e "${RED}✗${NC} $name: Memory usage ${usage}% (threshold: ${threshold}%)"
        return 1
    else
        echo -e "${GREEN}✓${NC} $name: Memory usage ${usage}%"
        return 0
    fi
}

echo "============================================"
echo "  FREMIO SYSTEM HEALTH CHECK"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

FAILED=0
ALERTS=""

# Check domain
echo "🌐 DOMAIN & SSL CHECK"
echo "--------------------------------------------"
if check_http "https://${DOMAIN}/health" "HTTPS Domain"; then
    :
else
    FAILED=$((FAILED + 1))
    ALERTS="${ALERTS}❌ HTTPS Domain unreachable\n"
fi
echo ""

# Check Load Balancer
echo "🔄 LOAD BALANCER CHECK"
echo "--------------------------------------------"
if check_http "http://${LOAD_BALANCER_IP}/health" "Load Balancer"; then
    :
else
    FAILED=$((FAILED + 1))
    ALERTS="${ALERTS}❌ Load Balancer down\n"
fi
check_port "$LOAD_BALANCER_IP" 80 "Load Balancer HTTP"
check_port "$LOAD_BALANCER_IP" 443 "Load Balancer HTTPS"
echo ""

# Check App Servers
echo "📱 APP SERVERS CHECK"
echo "--------------------------------------------"
for i in 1 2 3; do
    eval "ip=\$APP_SERVER_${i}_IP"
    if check_http "http://${ip}:3000/api/health" "App Server #${i}"; then
        :
    else
        FAILED=$((FAILED + 1))
        ALERTS="${ALERTS}❌ App Server #${i} down\n"
    fi
done
echo ""

# Check Database
echo "🗄️ DATABASE CHECK"
echo "--------------------------------------------"
if check_port "$DATABASE_IP" 5432 "PostgreSQL"; then
    :
else
    FAILED=$((FAILED + 1))
    ALERTS="${ALERTS}❌ PostgreSQL unreachable\n"
fi
if check_port "$DATABASE_IP" 6379 "Redis"; then
    :
else
    FAILED=$((FAILED + 1))
    ALERTS="${ALERTS}❌ Redis unreachable\n"
fi
echo ""

# Check File Storage
echo "📁 FILE STORAGE CHECK"
echo "--------------------------------------------"
if check_http "http://${FILE_STORAGE_IP}/health" "File Storage"; then
    :
else
    FAILED=$((FAILED + 1))
    ALERTS="${ALERTS}❌ File Storage down\n"
fi
echo ""

# Check Resources (optional - requires SSH access)
echo "💾 RESOURCE CHECK"
echo "--------------------------------------------"
check_disk "$LOAD_BALANCER_IP" "Load Balancer"
check_disk "$APP_SERVER_1_IP" "App Server #1"
check_disk "$DATABASE_IP" "Database"
check_disk "$FILE_STORAGE_IP" "File Storage"
echo ""

check_memory "$LOAD_BALANCER_IP" "Load Balancer"
check_memory "$APP_SERVER_1_IP" "App Server #1"
check_memory "$DATABASE_IP" "Database"
check_memory "$FILE_STORAGE_IP" "File Storage"
echo ""

# Summary
echo "============================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL SYSTEMS OPERATIONAL${NC}"
else
    echo -e "${RED}⚠️ $FAILED ISSUES DETECTED${NC}"
    echo -e "$ALERTS"
    
    # Send Telegram notification
    send_telegram "🚨 <b>FREMIO ALERT</b>%0A%0A${ALERTS}"
fi
echo "============================================"
echo ""

exit $FAILED
