$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js не знайдено. Встановіть Node.js LTS." -ForegroundColor Red
    Read-Host "Натисніть Enter"
    exit 1
}
& node.exe "$PSScriptRoot\server.js"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Сервер зупинився з кодом $LASTEXITCODE." -ForegroundColor Red
    Read-Host "Натисніть Enter"
}
