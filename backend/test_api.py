import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_login_demo():
    res = client.post("/api/v1/auth/login", json={
        "username_or_email": "trader",
        "password": "password123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["username"] == "trader"

    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Test me
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "trader"

    # Test trades list
    trades_res = client.get("/api/v1/trades", headers=headers)
    assert trades_res.status_code == 200
    trades_data = trades_res.json()
    assert "items" in trades_data
    assert trades_data["total"] >= 6

    # Test analytics
    analytics_res = client.get("/api/v1/analytics", headers=headers)
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()
    assert "summary" in analytics_data
    assert analytics_data["summary"]["total_trades"] >= 6
    assert "equity_curve" in analytics_data
