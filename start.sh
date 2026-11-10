#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "========================================="
echo "       🚀 Запуск TradeBook MVP           "
echo "========================================="

# 1. Check Python virtual environment
if [ ! -d "backend/venv" ]; then
    echo "📦 Створення віртуального середовища Python..."
    python3 -m venv backend/venv
    backend/venv/bin/pip install -r backend/requirements.txt
fi

# 2. Seed database if not exists
PYTHONPATH=backend backend/venv/bin/python3 backend/seed_demo.py

# 3. Check frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Встановлення залежностей Frontend..."
    cd frontend && npm install && cd ..
fi

echo "-----------------------------------------"
echo "🌐 Бекенд API: http://localhost:8000"
echo "📄 Swagger UI:  http://localhost:8000/docs"
echo "💻 Веб-клієнт:  http://localhost:5173"
echo "-----------------------------------------"
echo "Натисніть Ctrl+C для зупинки обох серверів."

# Trap SIGINT to kill background processes on exit
cleanup() {
    echo ""
    echo "🛑 Зупинка TradeBook..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start backend
PYTHONPATH=backend backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start frontend
cd frontend
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!
cd ..

wait $BACKEND_PID $FRONTEND_PID
