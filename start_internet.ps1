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
Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-File", "`"$serverScript`""
)
Start-Sleep -Seconds 2
Write-Host "Створюється публічне посилання LocalTunnel..." -ForegroundColor Yellow
Write-Host "Не закривайте це вікно під час гри."
& $npx.Source --yes localtunnel --port 3000
Read-Host "Натисніть Enter"
