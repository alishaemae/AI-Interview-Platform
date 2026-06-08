@echo off
title AI Interview Platform
echo.
echo ========================================
echo   AI Interview Platform - Starting
echo ========================================
echo.

set ROOT=%~dp0
cd /d "%ROOT%"

echo [1/5] Building frontend...
cd /d "%ROOT%frontend"
if not exist node_modules (
    echo      Installing npm packages...
    call npm install
)
call npx vite build
if not exist dist\index.html (
    echo ERROR: Frontend build failed! dist\index.html not found.
    echo Try running manually: cd frontend ^& npm run build
    pause
    exit /b 1
)
echo      Build OK: dist\index.html exists

echo [2/5] Copying to Electron...
cd /d "%ROOT%"
if exist "electron\web" rmdir /s /q "electron\web"
mkdir "electron\web"
robocopy "frontend\dist" "electron\web" /e /nfl /ndl /njh /njs /nc /ns /np >nul 2>&1
if not exist "electron\web\index.html" (
    echo ERROR: Copy failed!
    echo Trying xcopy fallback...
    xcopy /s /e /y /q "frontend\dist\*" "electron\web\" >nul 2>&1
)
echo      Files in electron\web:
dir /b "electron\web"

echo [3/5] Checking Electron deps...
cd /d "%ROOT%electron"
if not exist node_modules (
    echo      Installing Electron...
    call npm install
)

echo [4/5] Starting backend...
cd /d "%ROOT%backend"
if exist interview_platform.db del interview_platform.db
start "Backend" /min cmd /c "uvicorn app.main:app --port 8000 2>&1 & pause"
ping 127.0.0.1 -n 5 >nul

echo [5/5] Launching desktop app...
cd /d "%ROOT%electron"
echo.
echo ========================================
echo   App is running!
echo   Backend: http://localhost:8000/docs
echo ========================================
echo.
call .\node_modules\.bin\electron .

echo Stopping backend...
taskkill /fi "WINDOWTITLE eq Backend" /f >nul 2>&1
echo Done.
pause
