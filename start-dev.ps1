# PulseSaaS - Start All Services (Development)
# Usage: .\start-dev.ps1
# This starts web + all 7 microservices with in-memory fallbacks (no Docker needed)

$ErrorActionPreference = "Stop"

Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     PulseSaaS - Starting All Services (Dev Mode)     ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$services = @(
    @{ Name = "Auth Service"; Dir = "apps/auth-service"; Port = 4001 },
    @{ Name = "Notification Service"; Dir = "apps/notification-service"; Port = 4002 },
    @{ Name = "Job Worker (BullMQ)"; Dir = "apps/job-worker"; Port = 0 },
    @{ Name = "Chat Service"; Dir = "apps/chat-service"; Port = 4003 },
    @{ Name = "Payment Service"; Dir = "apps/payment-service"; Port = 4004 },
    @{ Name = "URL Shortener"; Dir = "apps/url-shortener"; Port = 4005 },
    @{ Name = "Vector Service"; Dir = "apps/vector-service"; Port = 4006 }
)

# Start each service in its own window
foreach ($svc in $services) {
    Write-Host "[START] $($svc.Name) on port $($svc.Port)" -ForegroundColor Green
    Start-Process powershell -ArgumentList '-NoExit', '-Command', 
        "Write-Host '=== $($svc.Name) ===' -ForegroundColor Cyan; cd '$PSScriptRoot\$($svc.Dir)'; npx tsx watch src/index.ts"
    Start-Sleep -Seconds 1
}

# Start web frontend
Write-Host "[START] Next.js Web App on port 3000" -ForegroundColor Green
Start-Process powershell -ArgumentList '-NoExit', '-Command',
    "Write-Host '=== PulseSaaS Web ===' -ForegroundColor Cyan; cd '$PSScriptRoot\apps\web'; pnpm run dev"

Write-Host ""
Write-Host "All services starting... Wait ~30 seconds for everything to be ready." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Web:      http://localhost:3000" -ForegroundColor White
Write-Host "  Auth:      http://localhost:4001/health" -ForegroundColor White
Write-Host "  Notify:    http://localhost:4002/health" -ForegroundColor White
Write-Host "  Chat:      http://localhost:4003/health" -ForegroundColor White
Write-Host "  Payment:   http://localhost:4004/health" -ForegroundColor White
Write-Host "  URL:       http://localhost:4005/health" -ForegroundColor White
Write-Host "  Vector:    http://localhost:4006/health" -ForegroundColor White
Write-Host ""

# Open browser after delay
Start-Sleep -Seconds 15
Start-Process "http://localhost:3000"
