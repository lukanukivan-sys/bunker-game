@echo off
setlocal EnableExtensions
cd /d "%~dp0"

where node.exe >nul 2>&1
if errorlevel 1 goto NODE_MISSING
where npx.cmd >nul 2>&1
if errorlevel 1 goto NPX_MISSING

start "СХОВИЩЕ — постійний сервер" /D "%~dp0" cmd /k call start_persistent_server.bat

echo.
echo Перевіряється локальний сервер http://127.0.0.1:3000 ...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$deadline=(Get-Date).AddSeconds(30); do { try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 2; if($r.StatusCode -eq 200){ exit 0 } } catch {}; Start-Sleep -Seconds 1 } while((Get-Date)-lt $deadline); exit 1"
if errorlevel 1 goto SERVER_FAILED

echo Локальний сервер працює.
echo.
echo Створюється публічне посилання LocalTunnel...
echo ВАЖЛИВО: надсилайте гравцям лише НОВЕ посилання з цього вікна.
echo Старе посилання після перезапуску може показувати Bad Gateway.
echo Не закривайте обидва вікна під час гри.
echo.

:TUNNEL
npx.cmd --yes localtunnel --port 3000 --local-host 127.0.0.1
set "EXIT_CODE=%ERRORLEVEL%"
echo.
echo LocalTunnel зупинився з кодом %EXIT_CODE%.
choice /C RN /N /M "R — створити нове посилання, N — завершити: "
if errorlevel 2 exit /b %EXIT_CODE%
goto TUNNEL

:SERVER_FAILED
echo.
echo ПОМИЛКА: сервер не відповідає на http://127.0.0.1:3000/api/health
echo Перевірте окреме вікно «СХОВИЩЕ — постійний сервер».
echo Якщо там написано EADDRINUSE, закрийте старі вікна Node.js і запустіть цей файл знову.
pause
exit /b 1

:NODE_MISSING
echo Node.js не знайдено. Встановіть Node.js LTS і запустіть файл знову.
pause
exit /b 1

:NPX_MISSING
echo npx не знайденено. Перевстановіть Node.js разом із npm.
pause
exit /b 1
