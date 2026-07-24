@echo off
setlocal
cd /d "%~dp0"
where node.exe >nul 2>&1
if errorlevel 1 goto NODE_MISSING

echo СХОВИЩЕ 1.2.11 — запуск сервера
echo.
node.exe "%~dp0scripts\platform_data_preflight.js"
if errorlevel 1 goto DATA_FAILED
node.exe "%~dp0server.js"
set "EXIT_CODE=%ERRORLEVEL%"
if "%EXIT_CODE%"=="0" goto END

echo.
echo Сервер зупинився з кодом %EXIT_CODE%.
pause
exit /b %EXIT_CODE%

:DATA_FAILED
echo.
echo Запуск зупинено: платформні дані пошкоджено або вони мають несумісну структуру.
echo Перевірте повідомлення вище та файли у папці data.
pause
exit /b 1

:NODE_MISSING
echo Node.js не знайдено або він недоступний у PATH.
echo Встановіть Node.js LTS, закрийте це вікно та запустіть файл знову.
pause
exit /b 1

:END
endlocal
