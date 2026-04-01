"""Tests that verify correct 503 behavior when the database is unavailable."""
import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException

import api.main as main


def _raise_db_unavailable():
    raise HTTPException(status_code=503, detail="Database unavailable")


@pytest.fixture()
def client_no_db(monkeypatch):
    """TestClient with pool init disabled and get_connection raising 503."""
    monkeypatch.setattr(main, "init_pool", lambda: None)
    monkeypatch.setattr(main, "db_pool", None)
    monkeypatch.setattr(main, "get_connection", _raise_db_unavailable)

    with TestClient(main.app, raise_server_exceptions=False) as c:
        yield c


def test_ready_returns_503_when_db_is_unavailable(client_no_db):
    r = client_no_db.get("/ready")
    assert r.status_code == 503


def test_debug_db_with_valid_token_returns_503_when_db_is_unavailable(
    client_no_db, monkeypatch
):
    monkeypatch.setenv("ADMIN_TOKEN", "test-secret")
    r = client_no_db.get("/debug-db", headers={"X-Admin-Token": "test-secret"})
    assert r.status_code == 503
