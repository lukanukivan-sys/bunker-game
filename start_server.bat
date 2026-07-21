@echo off
setlocal
cd /d "%~dp0"
where node.exe >nul 2>&1
if errorlevel 1 goto NODE_MISSING

echo СХОВИЩЕ 1.0.5 — запуск сервера
echo.
node.exe "%~dp0server.js"
set "EXIT_CODE=%ERRORLEVEL%"
if "%EXIT_CODE%"=="0" goto END

echo.
echo Сервер зупинився з кодом %EXIT_CODE%.
pause
exit /b %EXIT_CODE%

:NODE_MISSING
echo Node.js не знайдено або він недоступний у PATH.
echo Встановіть Node.js LTS, закрийте це вікно та запустіть файл знову.
pause
exit /b 1

:END
endlocal
