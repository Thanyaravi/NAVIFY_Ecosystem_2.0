@echo off
title NAVIFY Real-Time Edge AI Assistant
echo =================================================================
echo    NAVIFY - Real-Time Assistive Vision System (YOLOv11-M)
echo    Department of CSE (AI ^& ML) - SVIT
echo =================================================================
echo.
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" run.py %*
) else (
    python run.py %*
)
pause
