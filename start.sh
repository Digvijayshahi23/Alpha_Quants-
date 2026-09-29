#!/bin/bash
set -e
echo "Checking ports 8000 and 5173..."
lsof -ti :8000 | xargs kill -9 2>/dev/null || true
lsof -ti :5173 | xargs kill -9 2>/dev/null || true
echo "Starting backend..."
cd backend
uv run uvicorn alpha_harness.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..
sleep 2
echo "Starting frontend..."
cd frontend
pnpm dev --host &
FRONTEND_PID=$!
cd ..
trap "kill $BACKEND_PID $FRONTEND_PID; exit 0" SIGINT SIGTERM
wait
