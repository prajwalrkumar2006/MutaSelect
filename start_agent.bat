@echo off
title MutaSelect AI - Local Windows EDA Agent
color 0B

echo ======================================================================
echo          MutaSelect AI - Local Windows EDA Execution Agent
echo   Connecting ModelSim (vsim/vlog) and Vivado (xvlog/xsim) to Web UI
echo ======================================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not found in PATH!
    echo Please install Python 3.10+ from python.org and ensure "Add Python to PATH" is checked.
    pause
    exit /b 1
)

echo [1/3] Checking dependencies...
python -m pip install fastapi uvicorn pydantic >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Pip install had warnings. Proceeding with launch...
)

echo [2/3] Initializing SQLite database and scanning EDA toolchains...
echo.

echo [3/3] Launching Local EDA Agent on http://127.0.0.1:8000 ...
echo Keep this terminal open while using MutaSelect AI in your browser.
echo.
python local_eda_agent.py --port 8000

pause
