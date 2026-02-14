#!/bin/bash

# ================================================
# FREMIO - PREPARE ENV FILES
# ================================================
# Script untuk membuat .env files dari template
# ================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║      📝 FREMIO - SETUP ENVIRONMENT FILES 📝              ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

NEW_SERVER="76.13.192.32"

# ================================================
# BACKEND .ENV
# ================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Backend Environment Setup${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  backend/.env already exists!${NC}"
    echo -n "Overwrite? (y/n): "
    read -r overwrite
    if [ "$overwrite" != "y" ]; then
        echo "   Skipping backend/.env"
    else
        cp backend/.env.production.template backend/.env
        echo -e "${GREEN}✅ backend/.env created from template${NC}"
    fi
else
    cp backend/.env.production.template backend/.env
    echo -e "${GREEN}✅ backend/.env created from template${NC}"
fi

echo ""
echo -e "${BLUE}🔧 Configure JWT Secret${NC}"
echo "Generating random JWT secret..."

# Generate random JWT secret
JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)

# Update JWT_SECRET in backend/.env
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" backend/.env
else
    # Linux
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" backend/.env
fi

echo -e "${GREEN}✅ JWT_SECRET updated with random value${NC}"

echo ""
echo -e "${BLUE}🌐 Configure Frontend URL${NC}"
echo ""
echo "Select Frontend URL option:"
echo "  1) Use IP address: http://$NEW_SERVER (default)"
echo "  2) Use domain: https://fremio.id"
echo "  3) Custom URL"
echo ""
echo -n "Enter choice (1-3) [1]: "
read -r url_choice

case $url_choice in
    2)
        FRONTEND_URL="https://fremio.id"
        ALLOWED_ORIGINS="https://fremio.id,https://www.fremio.id,http://localhost:5180"
        ;;
    3)
        echo -n "Enter custom frontend URL: "
        read -r FRONTEND_URL
        ALLOWED_ORIGINS="$FRONTEND_URL,http://localhost:5180"
        ;;
    *)
        FRONTEND_URL="http://$NEW_SERVER"
        ALLOWED_ORIGINS="http://$NEW_SERVER,https://$NEW_SERVER,http://localhost:5180"
        ;;
esac

# Update FRONTEND_URL and ALLOWED_ORIGINS
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|FRONTEND_URL=.*|FRONTEND_URL=$FRONTEND_URL|" backend/.env
    sed -i '' "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=$ALLOWED_ORIGINS|" backend/.env
else
    sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=$FRONTEND_URL|" backend/.env
    sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=$ALLOWED_ORIGINS|" backend/.env
fi

echo -e "${GREEN}✅ Frontend URL configured: $FRONTEND_URL${NC}"

# ================================================
# FRONTEND .ENV
# ================================================
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Frontend Environment Setup${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -f "my-app/.env" ]; then
    echo -e "${YELLOW}⚠️  my-app/.env already exists!${NC}"
    echo -n "Overwrite? (y/n): "
    read -r overwrite
    if [ "$overwrite" != "y" ]; then
        echo "   Skipping my-app/.env"
    else
        cp my-app/.env.production.template my-app/.env
        echo -e "${GREEN}✅ my-app/.env created from template${NC}"
    fi
else
    cp my-app/.env.production.template my-app/.env
    echo -e "${GREEN}✅ my-app/.env created from template${NC}"
fi

# Update APP_URL in frontend
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|VITE_APP_URL=.*|VITE_APP_URL=$FRONTEND_URL|" my-app/.env
else
    sed -i "s|VITE_APP_URL=.*|VITE_APP_URL=$FRONTEND_URL|" my-app/.env
fi

echo -e "${GREEN}✅ Frontend APP_URL configured: $FRONTEND_URL${NC}"

# ================================================
# SUMMARY
# ================================================
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Environment Files Ready!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo "   Backend .env:  backend/.env"
echo "   Frontend .env: my-app/.env"
echo ""
echo -e "${BLUE}🔐 Security:${NC}"
echo "   JWT Secret: ✅ Generated (64 chars)"
echo "   Frontend URL: $FRONTEND_URL"
echo ""
echo -e "${YELLOW}⚠️  Review Configuration:${NC}"
echo "   1. Check backend/.env - especially Midtrans keys"
echo "   2. Check my-app/.env - especially Midtrans client key"
echo ""
echo -e "${GREEN}Next step:${NC}"
echo "   Run: ./deploy-to-new-server.sh"
echo ""
