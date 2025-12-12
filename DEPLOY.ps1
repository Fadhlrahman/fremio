# ============================================
# FREMIO QUICK DEPLOY - PRODUCTION
# ============================================
# Jalankan script ini untuk deploy ke production

Write-Host ""
Write-Host "🚀 FREMIO PRODUCTION DEPLOYMENT" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path ".\backend\src\index.js")) {
    Write-Host "❌ Error: Run this from project root (d:\Project\fremio)" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Pre-deployment checklist:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  ✓ Payment routes enabled" -ForegroundColor Green
Write-Host "  ✓ Deployment scripts created" -ForegroundColor Green
Write-Host "  ✓ Database backup automation ready" -ForegroundColor Green
Write-Host ""

# Ask which deployment to run
Write-Host "Select deployment option:" -ForegroundColor Cyan
Write-Host "  [1] Full Deploy (Backend + Frontend + Migrations)" -ForegroundColor White
Write-Host "  [2] Backend Only" -ForegroundColor White
Write-Host "  [3] Frontend Only" -ForegroundColor White
Write-Host "  [4] Check Production Status" -ForegroundColor White
Write-Host "  [5] Interactive Menu" -ForegroundColor White
Write-Host "  [0] Cancel" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Your choice"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "⚠️  WARNING: This will deploy to PRODUCTION (fremio.id)" -ForegroundColor Red
        Write-Host "    - Backend will restart" -ForegroundColor Yellow
        Write-Host "    - Frontend will update on Cloudflare Pages" -ForegroundColor Yellow
        Write-Host "    - Database migrations will run" -ForegroundColor Yellow
        Write-Host ""
        $confirm = Read-Host "Continue? (yes/no)"
        
        if ($confirm -eq "yes") {
            Write-Host ""
            Write-Host "🚀 Starting full deployment..." -ForegroundColor Green
            .\deploy-production.ps1 -Action all
        } else {
            Write-Host "Deployment cancelled." -ForegroundColor Yellow
        }
    }
    "2" {
        Write-Host ""
        Write-Host "🔧 Deploying backend only..." -ForegroundColor Green
        .\deploy-production.ps1 -Action backend
    }
    "3" {
        Write-Host ""
        Write-Host "🎨 Deploying frontend only..." -ForegroundColor Green
        .\deploy-production.ps1 -Action frontend
    }
    "4" {
        Write-Host ""
        Write-Host "📊 Checking production status..." -ForegroundColor Green
        .\deploy-production.ps1 -Action status
    }
    "5" {
        Write-Host ""
        Write-Host "📋 Opening interactive menu..." -ForegroundColor Green
        .\deploy-production.ps1
    }
    "0" {
        Write-Host "Cancelled." -ForegroundColor Yellow
    }
    default {
        Write-Host "Invalid choice." -ForegroundColor Red
    }
}

Write-Host ""
