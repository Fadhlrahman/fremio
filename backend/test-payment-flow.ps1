# Payment Integration Test Script
# Run this to test complete flow: Register → Login → Payment

Write-Host "`n🧪 TESTING COMPLETE PAYMENT FLOW" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Generate unique email
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$testEmail = "test$timestamp@fremio.com"

Write-Host "1️⃣  REGISTER NEW USER" -ForegroundColor Yellow
$registerBody = @{
    email = $testEmail
    password = "test123"
    displayName = "Test User $timestamp"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri 'https://localhost:5050/api/auth/register' `
        -Method Post -Body $registerBody -ContentType 'application/json'
    
    Write-Host "   ✅ Register berhasil!" -ForegroundColor Green
    Write-Host "   Email: $testEmail" -ForegroundColor White
    Write-Host "   User ID: $($registerResponse.user.id)`n" -ForegroundColor White
} catch {
    Write-Host "   ❌ Register gagal: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "2️⃣  LOGIN" -ForegroundColor Yellow
$loginBody = @{
    email = $testEmail
    password = "test123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri 'https://localhost:5050/api/auth/login' `
        -Method Post -Body $loginBody -ContentType 'application/json'
    
    $token = $loginResponse.token
    Write-Host "   ✅ Login berhasil!" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0,30))...`n" -ForegroundColor White
} catch {
    Write-Host "   ❌ Login gagal: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "3️⃣  CREATE PAYMENT" -ForegroundColor Yellow
$paymentBody = @{
    email = $testEmail
    name = "Test User"
    phone = "081234567890"
} | ConvertTo-Json

$headers = @{
    Authorization = "Bearer $token"
}

try {
    $paymentResponse = Invoke-RestMethod -Uri 'https://localhost:5050/api/payment/create' `
        -Method Post -Body $paymentBody -ContentType 'application/json' -Headers $headers
    
    Write-Host "   ✅ Payment berhasil dibuat!" -ForegroundColor Green
    Write-Host "   Order ID: $($paymentResponse.data.orderId)" -ForegroundColor White
    Write-Host "   Token: $($paymentResponse.data.token.Substring(0,30))..." -ForegroundColor White
    Write-Host "   Redirect URL: $($paymentResponse.data.redirectUrl)`n" -ForegroundColor White
    
    Write-Host "🎉 SEMUA TEST PASSED!" -ForegroundColor Green
    Write-Host "`nYou can test payment at:" -ForegroundColor Cyan
    Write-Host $paymentResponse.data.redirectUrl -ForegroundColor White
    
} catch {
    Write-Host "   ❌ Payment gagal!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Yellow
    }
    exit 1
}

Write-Host "`n💡 TROUBLESHOOTING FRONTEND:" -ForegroundColor Yellow
Write-Host "Kalau API works tapi browser gagal, coba:" -ForegroundColor White
Write-Host "1. Buka browser Console (F12)" -ForegroundColor White
Write-Host "2. Ketik: localStorage.clear()" -ForegroundColor White
Write-Host "3. Refresh dan register/login ulang" -ForegroundColor White
Write-Host "4. Cek Console untuk error message detail`n" -ForegroundColor White
