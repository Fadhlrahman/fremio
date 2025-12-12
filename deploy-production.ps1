# ================================================
# FREMIO PRODUCTION DEPLOYMENT SCRIPT (PowerShell)
# Deploy to KVM2 (api.fremio.id) + Cloudflare Pages
# ================================================

param(
    [ValidateSet('check', 'backup', 'backend', 'frontend', 'migrations', 'all', 'status', 'logs', 'rollback')]
    [string]$Action
)

$ErrorActionPreference = "Stop"

# Production Server Config
$PROD_HOST = "api.fremio.id"
$PROD_USER = "root"
$PROD_BACKEND_DIR = "/var/www/fremio/backend"

# Local Paths
$SCRIPT_DIR = $PSScriptRoot
$FRONTEND_DIR = Join-Path $SCRIPT_DIR "my-app"
$BACKEND_DIR = Join-Path $SCRIPT_DIR "backend"
$DATABASE_DIR = Join-Path $SCRIPT_DIR "database"

# Functions
function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host "  $Message" -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host ""
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

# Check dependencies
function Check-Dependencies {
    Write-Header "CHECKING DEPENDENCIES"
    
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Error "git tidak ditemukan"
        exit 1
    }
    Write-Success "git found"
    
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Error "npm tidak ditemukan"
        exit 1
    }
    Write-Success "npm found"
    
    if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
        Write-Error "ssh tidak ditemukan"
        exit 1
    }
    Write-Success "ssh found"
}

# Pre-deployment checks
function PreDeployment-Check {
    Write-Header "PRE-DEPLOYMENT CHECKS"
    
    # Check git status
    Write-Info "Checking git status..."
    $gitStatus = git status -s
    if ($gitStatus) {
        Write-Warning "Ada uncommitted changes:"
        git status -s
        Write-Host ""
        $continue = Read-Host "Lanjutkan? (y/n)"
        if ($continue -ne "y") {
            Write-Error "Deployment dibatalkan"
            exit 1
        }
    } else {
        Write-Success "Working directory clean"
    }
    
    # Check current branch
    $currentBranch = git branch --show-current
    Write-Info "Current branch: $currentBranch"
    
    if ($currentBranch -notin @("main", "master")) {
        Write-Warning "You're not on main/master branch!"
        $continue = Read-Host "Continue anyway? (y/n)"
        if ($continue -ne "y") {
            Write-Error "Deployment dibatalkan"
            exit 1
        }
    }
    
    # Check SSH connection
    Write-Info "Testing SSH connection to $PROD_HOST..."
    try {
        $sshTest = ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$PROD_USER@$PROD_HOST" "echo 'OK'" 2>&1
        if ($sshTest -match "OK") {
            Write-Success "SSH connection OK"
        } else {
            throw "Connection failed"
        }
    } catch {
        Write-Error "Cannot connect to $PROD_HOST"
        Write-Info "Make sure you have SSH key configured"
        exit 1
    }
}

# Backup database
function Backup-Database {
    Write-Header "DATABASE BACKUP"
    
    Write-Info "Creating database backup on production server..."
    
    $backupFile = "fremio_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
    
    ssh "$PROD_USER@$PROD_HOST" "cd $PROD_BACKEND_DIR && pg_dump -U fremio_user -h localhost fremio > backups/$backupFile && echo 'Backup created: backups/$backupFile'"
    
    Write-Success "Database backed up: $backupFile"
}

# Deploy Backend
function Deploy-Backend {
    Write-Header "DEPLOYING BACKEND"
    
    Push-Location $BACKEND_DIR
    
    # Create archive
    Write-Info "Creating backend archive..."
    $tempFile = Join-Path $env:TEMP "fremio-backend-prod.tar.gz"
    
    # Using tar (available in Windows 10+)
    tar -czf $tempFile --exclude='node_modules' --exclude='logs' --exclude='uploads' --exclude='backups' --exclude='.env' --exclude='*.log' .
    
    # Upload to production
    Write-Info "Uploading to production server..."
    scp $tempFile "${PROD_USER}@${PROD_HOST}:/tmp/"
    
    # Backup current backend
    Write-Info "Backing up current backend..."
    $backupName = "fremio-backend-backup-$(Get-Date -Format 'yyyyMMdd_HHmmss').tar.gz"
    ssh "$PROD_USER@$PROD_HOST" "cd $PROD_BACKEND_DIR && tar -czf ../$backupName --exclude='node_modules' --exclude='logs' --exclude='uploads' --exclude='backups' ."
    
    # Extract new backend
    Write-Info "Extracting new backend..."
    ssh "$PROD_USER@$PROD_HOST" "cd $PROD_BACKEND_DIR && tar -xzf /tmp/fremio-backend-prod.tar.gz && rm /tmp/fremio-backend-prod.tar.gz"
    
    # Install dependencies
    Write-Info "Installing dependencies..."
    ssh "$PROD_USER@$PROD_HOST" "cd $PROD_BACKEND_DIR && npm install --production"
    
    # Restart PM2
    Write-Info "Restarting backend service..."
    ssh "$PROD_USER@$PROD_HOST" "pm2 restart fremio-backend"
    
    # Cleanup local
    Remove-Item $tempFile -Force
    
    Pop-Location
    
    Write-Success "Backend deployed!"
}

# Deploy Frontend
function Deploy-Frontend {
    Write-Header "DEPLOYING FRONTEND TO CLOUDFLARE PAGES"
    
    Push-Location $FRONTEND_DIR
    
    # Check .env.production
    $envProdPath = Join-Path $FRONTEND_DIR ".env.production"
    if (-not (Test-Path $envProdPath)) {
        Write-Warning ".env.production tidak ditemukan, creating default..."
        @"
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
"@ | Out-File -FilePath $envProdPath -Encoding utf8
        Write-Warning "Please update .env.production with correct values!"
        Read-Host "Press Enter to continue..."
    }
    
    # Build
    Write-Info "Building frontend for production..."
    npm run build
    
    # Check wrangler
    if (-not (Get-Command wrangler -ErrorAction SilentlyContinue)) {
        Write-Warning "Wrangler CLI tidak ditemukan"
        Write-Info "Deploying via Git (Cloudflare Pages auto-deploy)..."
        
        Push-Location $SCRIPT_DIR
        git add .
        git commit -m "Deploy frontend to production" -ErrorAction SilentlyContinue
        git push origin main
        Pop-Location
        
        Write-Success "Frontend changes pushed to GitHub"
        Write-Info "Cloudflare Pages akan auto-deploy dalam beberapa menit"
        Write-Info "Check status: https://dash.cloudflare.com/"
    } else {
        # Deploy using wrangler
        Write-Info "Deploying with Wrangler CLI..."
        wrangler pages deploy dist --project-name=fremio
        Write-Success "Frontend deployed via Wrangler!"
    }
    
    Pop-Location
}

# Run migrations
function Run-Migrations {
    Write-Header "RUNNING DATABASE MIGRATIONS"
    
    $migrationsDir = Join-Path $DATABASE_DIR "migrations"
    
    if (Test-Path $migrationsDir) {
        Write-Info "Uploading migration files..."
        scp -r $migrationsDir "${PROD_USER}@${PROD_HOST}:/tmp/"
        
        # Run migrations
        Write-Info "Executing migrations..."
        ssh "$PROD_USER@$PROD_HOST" "cd /tmp/migrations && for file in *.sql; do echo 'Running \$file...'; psql -U fremio_user -h localhost -d fremio -f \$file; done"
        
        Write-Success "Migrations executed"
    } else {
        Write-Warning "No migrations directory found"
    }
}

# Check status
function Check-Status {
    Write-Header "PRODUCTION STATUS"
    
    Write-Info "Checking API health..."
    try {
        $health = Invoke-WebRequest -Uri "https://api.fremio.id/api/health" -UseBasicParsing -TimeoutSec 5
        Write-Success "API is running!"
        $health.Content | ConvertFrom-Json | ConvertTo-Json
    } catch {
        Write-Error "API not responding"
        Write-Info "Checking PM2 logs..."
        ssh "$PROD_USER@$PROD_HOST" "pm2 logs fremio-backend --lines 20 --nostream"
    }
    
    Write-Host ""
    Write-Info "Checking frontend..."
    try {
        $frontend = Invoke-WebRequest -Uri "https://fremio.id" -UseBasicParsing -TimeoutSec 5
        Write-Success "Frontend is accessible! (Status: $($frontend.StatusCode))"
    } catch {
        Write-Error "Frontend not accessible"
    }
    
    Write-Host ""
    Write-Info "PM2 Status on production:"
    ssh "$PROD_USER@$PROD_HOST" "pm2 status"
}

# Show menu
function Show-Menu {
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║   FREMIO PRODUCTION DEPLOYMENT TOOL       ║" -ForegroundColor Green
    Write-Host "║   Server: api.fremio.id (KVM2)            ║" -ForegroundColor Green
    Write-Host "╠═══════════════════════════════════════════╣" -ForegroundColor Green
    Write-Host "║                                           ║" -ForegroundColor Green
    Write-Host "║  1) Pre-deployment Check                  ║" -ForegroundColor Green
    Write-Host "║  2) Backup Database                       ║" -ForegroundColor Green
    Write-Host "║  3) Deploy Backend Only                   ║" -ForegroundColor Green
    Write-Host "║  4) Deploy Frontend Only                  ║" -ForegroundColor Green
    Write-Host "║  5) Run Database Migrations               ║" -ForegroundColor Green
    Write-Host "║  6) Full Deploy (All)                     ║" -ForegroundColor Green
    Write-Host "║  7) Check Production Status               ║" -ForegroundColor Green
    Write-Host "║  0) Exit                                  ║" -ForegroundColor Green
    Write-Host "║                                           ║" -ForegroundColor Green
    Write-Host "╚═══════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  WARNING: THIS DEPLOYS TO PRODUCTION!" -ForegroundColor Red
    Write-Host "   fremio.id AKAN TERPENGARUH" -ForegroundColor Red
    Write-Host ""
}

# Main
Check-Dependencies

# Handle command line argument
switch ($Action) {
    'check' {
        PreDeployment-Check
        exit 0
    }
    'backup' {
        PreDeployment-Check
        Backup-Database
        exit 0
    }
    'backend' {
        PreDeployment-Check
        Backup-Database
        Deploy-Backend
        Check-Status
        exit 0
    }
    'frontend' {
        Deploy-Frontend
        exit 0
    }
    'migrations' {
        PreDeployment-Check
        Backup-Database
        Run-Migrations
        exit 0
    }
    'all' {
        PreDeployment-Check
        Backup-Database
        Deploy-Backend
        Run-Migrations
        Deploy-Frontend
        Check-Status
        exit 0
    }
    'status' {
        Check-Status
        exit 0
    }
}

# Interactive menu
while ($true) {
    Show-Menu
    $choice = Read-Host "Pilih opsi [0-7]"
    
    switch ($choice) {
        '1' { PreDeployment-Check }
        '2' { Backup-Database }
        '3' {
            PreDeployment-Check
            Backup-Database
            Deploy-Backend
            Check-Status
        }
        '4' { Deploy-Frontend }
        '5' {
            PreDeployment-Check
            Backup-Database
            Run-Migrations
        }
        '6' {
            PreDeployment-Check
            Backup-Database
            Deploy-Backend
            Run-Migrations
            Deploy-Frontend
            Check-Status
        }
        '7' { Check-Status }
        '0' {
            Write-Info "Bye!"
            exit 0
        }
        default {
            Write-Error "Opsi tidak valid"
        }
    }
    
    Write-Host ""
    Read-Host "Press Enter to continue..."
}
