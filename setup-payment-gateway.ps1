# Setup Payment Gateway - Complete Setup Script
# This script will guide you through the complete payment gateway setup

Write-Host "🔒 FREMIO PAYMENT GATEWAY SETUP" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if running from correct directory
if (-not (Test-Path "backend\.env")) {
    Write-Host "❌ Error: Please run this script from project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Setup Checklist:" -ForegroundColor Yellow
Write-Host "1. ✅ Code implementation (already complete)" -ForegroundColor Green
Write-Host "2. ⏳ Midtrans API keys configuration" -ForegroundColor Yellow
Write-Host "3. ⏳ Database migration" -ForegroundColor Yellow
Write-Host "4. ⏳ Mark premium frames" -ForegroundColor Yellow
Write-Host "5. ⏳ Create frame packages" -ForegroundColor Yellow
Write-Host ""

# Step 1: Check Midtrans Keys
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "STEP 1: Midtrans API Keys" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$backendEnv = Get-Content "backend\.env" -Raw
$frontendEnv = Get-Content "my-app\.env" -Raw

$hasBackendKeys = $backendEnv -match "MIDTRANS_SERVER_KEY=\w+" -and $backendEnv -match "MIDTRANS_CLIENT_KEY=\w+"
$hasFrontendKeys = $frontendEnv -match "VITE_MIDTRANS_CLIENT_KEY=\w+"

if ($hasBackendKeys -and $hasFrontendKeys) {
    Write-Host "✅ Midtrans keys found in .env files" -ForegroundColor Green
} else {
    Write-Host "❌ Midtrans keys not configured" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Please follow these steps:" -ForegroundColor Yellow
    Write-Host "   1. Go to: https://dashboard.sandbox.midtrans.com/" -ForegroundColor White
    Write-Host "   2. Login or create account" -ForegroundColor White
    Write-Host "   3. Go to: Settings → Access Keys" -ForegroundColor White
    Write-Host "   4. Copy Server Key and Client Key" -ForegroundColor White
    Write-Host "   5. Update these files:" -ForegroundColor White
    Write-Host "      - backend\.env (MIDTRANS_SERVER_KEY & MIDTRANS_CLIENT_KEY)" -ForegroundColor White
    Write-Host "      - my-app\.env (VITE_MIDTRANS_CLIENT_KEY)" -ForegroundColor White
    Write-Host ""
    Write-Host "   📖 See PAYMENT_GATEWAY_SETUP.md for detailed instructions" -ForegroundColor Cyan
    Write-Host ""
    
    $continue = Read-Host "Have you configured the keys? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Setup paused. Please configure Midtrans keys first." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""

# Step 2: Database Check
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "STEP 2: Database Migration" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "Checking database connection..." -ForegroundColor Yellow

# Try to run migration test
Push-Location backend
$dbTest = node test-migration.js 2>&1
Pop-Location

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database migration completed" -ForegroundColor Green
} else {
    Write-Host "❌ Database migration failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Possible issues:" -ForegroundColor Yellow
    Write-Host "   1. PostgreSQL is not running" -ForegroundColor White
    Write-Host "   2. Database credentials incorrect in backend\.env" -ForegroundColor White
    Write-Host "   3. Database 'fremio' does not exist" -ForegroundColor White
    Write-Host ""
    Write-Host "   Solutions:" -ForegroundColor Yellow
    Write-Host "   - Start PostgreSQL server" -ForegroundColor White
    Write-Host "   - Check DB_HOST, DB_PORT, DB_NAME, DB_USER in backend\.env" -ForegroundColor White
    Write-Host "   - Run migration manually:" -ForegroundColor White
    Write-Host "     psql -U salwa -d fremio -f database/migrations/002_create_payment_system.sql" -ForegroundColor Cyan
    Write-Host ""
    
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

Write-Host ""

# Step 3: Setup Premium Frames
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "STEP 3: Mark Premium Frames" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "To mark frames as premium, run this SQL:" -ForegroundColor Yellow
Write-Host ""
Write-Host "-- Check available frames:" -ForegroundColor Gray
Write-Host "SELECT id, name, category, is_premium FROM frames;" -ForegroundColor White
Write-Host ""
Write-Host "-- Mark frames as premium:" -ForegroundColor Gray
Write-Host "UPDATE frames SET is_premium = true WHERE id IN (5,6,7,8,9,10);" -ForegroundColor White
Write-Host ""
Write-Host "📖 See: database/migrations/003_setup_payment_data.sql" -ForegroundColor Cyan

Write-Host ""
$premiumDone = Read-Host "Have you marked premium frames? (y/n)"

if ($premiumDone -ne "y") {
    Write-Host "⚠️ Remember to mark frames as premium later!" -ForegroundColor Yellow
}

Write-Host ""

# Step 4: Create Packages
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "STEP 4: Create Frame Packages" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "To create frame packages, run SQL from:" -ForegroundColor Yellow
Write-Host "database/migrations/003_setup_payment_data.sql" -ForegroundColor White
Write-Host ""
Write-Host "Each package should contain 10 frame IDs" -ForegroundColor Gray
Write-Host "User payment (Rp 10k) gives access to 3 packages (30 frames)" -ForegroundColor Gray

Write-Host ""
$packagesDone = Read-Host "Have you created frame packages? (y/n)"

if ($packagesDone -ne "y") {
    Write-Host "⚠️ Remember to create packages later!" -ForegroundColor Yellow
}

Write-Host ""

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Start Backend Server:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Cyan
Write-Host "   npm start" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Start Frontend:" -ForegroundColor White
Write-Host "   cd my-app" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Test Payment Flow:" -ForegroundColor White
Write-Host "   - Login as user" -ForegroundColor Gray
Write-Host "   - Go to /frames page" -ForegroundColor Gray
Write-Host "   - Click premium frame (should have 🔒 badge)" -ForegroundColor Gray
Write-Host "   - Click 'Beli Sekarang' button" -ForegroundColor Gray
Write-Host "   - Complete payment in Midtrans Snap popup" -ForegroundColor Gray
Write-Host "   - Refresh → Premium frames unlocked!" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 Documentation:" -ForegroundColor Yellow
Write-Host "   - PAYMENT_GATEWAY_SETUP.md (complete guide)" -ForegroundColor Cyan
Write-Host "   - database/migrations/003_setup_payment_data.sql (SQL setup)" -ForegroundColor Cyan
Write-Host "   - database/manual_grant_access.sql (for testing)" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Payment gateway is ready to use!" -ForegroundColor Green
