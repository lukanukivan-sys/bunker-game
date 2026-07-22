$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

$node = Get-Command node.exe -ErrorAction SilentlyContinue
$npx = Get-Command npx.cmd -ErrorAction SilentlyContinue
if (-not $node -or -not $npx) {
    Write-Host "Node.js або npx не знайдено." -ForegroundColor Red
    Read-Host "Натисніть Enter"
    exit 1
}

$serverScript = Join-Path $PSScriptRoot "start_persistent_server.ps1"
Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$serverScript`"")

Write-Host "Перевіряється локальний сервер http://127.0.0.1:3000 ..." -ForegroundColor Yellow
$deadline = (Get-Date).AddSeconds(30)
$ready = $false
do {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:3000/api/health" -TimeoutSec 2
        if ($response.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
} while ((Get-Date) -lt $deadline)
if (-not $ready) {
    Write-Host "Сервер не відповідає. Перевірте окреме вікно сервера." -ForegroundColor Red
    Read-Host "Натисніть Enter"
    exit 1
}

Write-Host "Локальний сервер працює." -ForegroundColor Green
Write-Host "Надсилайте гравцям лише нове посилання з цього вікна." -ForegroundColor Yellow
Write-Host "Старе посилання після перезапуску може показувати Bad Gateway."
while ($true) {
    & $npx.Source --yes localtunnel --port 3000 --local-host 127.0.0.1
    $answer = Read-Host "LocalTunnel зупинився. Введіть R для нового посилання або N для завершення"
    if ($answer -notmatch '^[RrРр]$') { break }
}
