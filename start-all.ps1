$host.ui.RawUI.WindowTitle = "PulseSaaS - ALL Services"
Set-Location "C:\Users\User\Desktop\notification service"

Write-Host "Starting all PulseSaaS services..." -ForegroundColor Cyan

$jobs = @()

# Start web
$jobs += Start-Job -Name "web" -ScriptBlock { Set-Location "C:\Users\User\Desktop\notification service\apps\web"; npx next dev -p 3000 2>&1 }
Write-Host "[+] Web (3000)" -ForegroundColor Green

# Start auth
$jobs += Start-Job -Name "auth" -ScriptBlock { Set-Location "C:\Users\User\Desktop\notification service\apps\auth-service"; npx tsx src/index.ts 2>&1 }
Write-Host "[+] Auth (4001)" -ForegroundColor Green

# Start notification
$jobs += Start-Job -Name "notify" -ScriptBlock { Set-Location "C:\Users\User\Desktop\notification service\apps\notification-service"; npx tsx src/index.ts 2>&1 }
Write-Host "[+] Notification (4002)" -ForegroundColor Green

# Start chat
$jobs += Start-Job -Name "chat" -ScriptBlock { Set-Location "C:\Users\User\Desktop\notification service\apps\chat-service"; npx tsx src/index.ts 2>&1 }
Write-Host "[+] Chat (4003)" -ForegroundColor Green

# Start payment
$jobs += Start-Job -Name "payment" -ScriptBlock { Set-Location "C:\Users\User\Desktop\notification service\apps\payment-service"; npx tsx src/index.ts 2>&1 }
Write-Host "[+] Payment (4004)" -ForegroundColor Green

# Start URL shortener
$jobs += Start-Job -Name "url" -ScriptBlock { Set-Location "C:\Users\User\Desktop\notification service\apps\url-shortener"; npx tsx src/index.ts 2>&1 }
Write-Host "[+] URL Shortener (4005)" -ForegroundColor Green

# Start vector
$jobs += Start-Job -Name "vector" -ScriptBlock { Set-Location "C:\Users\User\Desktop\notification service\apps\vector-service"; npx tsx src/index.ts 2>&1 }
Write-Host "[+] Vector (4006)" -ForegroundColor Green

# Start worker
$jobs += Start-Job -Name "worker" -ScriptBlock { Set-Location "C:\Users\User\Desktop\notification service\apps\job-worker"; npx tsx src/index.ts 2>&1 }
Write-Host "[+] Worker (BullMQ)" -ForegroundColor Green

Write-Host ""
Write-Host "Waiting 30 seconds for all services to boot..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "Service Health Check:" -ForegroundColor Cyan

$ports = @(3000, 4001, 4002, 4003, 4004, 4005, 4006)
$names = @("Web", "Auth", "Notify", "Chat", "Payment", "URL", "Vector")
for ($i = 0; $i -lt $ports.Count; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$($ports[$i])" -UseBasicParsing -TimeoutSec 2
        Write-Host "[OK] $($names[$i]) (:$($ports[$i]))" -ForegroundColor Green
    } catch {
        Write-Host "[DOWN] $($names[$i]) (:$($ports[$i]))" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Open http://localhost:3000" -ForegroundColor White
Start-Process "http://localhost:3000"

Write-Host "Press Ctrl+C to stop all services." -ForegroundColor Yellow
while ($true) { Start-Sleep -Seconds 60 }
