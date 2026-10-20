#!/bin/bash
echo "Checking ports 8000 and 5173..."
pkill -f uvicorn 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
lsof -ti :8000 | xargs kill -9 2>/dev/null || true
lsof -ti :5173 | xargs kill -9 2>/dev/null || true

echo "Starting backend in background..."
cd backend
nohup uv run uvicorn alpha_harness.main:app --app-dir src --reload --port 8000 --use-colors > backend.log 2>&1 &
cd ..

sleep 2

echo "Starting frontend in background..."
cd frontend
nohup pnpm dev --host > frontend.log 2>&1 &
cd ..

echo "Alpha Harness is now fully running in the background!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "You can safely close this terminal and the engine will keep running."
