# PulseSaaS - Start with Docker (Production Mode)
# Usage: .\start-docker.ps1
# Requires: Docker Desktop installed and running

Write-Host "PulseSaaS - Starting with Docker..." -ForegroundColor Cyan

docker compose up -d

Write-Host ""
Write-Host "All services starting... Checking health..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

$services = @(
    @{ Name = "PostgreSQL"; Url = "http://localhost:5432" },
    @{ Name = "Redis"; Url = "http://localhost:6379" },
    @{ Name = "MongoDB"; Url = "http://localhost:27017" },
    @{ Name = "Web"; Url = "http://localhost:3000" },
    @{ Name = "Auth"; Url = "http://localhost:4001/health" },
    @{ Name = "Notification"; Url = "http://localhost:4002/health" },
    @{ Name = "Chat"; Url = "http://localhost:4003/health" },
    @{ Name = "Payment"; Url = "http://localhost:4004/health" },
    @{ Name = "URL Shortener"; Url = "http://localhost:4005/health" },
    @{ Name = "Vector"; Url = "http://localhost:4006/health" }
)

foreach ($svc in $services) {
    try {
        $null = Invoke-WebRequest -Uri $svc.Url -UseBasicParsing -TimeoutSec 3
        Write-Host "[OK] $($svc.Name)" -ForegroundColor Green
    } catch {
        Write-Host "[WAIT] $($svc.Name) - still starting..." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Services started! Open http://localhost:3000" -ForegroundColor Green
Start-Process "http://localhost:3000"
