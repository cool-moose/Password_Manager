#!/bin/bash
# Linux/Mac Launcher for Password Manager

# Get the directory where this script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "========================================"
echo "   Password Manager - Launcher"
echo "========================================"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm nie jest zainstalowany. Zainstaluj Node.js i npm."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[1/2] Instalowanie zaleznosci..."
    npm install
    if [ $? -ne 0 ]; then
        echo "BLAD: Nie udalo sie zainstalowac zaleznosci!"
        exit 1
    fi
fi

echo "[2/2] Uruchamianie aplikacji (client + server)..."
echo ""
echo "TIP: Serwer uruchamia sie automatycznie razem z klientem."
echo "     Aby zatrzymac - nacisnij Ctrl+C"
echo ""

npm run dev
