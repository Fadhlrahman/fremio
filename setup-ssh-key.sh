#!/bin/bash

# ================================================
# SETUP SSH KEY TO NEW SERVER
# ================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m'

SERVER="76.13.192.32"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║           🔑 SETUP SSH KEY TO NEW SERVER 🔑              ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "Server: $SERVER"
echo ""

# Check if SSH key exists
if [ ! -f ~/.ssh/id_ed25519 ]; then
    echo -e "${YELLOW}SSH key not found. Checking for other keys...${NC}"
    
    if [ -f ~/.ssh/id_rsa ]; then
        SSH_KEY=~/.ssh/id_rsa.pub
        echo -e "${GREEN}Found RSA key: $SSH_KEY${NC}"
    else
        echo -e "${YELLOW}No SSH key found. Generating new key...${NC}"
        echo ""
        ssh-keygen -t ed25519 -C "salwa@fremio-deployment" -f ~/.ssh/id_ed25519 -N ""
        SSH_KEY=~/.ssh/id_ed25519.pub
        echo ""
        echo -e "${GREEN}✅ New SSH key generated${NC}"
    fi
else
    SSH_KEY=~/.ssh/id_ed25519.pub
    echo -e "${GREEN}✅ SSH key found: $SSH_KEY${NC}"
fi

echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Copying SSH key to server...${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}You will be asked for the server password.${NC}"
echo -e "${BLUE}This is the ONLY time you need to enter it.${NC}"
echo ""

# Copy SSH key to server
ssh-copy-id -i $SSH_KEY root@$SERVER

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ SSH Key Setup Successful!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Testing passwordless connection..."
    
    if ssh -o BatchMode=yes root@$SERVER exit 2>/dev/null; then
        echo -e "${GREEN}✅ Passwordless SSH working!${NC}"
        echo ""
        echo -e "${YELLOW}Next step:${NC}"
        echo "  Run: ./quick-deploy.sh"
    else
        echo -e "${YELLOW}⚠️  Please try connecting manually:${NC}"
        echo "  ssh root@$SERVER"
    fi
else
    echo ""
    echo -e "${RED}❌ Failed to copy SSH key${NC}"
    echo ""
    echo "Please try manually:"
    echo "  ssh-copy-id root@$SERVER"
fi

echo ""
