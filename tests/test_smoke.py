import pytest
from fastapi.testclient import TestClient

import api.main as main


@pytest.fixture(scope="module")
def client():
    # Prevent startup pool initialization so tests run without a real DB
    main.init_pool = lambda: None
    main.db_pool = None

    with TestClient(main.app) as c:
        yield c


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ok"


def test_root(client):
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert "status" in data


def test_debug_db_without_token(client):
    r = client.get("/debug-db")
    assert r.status_code == 401
