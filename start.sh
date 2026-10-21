#!/bin/bash
set -e

# Resolve repository root regardless of which directory the script is executed from
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "Clearing any previous processes on ports 8000 and 5173..."
pkill -f "uvicorn.*alpha_harness" 2>/dev/null || true
pkill -f "vite.*5173" 2>/dev/null || true
lsof -ti :8000 | xargs kill -9 2>/dev/null || true
lsof -ti :5173 | xargs kill -9 2>/dev/null || true
sleep 1

echo "Starting Alpha Harness backend on port 8000..."
cd "$ROOT_DIR/backend"
nohup uv run uvicorn alpha_harness.main:app --app-dir src --reload-dir src --port 8000 --use-colors > "$ROOT_DIR/backend/backend.log" 2>&1 &

sleep 2

echo "Starting Alpha Harness frontend on port 5173..."
cd "$ROOT_DIR/frontend"
nohup pnpm dev --host > "$ROOT_DIR/frontend/frontend.log" 2>&1 &

echo ""
echo "Alpha Harness is now active in background!"
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "Status check: ./status.sh | Stop all: ./stop.sh"
