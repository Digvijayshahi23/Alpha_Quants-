# Development Setup

## 1. Project structure
- `backend/`: FastAPI backend powered by Python 3.14 and managed by `uv`. Connects directly to WorldQuant BRAIN via an asynchronous HTTP client.
- `frontend/`: React + TypeScript frontend powered by Vite and `pnpm`.
- `~/.alpha-harness/`: Local data directory containing DuckDB catalogs and DuckDB vault databases.

## 2. Backend setup
The backend requires Python 3.14 and `uv`.
```bash
cd backend
uv sync
```

## 3. Frontend setup
The frontend requires Node.js 22.12+ and `pnpm`.
```bash
cd frontend
pnpm install
```

## 4. Environment variables
No external `.env` secrets or API keys are strictly necessary to run the application itself. Any required configuration is handled internally, and BRAIN authentication is explicitly handled through the application UI rather than environment variables. 
The application can and will start locally without external credentials.

## 5. Local data location
Local data is securely preserved at `~/.alpha-harness/`. This includes `catalog.duckdb` and vault data. 

## 6. Backend start command
To run the backend independently:
```bash
cd backend
uv run uvicorn alpha_harness.main:app --port 8000 --reload
```

## 7. Frontend start command
To run the frontend independently:
```bash
cd frontend
pnpm dev --host
```

## 8. API URL
The backend API is accessible locally at `http://127.0.0.1:8000`.

## 9. Frontend URL
The frontend application is accessible at `http://localhost:5173`.

## 10. Test commands
```bash
# Backend tests
cd backend
uv run pytest

# Frontend type checking
cd frontend
pnpm tsc --noEmit
```

## 11. Git workflow
This project is forked from `residual-lab/alpha-harness`.
You should push your personal development to `origin` (your GitHub), but you can pull upstream changes securely from `upstream`.
Always run `git fetch upstream` and review changes before merging into your personal project.

## 12. Upstream remote
`https://github.com/residual-lab/alpha-harness.git`

## 13. Personal origin
`https://github.com/Digvijayshahi23/alpha-producer.git`

## 14. BRAIN authentication setup
BRAIN authentication is securely separated from local application startup.
Navigate to `http://localhost:5173` and use the built-in Sign-in UI to securely authenticate with your WorldQuant BRAIN credentials. The system uses CAPTCHA verification + Basic Auth internally to fetch a session token from BRAIN.

## 15. Troubleshooting
- **Address already in use**: If you kill the server abruptly, the ports might still be held. Run `pkill -f "uvicorn alpha_harness.main:app"` and `pkill -f "vite"`.
- **Sign In Stuck (Resolved)**: A bug where background unauthenticated sync tasks triggered global rate limits that paused the sign-in request has been fixed.
- **Frontend Vite Errors**: Ensure you run `pnpm dev` *inside* the `frontend/` directory, not the project root.
