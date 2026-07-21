Set-Location $PSScriptRoot
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js не знайдено. Встановіть Node.js LTS." -ForegroundColor Red
  Read-Host "Enter"
  exit 1
}
Write-Host "СХОВИЩЕ 1.0.5 — постійний сервер" -ForegroundColor Yellow
while ($true) {
  & node.exe "$PSScriptRoot\server.js"
  $code = $LASTEXITCODE
  if ($code -eq 0) { break }
  Write-Host "Сервер зупинився з кодом $code. Перезапуск через 5 секунд..." -ForegroundColor Red
  Start-Sleep -Seconds 5
}
