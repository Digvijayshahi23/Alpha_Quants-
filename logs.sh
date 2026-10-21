#!/bin/bash

# Resolve repository root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Launch the vibrant quantitative log colorizer & live stream
python3 "$ROOT_DIR/scripts/view_logs.py" "$@"
