#!/bin/bash
set -e

# Resolve repository root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 1. Start backend and frontend in background
"$ROOT_DIR/start.sh"

# 2. Open browser to the workstation dashboard
open "http://localhost:5173" 2>/dev/null || true

# 3. Stream live colorful quantitative logs
"$ROOT_DIR/logs.sh"
