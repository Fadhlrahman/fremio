#!/bin/bash

#############################################
# Fremio Rollback Script
# Restore from backup
#############################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

VPS_USER="root"
VPS_HOST="72.61.214.5"

echo -e "${YELLOW}⚠️  Fremio Rollback Script${NC}"
echo ""

# Check available backups
echo -e "${BLUE}📦 Available backups:${NC}"
echo ""

ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
    echo "Backend backups:"
    ls -lh /var/www/backups/backend-backup-*.tar.gz 2>/dev/null | tail -5
    
    echo ""
    echo "Frontend backups:"
    ls -lh /var/www/backups/frontend-backup-*.tar.gz 2>/dev/null | tail -5
ENDSSH

echo ""
echo -e "${YELLOW}To rollback, SSH to VPS and run:${NC}"
echo ""
echo -e "${BLUE}# List backups${NC}"
echo "ls -lh /var/www/backups/"
echo ""
echo -e "${BLUE}# Restore backend${NC}"
echo "cd /var/www"
echo "rm -rf fremio-backend"
echo "tar -xzf backups/backend-backup-YYYYMMDD_HHMMSS.tar.gz"
echo "pm2 restart fremio-api"
echo ""
echo -e "${BLUE}# Restore frontend${NC}"
echo "cd /var/www"
echo "rm -rf fremio"
echo "tar -xzf backups/frontend-backup-YYYYMMDD_HHMMSS.tar.gz"
