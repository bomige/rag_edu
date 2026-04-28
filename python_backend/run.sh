#!/bin/bash
echo "================================================"
echo "RAG Playground Backend Server"
echo "================================================"

cd "$(dirname "$0")"

# Python 가상환경 확인 및 활성화
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "[INFO] Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    echo "[INFO] Installing dependencies..."
    pip install -r requirements.txt
fi

echo ""
echo "Starting server..."
echo "Frontend: http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo ""

python main.py
