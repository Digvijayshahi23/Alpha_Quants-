# Alpha Harness

<a href="https://www.star-history.com/?repos=residual-lab%2Falpha-harness&type=date&legend=bottom-right">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=residual-lab/alpha-harness&type=date&theme=dark&legend=bottom-right" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=residual-lab/alpha-harness&type=date&legend=bottom-right" />
    <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=residual-lab/alpha-harness&type=date&legend=bottom-right" />
  </picture>
</a>

A high-performance local quantitative research workstation for the WorldQuant BRAIN platform.

## Architecture

Alpha Harness operates as a unified client-server workstation designed for high-density quantitative alpha research, simulation management, catalog mining, and quarterly progression pacing:

- **Frontend (`frontend/`)**: React 19 + TypeScript + Vite + Tailwind CSS v4, built with the Alpha Harness dark workstation design system (`DESIGN.md`).
- **Backend (`backend/`)**: Python 3.14 + FastAPI + SQLAlchemy 2.0 (asyncio) + DuckDB + SQLite + Uvicorn.
- **Local Data Vault (`~/.alpha-harness/`)**:
  - `catalog.duckdb`: Analytical data store holding over 1.2M market fields, 138k alphas, and 6M+ PnL datapoints.
  - `harness.db`: SQLite database for simulation state, trial records (144k simulations), research planner sessions, and quarterly target configurations.

## Workspace Navigation

The workstation interface is organized into five structured operational tiers:

1. **Overview & Simulation**:
   - `Dashboard`: Real-time system health, simulation matrix, active worker slots, and quick actions.
   - `Simulation Matrix`: Mass concurrent simulation runner with core-slot queuing and live diagnostics.
2. **Research & Ideation**:
   - `Research Planner`: Structured hypothesis formulation, strategy classification, dataset tagging, and batch queueing.
   - `Data Explorer`: High-performance multi-market dataset and field discovery engine with coverage filtering.
   - `Research Labs`: Template Lab, Search Lab, Evolution Lab, Super Alpha, and Power Pool workflows.
   - `Tools`: Settings Sampler, Submission Planner, and Correlation Breaker.
3. **Execution & Results**:
   - `Tasks`: Active simulation queue, worker slot allocations, and batch controls.
   - `Alphas`: Searchable repository of simulated alphas, metrics (Sharpe, turnover, fitness, drawdown), and equity curves.
   - `Portfolio`: Correlation matrix inspection, cluster analysis, and portfolio optimization.
4. **BRAIN Integration**:
   - `Quarter Command Center`: Real-time pacing metrics, required daily/weekly run-rates, progression targets (Minimum, Primary, Stretch), and interactive target configuration.
   - `Pyramids`: Hierarchy and universe allocation tracking across active pyramids.
   - `Competitions`: WorldQuant BRAIN live competition standings and target universes.
   - `Sync`: Automated and manual sync pipelines with WorldQuant BRAIN.
5. **Configuration**:
   - `LLM Integration`: Model provider configuration, prompt templates, and AI-assisted hypothesis generation.

## Development & Setup

### Prerequisites

- Python 3.14+ (managed via `uv`)
- Node.js 22+ and `pnpm`
- Existing local research database in `~/.alpha-harness/`

### Running the Application

#### 1. Backend Server
```bash
cd backend
uv run uvicorn alpha_harness.main:app --app-dir src --port 8000
```

#### 2. Frontend Development Server
```bash
cd frontend
pnpm dev --host --port 5173
```
Open [http://localhost:5173](http://localhost:5173) in your browser. The Vite dev server automatically proxies all `/api` and `/ws` traffic to the FastAPI backend.

#### 3. Standalone Production Build
The frontend compiles directly into `backend/src/alpha_harness/web`, allowing the Python backend to serve the entire workstation without Node:
```bash
# Build frontend bundle into backend static directory
cd frontend
pnpm build

# Serve unified app on port 8000
cd ../backend
uv run uvicorn alpha_harness.main:app --app-dir src --port 8000
```
Open [http://localhost:8000](http://localhost:8000) directly.

## Testing & Quality Assurance

Both frontend and backend include automated validation suites:

```bash
# Backend Linting (Ruff)
cd backend
uv run ruff check

# Backend End-to-End API & Persistence Integration Tests (Pytest)
cd backend
uv run pytest tests/

# Frontend Linting & Type Checking (Biome + TypeScript)
cd frontend
pnpm check

# Frontend Production Build (Vite)
cd frontend
pnpm build
```

## License

MIT License. See [LICENSE](LICENSE) for details. Original work Copyright (c) 2026 MiracleInvoker / Residual Lab.
