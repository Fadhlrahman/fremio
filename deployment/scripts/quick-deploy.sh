#!/bin/bash
# ============================================
# FREMIO - Quick Deploy Script
# Untuk update/redeploy aplikasi
# ============================================

set -e

# Konfigurasi - GANTI DENGAN NILAI ANDA
LOAD_BALANCER_IP=""
APP_SERVER_1_IP=""
APP_SERVER_2_IP=""
APP_SERVER_3_IP=""
DATABASE_IP=""
FILE_STORAGE_IP=""
DOMAIN=""

# Path lokal
LOCAL_FRONTEND_PATH="../my-app"
LOCAL_BACKEND_PATH="../backend"

# Warna
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "============================================"
echo "  FREMIO QUICK DEPLOY"
echo "============================================"
echo ""

# Check konfigurasi
if [ -z "$LOAD_BALANCER_IP" ]; then
    echo -e "${RED}Error: Konfigurasi belum diisi!${NC}"
    echo "Edit file ini dan isi semua IP address."
    exit 1
fi

# Menu
echo "Pilih opsi deploy:"
echo "1) Deploy Frontend saja"
echo "2) Deploy Backend saja"
echo "3) Deploy Full (Frontend + Backend)"
echo "4) Restart semua App Servers"
echo "5) Update frame assets"
echo "6) Exit"
echo ""
read -p "Pilihan [1-6]: " choice

case $choice in
    1)
        echo ""
        echo -e "${YELLOW}📦 Building Frontend...${NC}"
        cd "$LOCAL_FRONTEND_PATH"
        npm run build
        
        echo ""
        echo -e "${YELLOW}📤 Uploading to Load Balancer...${NC}"
        rsync -avz --delete dist/ root@${LOAD_BALANCER_IP}:/var/www/fremio/dist/
        
        echo ""
        echo -e "${GREEN}✅ Frontend deployed successfully!${NC}"
        ;;
    
    2)
        echo ""
        echo -e "${YELLOW}📤 Uploading Backend to App Servers...${NC}"
        cd "$LOCAL_BACKEND_PATH"
        
        for ip in $APP_SERVER_1_IP $APP_SERVER_2_IP $APP_SERVER_3_IP; do
            echo "Deploying to $ip..."
            rsync -avz --exclude 'node_modules' --exclude '.env' --exclude 'logs' --exclude 'uploads' \
                ./ root@${ip}:/var/www/fremio-backend/
            
            ssh root@${ip} "cd /var/www/fremio-backend && npm install --production && pm2 restart all"
        done
        
        echo ""
        echo -e "${GREEN}✅ Backend deployed successfully!${NC}"
        ;;
    
    3)
        echo ""
        echo -e "${YELLOW}📦 Building Frontend...${NC}"
        cd "$LOCAL_FRONTEND_PATH"
        npm run build
        
        echo ""
        echo -e "${YELLOW}📤 Uploading Frontend...${NC}"
        rsync -avz --delete dist/ root@${LOAD_BALANCER_IP}:/var/www/fremio/dist/
        
        echo ""
        echo -e "${YELLOW}📤 Uploading Backend...${NC}"
        cd "$LOCAL_BACKEND_PATH"
        
        for ip in $APP_SERVER_1_IP $APP_SERVER_2_IP $APP_SERVER_3_IP; do
            echo "Deploying to $ip..."
            rsync -avz --exclude 'node_modules' --exclude '.env' --exclude 'logs' --exclude 'uploads' \
                ./ root@${ip}:/var/www/fremio-backend/
            
            ssh root@${ip} "cd /var/www/fremio-backend && npm install --production && pm2 restart all"
        done
        
        echo ""
        echo -e "${GREEN}✅ Full deployment completed!${NC}"
        ;;
    
    4)
        echo ""
        echo -e "${YELLOW}🔄 Restarting App Servers...${NC}"
        
        for ip in $APP_SERVER_1_IP $APP_SERVER_2_IP $APP_SERVER_3_IP; do
            echo "Restarting $ip..."
            ssh root@${ip} "pm2 restart all"
        done
        
        echo ""
        echo -e "${GREEN}✅ All App Servers restarted!${NC}"
        ;;
    
    5)
        echo ""
        echo -e "${YELLOW}📤 Uploading frame assets...${NC}"
        rsync -avz "$LOCAL_FRONTEND_PATH/public/frames/" \
            root@${FILE_STORAGE_IP}:/var/www/storage/uploads/frames/
        
        echo ""
        echo -e "${GREEN}✅ Frame assets updated!${NC}"
        ;;
    
    6)
        echo "Bye!"
        exit 0
        ;;
    
    *)
        echo -e "${RED}Pilihan tidak valid${NC}"
        exit 1
        ;;
esac

echo ""
echo "============================================"
