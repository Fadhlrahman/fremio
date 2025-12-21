$body = @{
    email = "admin@fremio.com"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "https://localhost:5050/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -ErrorAction SilentlyContinue

if ($response.success) {
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "User: $($response.user.email)" -ForegroundColor Cyan
    Write-Host "Role: $($response.user.role)" -ForegroundColor Cyan
    Write-Host "Token: $($response.token.Substring(0,20))..." -ForegroundColor Yellow
} else {
    Write-Host "❌ Login failed: $($response.message)" -ForegroundColor Red
}
