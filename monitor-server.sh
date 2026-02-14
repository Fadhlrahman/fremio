#!/bin/bash

# ================================================
# FREMIO - SERVER MONITORING
# ================================================
# Quick monitoring untuk server production
# ================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SERVER="76.13.192.32"

clear

echo -e "${BOLD}${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║          📊 FREMIO SERVER MONITORING 📊                  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "Server: $SERVER"
echo ""

# ================================================
# Check Connection
# ================================================
echo -e "${YELLOW}🔌 Checking connection...${NC}"
if ! ssh -o ConnectTimeout=5 root@$SERVER exit 2>/dev/null; then
    echo -e "${RED}❌ Cannot connect to server${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Connected${NC}"
echo ""

# ================================================
# Get Server Status
# ================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}📊 SYSTEM STATUS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ssh root@$SERVER << 'ENDSSH'
#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m'

# System Info
echo ""
echo -e "${YELLOW}System:${NC}"
echo "  Uptime: $(uptime -p)"
echo "  Load:   $(uptime | awk -F'load average:' '{print $2}')"
echo ""

# Disk Usage
echo -e "${YELLOW}Disk Usage:${NC}"
df -h / | tail -1 | awk '{printf "  Root: %s / %s (%s used)\n", $3, $2, $5}'
echo ""

# Memory
echo -e "${YELLOW}Memory:${NC}"
free -h | grep Mem | awk '{printf "  Used: %s / %s\n", $3, $2}'
echo ""

ENDSSH

# ================================================
# PM2 Status
# ================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}🚀 PM2 APPLICATIONS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

ssh root@$SERVER << 'ENDSSH'
pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status) (CPU: \(.monit.cpu)%, Mem: \(.monit.memory / 1024 / 1024 | floor)MB, Restarts: \(.pm2_env.restart_time))"' 2>/dev/null || pm2 status
echo ""
ENDSSH

# ================================================
# Nginx Status
# ================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}🌐 NGINX STATUS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

ssh root@$SERVER << 'ENDSSH'
if systemctl is-active --quiet nginx; then
    echo -e "  Status: \033[0;32m● running\033[0m"
else
    echo -e "  Status: \033[0;31m● stopped\033[0m"
fi
echo ""
ENDSSH

# ================================================
# Database Status
# ================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}🗄️  DATABASE STATUS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

ssh root@$SERVER << 'ENDSSH'
if systemctl is-active --quiet postgresql; then
    echo -e "  Status: \033[0;32m● running\033[0m"
    
    # Database size
    DB_SIZE=$(sudo -u postgres psql -d fremio -t -c "SELECT pg_size_pretty(pg_database_size('fremio'));" 2>/dev/null | xargs)
    if [ ! -z "$DB_SIZE" ]; then
        echo "  Database: fremio ($DB_SIZE)"
    fi
    
    # Table counts
    USERS=$(sudo -u postgres psql -d fremio -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)
    if [ ! -z "$USERS" ]; then
        echo "  Users: $USERS"
    fi
else
    echo -e "  Status: \033[0;31m● stopped\033[0m"
fi
echo ""
ENDSSH

# ================================================
# API Health Check
# ================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}🏥 API HEALTH CHECK${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test API endpoint
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" http://$SERVER/api/health 2>/dev/null)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -1)
BODY=$(echo "$HEALTH_RESPONSE" | head -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "  API Health: ${GREEN}✅ Online${NC} (HTTP $HTTP_CODE)"
    echo "  Response: $BODY"
else
    echo -e "  API Health: ${RED}❌ Error${NC} (HTTP $HTTP_CODE)"
fi
echo ""

# ================================================
# Recent Logs
# ================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}📝 RECENT LOGS (Last 10 lines)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

ssh root@$SERVER << 'ENDSSH'
pm2 logs fremio-api --lines 10 --nostream 2>/dev/null || echo "  No logs available"
ENDSSH

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}💡 Quick Commands:${NC}"
echo "  View live logs:      ssh root@$SERVER 'pm2 logs fremio-api'"
echo "  Restart backend:     ssh root@$SERVER 'pm2 restart fremio-api'"
echo "  Restart nginx:       ssh root@$SERVER 'systemctl restart nginx'"
echo "  Check all services:  ssh root@$SERVER 'pm2 status && systemctl status nginx'"
echo ""
