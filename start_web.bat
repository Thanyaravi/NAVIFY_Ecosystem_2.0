@echo off
title NAVIFY Web Ecosystem (Emergent Caregiver Portal)
echo =================================================================
echo    Starting NAVIFY Web Ecosystem (FastAPI Backend + React Portal)
echo =================================================================
echo.
cd /d "%~dp0"

echo [1/2] Starting Backend API on http://localhost:8000 ...
start "NAVIFY Backend API" cmd /k "cd /d "%~dp0\backend" && "..\.venv\Scripts\python.exe" -m uvicorn server:app --reload --port 8000"

echo [2/2] Starting React Web Portal on http://localhost:3000 ...
start "NAVIFY Caregiver Portal" cmd /k "cd /d "%~dp0\frontend" && npm start"

echo.
echo Both services are booting!
echo Caregiver Portal: http://localhost:3000
echo Backend API Docs: http://localhost:8000/docs
echo.
pause
