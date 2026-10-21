#!/bin/bash

echo "Stopping Alpha Harness backend and frontend..."
pkill -f "uvicorn.*alpha_harness" 2>/dev/null || true
pkill -f "vite.*5173" 2>/dev/null || true
lsof -ti :8000 | xargs kill -9 2>/dev/null || true
lsof -ti :5173 | xargs kill -9 2>/dev/null || true

echo "All Alpha Harness processes stopped cleanly. Ports 8000 and 5173 are now free."
