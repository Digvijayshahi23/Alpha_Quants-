#!/bin/bash

echo "=== Alpha Harness Services ==="
echo ""
echo "Backend (port 8000):"
lsof -i :8000 2>/dev/null || echo "  Not running"
echo ""
echo "Frontend (port 5173):"
lsof -i :5173 2>/dev/null || echo "  Not running"
echo ""
