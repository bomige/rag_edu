@echo off
echo ================================================
echo RAG Playground Backend Server
echo ================================================

cd /d "%~dp0"

REM Python 가상환경 확인 및 활성화
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    REM fastapi 설치 여부 확인
    pip show fastapi >nul 2>&1
    if errorlevel 1 (
        echo [INFO] Installing dependencies...
        pip install -r requirements.txt
    )
) else (
    echo [INFO] Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo [INFO] Installing dependencies...
    pip install -r requirements.txt
)

echo.
echo Starting server...
echo Frontend: http://localhost:8523
echo API Docs: http://localhost:8523/docs
echo.

python main.py

pause
