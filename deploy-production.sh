#!/bin/bash

# ================================================
# FREMIO PRODUCTION DEPLOYMENT SCRIPT
# Deploy to KVM2 (api.fremio.id) + Cloudflare Pages
# ================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Production Server Config (KVM2)
PROD_HOST="api.fremio.id"
PROD_USER="root"
PROD_PORT="22"
PROD_BACKEND_DIR="/var/www/fremio/backend"
PROD_FRONTEND_DIR="/var/www/fremio/frontend"

# Local Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/my-app"
BACKEND_DIR="$SCRIPT_DIR/backend"
DATABASE_DIR="$SCRIPT_DIR/database"

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

# Check dependencies
check_dependencies() {
    print_header "CHECKING DEPENDENCIES"
    
    if ! command -v git &> /dev/null; then
        print_error "git tidak ditemukan"
        exit 1
    fi
    print_success "git found"
    
    if ! command -v npm &> /dev/null; then
        print_error "npm tidak ditemukan"
        exit 1
    fi
    print_success "npm found"
    
    if ! command -v ssh &> /dev/null; then
        print_error "ssh tidak ditemukan"
        exit 1
    fi
    print_success "ssh found"
}

# Pre-deployment checks
pre_deployment_check() {
    print_header "PRE-DEPLOYMENT CHECKS"
    
    # Check git status
    print_info "Checking git status..."
    if [[ -n $(git status -s) ]]; then
        print_warning "Ada uncommitted changes:"
        git status -s
        echo ""
        read -p "Lanjutkan? (y/n): " continue_deploy
        if [[ "$continue_deploy" != "y" ]]; then
            print_error "Deployment dibatalkan"
            exit 1
        fi
    else
        print_success "Working directory clean"
    fi
    
    # Check current branch
    CURRENT_BRANCH=$(git branch --show-current)
    print_info "Current branch: $CURRENT_BRANCH"
    
    if [[ "$CURRENT_BRANCH" != "main" ]] && [[ "$CURRENT_BRANCH" != "master" ]]; then
        print_warning "You're not on main/master branch!"
        read -p "Continue anyway? (y/n): " continue_branch
        if [[ "$continue_branch" != "y" ]]; then
            print_error "Deployment dibatalkan"
            exit 1
        fi
    fi
    
    # Check SSH connection
    print_info "Testing SSH connection to $PROD_HOST..."
    if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$PROD_USER@$PROD_HOST" "echo 'OK'" &>/dev/null; then
        print_success "SSH connection OK"
    else
        print_error "Cannot connect to $PROD_HOST"
        print_info "Make sure you have SSH key configured or use: ssh-copy-id $PROD_USER@$PROD_HOST"
        exit 1
    fi
}

# Backup database
backup_database() {
    print_header "DATABASE BACKUP"
    
    print_info "Creating database backup on production server..."
    
    BACKUP_FILE="fremio_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    ssh "$PROD_USER@$PROD_HOST" "cd $PROD_BACKEND_DIR && \
        pg_dump -U fremio_user -h localhost fremio > backups/$BACKUP_FILE && \
        echo 'Backup created: backups/$BACKUP_FILE'"
    
    print_success "Database backed up: $BACKUP_FILE"
}

# Deploy Backend
deploy_backend() {
    print_header "DEPLOYING BACKEND"
    
    cd "$BACKEND_DIR"
    
    # Create archive (exclude node_modules, logs, uploads)
    print_info "Creating backend archive..."
    tar -czf /tmp/fremio-backend-prod.tar.gz \
        --exclude='node_modules' \
        --exclude='logs' \
        --exclude='uploads' \
        --exclude='backups' \
        --exclude='.env' \
        --exclude='*.log' \
        .
    
    # Upload to production
    print_info "Uploading to production server..."
    scp /tmp/fremio-backend-prod.tar.gz "$PROD_USER@$PROD_HOST:/tmp/"
    
    # Backup current backend
    print_info "Backing up current backend..."
    ssh "$PROD_USER@$PROD_HOST" "cd $PROD_BACKEND_DIR && \
        tar -czf ../fremio-backend-backup-$(date +%Y%m%d_%H%M%S).tar.gz \
        --exclude='node_modules' \
        --exclude='logs' \
        --exclude='uploads' \
        --exclude='backups' \
        ."
    
    # Extract new backend
    print_info "Extracting new backend..."
    ssh "$PROD_USER@$PROD_HOST" "cd $PROD_BACKEND_DIR && \
        tar -xzf /tmp/fremio-backend-prod.tar.gz && \
        rm /tmp/fremio-backend-prod.tar.gz"
    
    # Install dependencies
    print_info "Installing dependencies..."
    ssh "$PROD_USER@$PROD_HOST" "cd $PROD_BACKEND_DIR && npm install --production"
    
    # Restart PM2
    print_info "Restarting backend service..."
    ssh "$PROD_USER@$PROD_HOST" "pm2 restart fremio-backend"
    
    # Cleanup local
    rm -f /tmp/fremio-backend-prod.tar.gz
    
    print_success "Backend deployed!"
}

# Deploy Frontend (Cloudflare Pages)
deploy_frontend() {
    print_header "DEPLOYING FRONTEND TO CLOUDFLARE PAGES"
    
    cd "$FRONTEND_DIR"
    
    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        print_warning ".env.production tidak ditemukan, creating default..."
        cat > .env.production << EOF
# Production Environment
VITE_BACKEND_MODE=vps
VITE_USE_VPS=true
VITE_DISABLE_HTTPS=false
VITE_API_URL=https://api.fremio.id/api
VITE_API_BASE_URL=https://api.fremio.id
VITE_APP_NAME=Fremio
VITE_APP_URL=https://fremio.id
VITE_ENABLE_ANALYTICS=true
VITE_MIDTRANS_CLIENT_KEY=your_midtrans_production_client_key
EOF
        print_warning "Please update .env.production with correct values!"
        read -p "Press Enter to continue..."
    fi
    
    # Build with production env
    print_info "Building frontend for production..."
    npm run build
    
    # Check if wrangler is installed
    if ! command -v wrangler &> /dev/null; then
        print_warning "Wrangler CLI tidak ditemukan"
        print_info "Deploying via Git (Cloudflare Pages auto-deploy)..."
        
        cd "$SCRIPT_DIR"
        git add .
        git commit -m "Deploy frontend to production" || true
        git push origin main
        
        print_success "Frontend changes pushed to GitHub"
        print_info "Cloudflare Pages akan auto-deploy dalam beberapa menit"
        print_info "Check status: https://dash.cloudflare.com/"
    else
        # Deploy using wrangler
        print_info "Deploying with Wrangler CLI..."
        wrangler pages deploy dist --project-name=fremio
        print_success "Frontend deployed via Wrangler!"
    fi
}

# Run database migrations
run_migrations() {
    print_header "RUNNING DATABASE MIGRATIONS"
    
    print_info "Checking for pending migrations..."
    
    # Upload migration files
    if [ -d "$DATABASE_DIR/migrations" ]; then
        print_info "Uploading migration files..."
        scp -r "$DATABASE_DIR/migrations" "$PROD_USER@$PROD_HOST:/tmp/"
        
        # Run migrations
        print_info "Executing migrations..."
        ssh "$PROD_USER@$PROD_HOST" "cd /tmp/migrations && \
            for file in *.sql; do \
                echo \"Running \$file...\"; \
                psql -U fremio_user -h localhost -d fremio -f \"\$file\"; \
            done"
        
        print_success "Migrations executed"
    else
        print_warning "No migrations directory found"
    fi
}

# Check production status
check_status() {
    print_header "PRODUCTION STATUS"
    
    print_info "Checking API health..."
    HEALTH=$(curl -s "https://api.fremio.id/api/health" 2>/dev/null || echo "failed")
    
    if [[ "$HEALTH" == *"success"* ]] || [[ "$HEALTH" == *"ok"* ]]; then
        print_success "API is running!"
        echo "$HEALTH" | jq . 2>/dev/null || echo "$HEALTH"
    else
        print_error "API not responding"
        print_info "Checking PM2 logs..."
        ssh "$PROD_USER@$PROD_HOST" "pm2 logs fremio-backend --lines 20 --nostream"
    fi
    
    echo ""
    print_info "Checking frontend..."
    FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" "https://fremio.id" 2>/dev/null || echo "000")
    
    if [[ "$FRONTEND" == "200" ]]; then
        print_success "Frontend is accessible!"
    else
        print_error "Frontend returned status: $FRONTEND"
    fi
    
    echo ""
    print_info "PM2 Status on production:"
    ssh "$PROD_USER@$PROD_HOST" "pm2 status"
    
    echo ""
    print_info "Nginx Status:"
    ssh "$PROD_USER@$PROD_HOST" "systemctl status nginx --no-pager | head -20"
}

# Show logs
show_logs() {
    print_header "PRODUCTION LOGS"
    
    print_info "Showing PM2 logs (Ctrl+C to exit)..."
    ssh "$PROD_USER@$PROD_HOST" "pm2 logs fremio-backend"
}

# Rollback
rollback() {
    print_header "ROLLBACK"
    
    print_warning "This will restore the most recent backup"
    read -p "Are you sure? (yes/no): " confirm
    
    if [[ "$confirm" != "yes" ]]; then
        print_info "Rollback cancelled"
        return
    fi
    
    print_info "Finding latest backup..."
    LATEST_BACKUP=$(ssh "$PROD_USER@$PROD_HOST" "ls -t $PROD_BACKEND_DIR/../fremio-backend-backup-*.tar.gz | head -1")
    
    if [[ -z "$LATEST_BACKUP" ]]; then
        print_error "No backup found!"
        return
    fi
    
    print_info "Restoring from: $LATEST_BACKUP"
    ssh "$PROD_USER@$PROD_HOST" "cd $PROD_BACKEND_DIR && \
        rm -rf ./* && \
        tar -xzf $LATEST_BACKUP && \
        npm install --production && \
        pm2 restart fremio-backend"
    
    print_success "Rollback complete!"
}

# Show menu
show_menu() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   FREMIO PRODUCTION DEPLOYMENT TOOL       ║${NC}"
    echo -e "${GREEN}║   Server: api.fremio.id (KVM2)            ║${NC}"
    echo -e "${GREEN}╠═══════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║                                           ║${NC}"
    echo -e "${GREEN}║  1) Pre-deployment Check                  ║${NC}"
    echo -e "${GREEN}║  2) Backup Database                       ║${NC}"
    echo -e "${GREEN}║  3) Deploy Backend Only                   ║${NC}"
    echo -e "${GREEN}║  4) Deploy Frontend Only                  ║${NC}"
    echo -e "${GREEN}║  5) Run Database Migrations               ║${NC}"
    echo -e "${GREEN}║  6) Full Deploy (All)                     ║${NC}"
    echo -e "${GREEN}║  7) Check Production Status               ║${NC}"
    echo -e "${GREEN}║  8) Show Logs                             ║${NC}"
    echo -e "${GREEN}║  9) Rollback Backend                      ║${NC}"
    echo -e "${GREEN}║  0) Exit                                  ║${NC}"
    echo -e "${GREEN}║                                           ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${RED}⚠️  WARNING: THIS DEPLOYS TO PRODUCTION!${NC}"
    echo -e "${RED}   fremio.id AKAN TERPENGARUH${NC}"
    echo ""
}

# Main
main() {
    check_dependencies
    
    # Check for command line argument
    case "${1:-}" in
        check|c)
            pre_deployment_check
            exit 0
            ;;
        backup|db)
            pre_deployment_check
            backup_database
            exit 0
            ;;
        backend|b)
            pre_deployment_check
            backup_database
            deploy_backend
            check_status
            exit 0
            ;;
        frontend|f)
            deploy_frontend
            exit 0
            ;;
        migrations|m)
            pre_deployment_check
            backup_database
            run_migrations
            exit 0
            ;;
        all|a)
            pre_deployment_check
            backup_database
            deploy_backend
            run_migrations
            deploy_frontend
            check_status
            exit 0
            ;;
        status|s)
            check_status
            exit 0
            ;;
        logs|l)
            show_logs
            exit 0
            ;;
        rollback|r)
            rollback
            exit 0
            ;;
    esac
    
    # Interactive menu
    while true; do
        show_menu
        read -p "Pilih opsi [0-9]: " choice
        
        case $choice in
            1)
                pre_deployment_check
                ;;
            2)
                backup_database
                ;;
            3)
                pre_deployment_check
                backup_database
                deploy_backend
                check_status
                ;;
            4)
                deploy_frontend
                ;;
            5)
                pre_deployment_check
                backup_database
                run_migrations
                ;;
            6)
                pre_deployment_check
                backup_database
                deploy_backend
                run_migrations
                deploy_frontend
                check_status
                ;;
            7)
                check_status
                ;;
            8)
                show_logs
                ;;
            9)
                rollback
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
