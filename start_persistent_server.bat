@echo off
setlocal
cd /d "%~dp0"
where node.exe >nul 2>&1
if errorlevel 1 goto NODE_MISSING

echo СХОВИЩЕ 1.0.5 — постійний сервер
echo Сервер автоматично перезапуститься після аварійної зупинки.
echo Для штатного завершення закрийте вікно або натисніть Ctrl+C.
echo.

:RUN
node.exe "%~dp0server.js"
set "EXIT_CODE=%ERRORLEVEL%"
if "%EXIT_CODE%"=="0" goto END
echo.
echo Сервер зупинився з кодом %EXIT_CODE%. Повторний запуск через 5 секунд...
timeout /t 5 /nobreak >nul
goto RUN

:NODE_MISSING
echo Node.js не знайдено. Встановіть Node.js LTS і запустіть файл знову.
pause
exit /b 1

:END
endlocal
