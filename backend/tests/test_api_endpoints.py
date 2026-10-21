import httpx2 as httpx
import pytest
from starlette.testclient import TestClient

from alpha_harness.main import app


@pytest.fixture(scope="module")
def client():
    # If the Alpha Harness server is already running, test against it directly
    # to avoid DuckDB single-process write lock conflicts.
    try:
        r = httpx.get("http://127.0.0.1:8000/api/health", timeout=1.0)
        if r.status_code == 200:
            with httpx.Client(
                base_url="http://127.0.0.1:8000",
                headers={"host": "127.0.0.1", "sec-fetch-site": "same-origin"},
            ) as c:
                yield c
            return
    except (httpx.HTTPError, OSError):
        pass

    with TestClient(app, headers={"host": "127.0.0.1", "sec-fetch-site": "same-origin"}) as c:
        yield c


def test_health_endpoint(client: TestClient) -> None:
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "version" in data
    assert "dataDir" in data
    assert data["database"] is True
    assert "activeSimulations" in data


def test_today_endpoint(client: TestClient) -> None:
    res = client.get("/api/today")
    assert res.status_code == 200
    data = res.json()
    assert "step" in data
    assert "simulations" in data
    assert "catalog" in data
    assert "assistant" in data


def test_quarter_endpoint(client: TestClient) -> None:
    res = client.get("/api/quarter")
    assert res.status_code == 200
    data = res.json()
    assert "label" in data
    assert "start" in data
    assert "end" in data
    assert "submitted" in data
    assert "pyramidsFormulated" in data
    assert "targets" in data
    assert "pacing" in data

    pacing = data["pacing"]
    assert pacing["daysRemaining"] >= 0
    assert pacing["requiredDailySignals"] >= 0
    assert pacing["requiredWeeklySignals"] >= 0


def test_quarter_config_update(client: TestClient) -> None:
    # First get current quarter info
    current = client.get("/api/quarter").json()
    year = int(current["label"].split("-Q")[0])
    q_num = int(current["label"].split("-Q")[1])

    # Update config with explicit client header for POST/PUT writes
    payload = {
        "year": year,
        "quarter": q_num,
        "start_date": current["start"],
        "end_date": current["end"],
        "min_signals": 25,
        "min_pyramids": 12,
        "primary_signals": 130,
        "primary_pyramids": 35,
        "stretch_signals": 250,
        "stretch_pyramids": 70,
        "buffer_signals_pct": 1.15,
        "buffer_pyramids_pct": 1.15,
    }
    update_res = client.put(
        "/api/quarter/config",
        json=payload,
        headers={"x-harness-client": "1"},
    )
    assert update_res.status_code == 200
    updated_targets = update_res.json()
    assert updated_targets["minSignals"] == 25
    assert updated_targets["primarySignals"] == 130

    # Verify updated values persist when fetching /api/quarter
    refetched = client.get("/api/quarter").json()
    assert refetched["targets"]["minSignals"] == 25
    assert refetched["targets"]["primarySignals"] == 130


def test_planner_sessions_lifecycle(client: TestClient) -> None:
    # Create a new research session
    session_payload = {
        "region": "USA",
        "delay": 1,
        "universe": "TOP3000",
        "dataset_category": "analyst_sentiment",
        "strategy_type": "Mean Reversion",
        "hypothesis": "Test automated hypothesis persistence",
        "status": "IN_PROGRESS",
    }
    create_res = client.post(
        "/api/planner/sessions",
        json=session_payload,
        headers={"x-harness-client": "1"},
    )
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["id"] > 0
    assert created["region"] == "USA"
    assert created["hypothesis"] == "Test automated hypothesis persistence"

    # Verify it appears in the sessions list
    list_res = client.get("/api/planner/sessions")
    assert list_res.status_code == 200
    sessions = list_res.json()
    matching = [s for s in sessions if s["id"] == created["id"]]
    assert len(matching) == 1
    assert matching[0]["hypothesis"] == "Test automated hypothesis persistence"


def test_discovery_alphas(client: TestClient) -> None:
    res = client.get("/api/lab-tasks/discovery?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "alphas" in data
    assert "total" in data
    assert "regions" in data["summary"]
    assert len(data["alphas"]) <= 10


def test_vault_overview(client: TestClient) -> None:
    res = client.get("/api/vault")
    assert res.status_code == 200
    data = res.json()
    assert "counts" in data
    assert "scopes" in data
    assert "backfilling" in data


def test_catalog_counts_and_size(client: TestClient) -> None:
    # First get size
    size_res = client.get("/api/catalog/size")
    assert size_res.status_code == 200
    size_data = size_res.json()
    assert "used_bytes" in size_data or "usedBytes" in size_data

    # Scopes
    scopes_res = client.get("/api/catalog/scopes")
    assert scopes_res.status_code == 200
    scopes = scopes_res.json()
    assert isinstance(scopes, list)
    assert len(scopes) > 0

    # Query counts with first scope
    first = scopes[0]
    itype = first.get("instrument_type") or first.get("instrumentType")
    region = first.get("region")
    delay = first.get("delay")
    universe = first.get("universe")
    counts_res = client.get(
        f"/api/catalog/counts?instrumentType={itype}&region={region}&delay={delay}&universe={universe}"
    )
    assert counts_res.status_code == 200
    counts = counts_res.json()
    assert "datasets" in counts
    assert "fields" in counts


def test_catalog_pyramids(client: TestClient) -> None:
    # Requires BRAIN authentication; returns 401 when unauthenticated or 200
    res = client.get("/api/catalog/pyramids")
    assert res.status_code in (200, 401)
    if res.status_code == 200:
        data = res.json()
        assert isinstance(data, (dict, list))


def test_competitions(client: TestClient) -> None:
    # Requires BRAIN authentication; returns 401 when unauthenticated or 200
    res = client.get("/api/competitions")
    assert res.status_code in (200, 401)
    if res.status_code == 200:
        data = res.json()
        assert isinstance(data, (dict, list))



def test_preferences(client: TestClient) -> None:
    res = client.get("/api/preferences")
    assert res.status_code == 200
    prefs = res.json()
    assert isinstance(prefs, dict)


def test_lab_tasks_list(client: TestClient) -> None:
    res = client.get("/api/lab-tasks")
    assert res.status_code == 200
    tasks_data = res.json()
    assert "slots" in tasks_data
    assert "tasks" in tasks_data

