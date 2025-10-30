@echo off
REM Activate virtual environment and run OCR service

echo [INFO] Navigating to server directory...
REM Navigate to server directory (where this batch file is located)
cd /d "%~dp0"

echo [INFO] Activating virtual environment...
REM Activate the virtual environment (using activate.bat for Windows batch files)
call .venv\Scripts\activate.bat

echo [INFO] Checking Python location...
where python

echo [INFO] Python version:
python --version

echo.
echo [INFO] Starting OCR service...
echo.
REM Run the Python script
python ocr_service_fast.py

pause
