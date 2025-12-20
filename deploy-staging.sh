#!/bin/bash

# ================================================
# FREMIO STAGING DEPLOYMENT SCRIPT
# Deploy ke KVM 1 (72.61.210.203) ONLY
# TIDAK mempengaruhi production (fremio.id)
# ================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Staging Server Config
STAGING_IP="72.61.210.203"
STAGING_USER="root"
STAGING_API_URL="http://72.61.210.203/api"

# IMPORTANT: Do NOT hardcode passwords in repo.
# If you want password-based SSH with sshpass, export STAGING_PASS in your shell.
# Recommended: use SSH keys and leave STAGING_PASS empty.
STAGING_PASS="${STAGING_PASS:-}"

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/my-app"
BACKEND_DIR="$SCRIPT_DIR/backend"

# Functions
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if sshpass is installed
check_dependencies() {
    if [[ -n "$STAGING_PASS" ]]; then
        if ! command -v sshpass &> /dev/null; then
            print_error "sshpass tidak ditemukan. Install dengan: brew install hudochenkov/sshpass/sshpass"
            exit 1
        fi
    fi
}

# SSH command helper
ssh_staging() {
    if [[ -n "$STAGING_PASS" ]]; then
        sshpass -p "$STAGING_PASS" ssh -o StrictHostKeyChecking=no "$STAGING_USER@$STAGING_IP" "$1"
    else
        ssh -o StrictHostKeyChecking=no "$STAGING_USER@$STAGING_IP" "$1"
    fi
}

# SCP command helper
scp_staging() {
    if [[ -n "$STAGING_PASS" ]]; then
        sshpass -p "$STAGING_PASS" scp -o StrictHostKeyChecking=no -r "$1" "$STAGING_USER@$STAGING_IP:$2"
    else
        scp -o StrictHostKeyChecking=no -r "$1" "$STAGING_USER@$STAGING_IP:$2"
    fi
}

# Deploy Frontend
deploy_frontend() {
    print_header "DEPLOYING FRONTEND TO STAGING"
    
    cd "$FRONTEND_DIR"
    
    # Backup current .env
    if [ -f .env ]; then
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    # Create staging .env
    print_info "Creating staging environment..."
    cat > .env.staging.tmp << EOF
# STAGING ENVIRONMENT - AUTO GENERATED
VITE_BACKEND_MODE=vps
VITE_USE_VPS=true
VITE_DISABLE_HTTPS=false
VITE_API_URL=$STAGING_API_URL
VITE_API_BASE_URL=http://$STAGING_IP
VITE_APP_NAME=Fremio (Staging)
VITE_APP_URL=http://$STAGING_IP

# Midtrans (Snap) - Sandbox
# Provide this via shell when running the script, e.g.:
#   export VITE_MIDTRANS_CLIENT_KEY="Mid-client-..."
VITE_MIDTRANS_CLIENT_KEY=${VITE_MIDTRANS_CLIENT_KEY:-}
VITE_MIDTRANS_IS_PRODUCTION=false
EOF
    
    # Use staging env for build
    cp .env.staging.tmp .env
    
    # Build
    print_info "Building frontend..."
    npm run build
    
    # Restore original .env
    if [ -f .env.backup.* ]; then
        cp "$(ls -t .env.backup.* | head -1)" .env
    fi
    rm -f .env.staging.tmp
    
    # Create archive
    print_info "Creating archive..."
    tar -czf /tmp/fremio-frontend-staging.tar.gz -C dist .
    
    # Upload to staging
    print_info "Uploading to staging server..."
    scp_staging /tmp/fremio-frontend-staging.tar.gz /tmp/
    
    # Extract on server
    print_info "Extracting on staging server..."
    ssh_staging "rm -rf /var/www/fremio-frontend/* && tar -xzf /tmp/fremio-frontend-staging.tar.gz -C /var/www/fremio-frontend/ && rm /tmp/fremio-frontend-staging.tar.gz"
    
    # Cleanup local
    rm -f /tmp/fremio-frontend-staging.tar.gz
    
    print_success "Frontend deployed to staging!"
}

# Deploy Backend
deploy_backend() {
    print_header "DEPLOYING BACKEND TO STAGING"
    
    cd "$BACKEND_DIR"
    
    # Create archive (exclude node_modules, logs, uploads)
    print_info "Creating backend archive..."
    tar -czf /tmp/fremio-backend-staging.tar.gz \
        --exclude='node_modules' \
        --exclude='logs' \
        --exclude='uploads' \
        --exclude='.env' \
        .
    
    # Upload to staging
    print_info "Uploading to staging server..."
    scp_staging /tmp/fremio-backend-staging.tar.gz /tmp/
    
    # Extract on server (preserve uploads folder)
    print_info "Extracting on staging server..."
    ssh_staging "cd /var/www/fremio-backend && tar -xzf /tmp/fremio-backend-staging.tar.gz && rm /tmp/fremio-backend-staging.tar.gz"
    
    # Install dependencies & restart
    print_info "Installing dependencies and restarting..."
    ssh_staging "cd /var/www/fremio-backend && npm install --production && pm2 restart fremio-staging"
    
    # Cleanup local
    rm -f /tmp/fremio-backend-staging.tar.gz
    
    print_success "Backend deployed to staging!"
}

# Check staging status
check_status() {
    print_header "STAGING SERVER STATUS"
    
    print_info "Checking health endpoint..."
    HEALTH=$(curl -s "http://$STAGING_IP/health" 2>/dev/null || echo "failed")
    
    if [[ "$HEALTH" == *"success"* ]]; then
        print_success "API is running!"
        echo "$HEALTH" | jq . 2>/dev/null || echo "$HEALTH"
    else
        print_error "API not responding"
    fi
    
    echo ""
    print_info "Checking frames count..."
    FRAMES=$(curl -s "http://$STAGING_IP/api/frames" 2>/dev/null | jq '.pagination.total' 2>/dev/null || echo "0")
    print_success "Total frames: $FRAMES"
    
    echo ""
    print_info "PM2 Status:"
    ssh_staging "pm2 status" 2>/dev/null || print_warning "Cannot check PM2 status"
}

# Restart staging services
restart_staging() {
    print_header "RESTARTING STAGING SERVICES"
    
    print_info "Restarting PM2..."
    ssh_staging "pm2 restart fremio-staging"
    
    print_info "Reloading Nginx..."
    ssh_staging "systemctl reload nginx"
    
    print_success "Services restarted!"
}

# Show menu
show_menu() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     FREMIO STAGING DEPLOYMENT TOOL        ║${NC}"
    echo -e "${GREEN}║     Server: $STAGING_IP              ║${NC}"
    echo -e "${GREEN}╠═══════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║                                           ║${NC}"
    echo -e "${GREEN}║  1) Deploy Frontend only                  ║${NC}"
    echo -e "${GREEN}║  2) Deploy Backend only                   ║${NC}"
    echo -e "${GREEN}║  3) Deploy All (Frontend + Backend)       ║${NC}"
    echo -e "${GREEN}║  4) Check Staging Status                  ║${NC}"
    echo -e "${GREEN}║  5) Restart Staging Services              ║${NC}"
    echo -e "${GREEN}║  6) Open Staging in Browser               ║${NC}"
    echo -e "${GREEN}║  0) Exit                                  ║${NC}"
    echo -e "${GREEN}║                                           ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  INI HANYA DEPLOY KE STAGING!${NC}"
    echo -e "${YELLOW}   Production (fremio.id) TIDAK terpengaruh${NC}"
    echo ""
}

# Main
main() {
    check_dependencies
    
    # Check for command line argument
    case "${1:-}" in
        frontend|f)
            deploy_frontend
            exit 0
            ;;
        backend|b)
            deploy_backend
            exit 0
            ;;
        all|a)
            deploy_frontend
            deploy_backend
            check_status
            exit 0
            ;;
        status|s)
            check_status
            exit 0
            ;;
        restart|r)
            restart_staging
            exit 0
            ;;
        open|o)
            open "http://$STAGING_IP/"
            exit 0
            ;;
    esac
    
    # Interactive menu
    while true; do
        show_menu
        read -p "Pilih opsi [0-6]: " choice
        
        case $choice in
            1)
                deploy_frontend
                ;;
            2)
                deploy_backend
                ;;
            3)
                deploy_frontend
                deploy_backend
                check_status
                ;;
            4)
                check_status
                ;;
            5)
                restart_staging
                ;;
            6)
                open "http://$STAGING_IP/"
                ;;
            0)
                print_info "Bye!"
                exit 0
                ;;
            *)
                print_error "Opsi tidak valid"
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

main "$@"
