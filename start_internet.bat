@echo off
setlocal
cd /d "%~dp0"

where node.exe >nul 2>&1
if errorlevel 1 goto NODE_MISSING
where npx.cmd >nul 2>&1
if errorlevel 1 goto NPX_MISSING

start "СХОВИЩЕ — постійний сервер" /D "%~dp0" cmd /k call start_persistent_server.bat
timeout /t 2 /nobreak >nul

echo.
echo Створюється публічне посилання LocalTunnel...
echo Не закривайте це вікно під час гри.
echo.
npx.cmd --yes localtunnel --port 3000
set "EXIT_CODE=%ERRORLEVEL%"
echo.
echo LocalTunnel зупинився з кодом %EXIT_CODE%.
pause
exit /b %EXIT_CODE%

:NODE_MISSING
echo Node.js не знайдено. Встановіть Node.js LTS і запустіть файл знову.
pause
exit /b 1

:NPX_MISSING
echo npx не знайдено. Перевстановіть Node.js разом із npm.
pause
exit /b 1
