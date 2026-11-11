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


def test_hyperliquid_import():
    res = client.post("/api/v1/auth/login", json={
        "username_or_email": "trader",
        "password": "password123"
    })
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    sample_csv = (
        "time,coin,dir,px,sz,ntl,fee,closedPnl\n"
        "01/15/2026 - 10:00:00,TESTCOIN,Open Long,100.0,1.0,100.0,0.05,-0.05\n"
        "01/15/2026 - 10:30:00,TESTCOIN,Open Long,110.0,1.0,110.0,0.05,-0.05\n"
        "01/15/2026 - 12:00:00,TESTCOIN,Close Long,120.0,2.0,240.0,0.10,29.90\n"
    )
    files = {"file": ("trade_history.csv", sample_csv, "text/csv")}
    imp_res = client.post("/api/v1/trades/import/hyperliquid", headers=headers, files=files)
    assert imp_res.status_code == 200
    imp_data = imp_res.json()
    assert imp_data["imported_count"] == 1
    assert imp_data["skipped_duplicates"] == 0
    assert imp_data["trades"][0]["entry_price"] == 105.0
    assert imp_data["trades"][0]["quantity"] == 2.0
    assert imp_data["trades"][0]["pnl"] == 29.8

    # Re-importing same CSV should skip duplicate
    imp_res2 = client.post("/api/v1/trades/import/hyperliquid", headers=headers, files=files)
    assert imp_res2.status_code == 200
    assert imp_res2.json()["imported_count"] == 0
    assert imp_res2.json()["skipped_duplicates"] == 1

    # Clean up test trade
    tid = imp_data["trades"][0]["id"]
    del_res = client.delete(f"/api/v1/trades/{tid}", headers=headers)
    assert del_res.status_code == 204
