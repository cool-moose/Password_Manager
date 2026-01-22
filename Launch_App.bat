@echo off
cd /d "%~dp0"
echo ========================================
echo    Password Manager - Launcher
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo [1/2] Instalowanie zaleznosci...
    npm install
    if errorlevel 1 (
        echo BLAD: Nie udalo sie zainstalowac zaleznosci!
        pause
        exit /b 1
    )
)

echo [2/2] Uruchamianie aplikacji (client + server)...
echo.
echo TIP: Serwer uruchamia sie automatycznie razem z klientem.
echo      Aby zatrzymac - nacisnij Ctrl+C
echo.

npm run dev

pause