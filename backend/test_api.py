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


def test_monthly_reporting_periods():
    res = client.post("/api/v1/auth/login", json={
        "username_or_email": "trader",
        "password": "password123"
    })
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    base_all = client.get("/api/v1/analytics", headers=headers).json()
    base_overall_pnl = base_all["overall_total_pnl"]
    base_overall_trades = base_all["overall_total_trades"]

    created_ids = []
    try:
        t1 = client.post("/api/v1/trades", headers=headers, json={
            "symbol": "TESTMONTH1/USDT",
            "market": "CRYPTO",
            "direction": "LONG",
            "status": "CLOSED",
            "entry_price": 100,
            "exit_price": 150,
            "quantity": 2,
            "fees": 0,
            "entry_date": "2024-02-10T10:00:00",
            "exit_date": "2024-02-10T12:00:00",
            "followed_rules": True,
        })
        assert t1.status_code == 201
        created_ids.append(t1.json()["id"])

        t2 = client.post("/api/v1/trades", headers=headers, json={
            "symbol": "TESTMONTH2/USDT",
            "market": "CRYPTO",
            "direction": "SHORT",
            "status": "CLOSED",
            "entry_price": 200,
            "exit_price": 220,
            "quantity": 1,
            "fees": 0,
            "entry_date": "2024-03-05T10:00:00",
            "exit_date": "2024-03-05T14:00:00",
            "followed_rules": True,
        })
        assert t2.status_code == 201
        created_ids.append(t2.json()["id"])

        feb = client.get("/api/v1/analytics?month=2024-02", headers=headers)
        assert feb.status_code == 200
        feb_data = feb.json()
        assert feb_data["selected_month"] == "2024-02"
        assert feb_data["summary"]["total_pnl"] == 100.0
        assert feb_data["summary"]["total_trades"] == 1
        assert feb_data["summary"]["win_rate"] == 100.0
        assert feb_data["overall_total_trades"] == base_overall_trades + 2
        assert feb_data["overall_total_pnl"] == round(base_overall_pnl + 80.0, 2)
        month_keys = [m["month"] for m in feb_data["available_months"]]
        assert "2024-02" in month_keys
        assert "2024-03" in month_keys

        mar = client.get("/api/v1/analytics?month=2024-03", headers=headers)
        assert mar.status_code == 200
        assert mar.json()["summary"]["total_pnl"] == -20.0
        assert mar.json()["overall_total_pnl"] == round(base_overall_pnl + 80.0, 2)

        trades_feb = client.get("/api/v1/trades?month=2024-02", headers=headers)
        assert trades_feb.status_code == 200
        assert all(item["symbol"] == "TESTMONTH1/USDT" for item in trades_feb.json()["items"])

        bad_month = client.get("/api/v1/analytics?month=2024-13", headers=headers)
        assert bad_month.status_code == 400
    finally:
        for tid in created_ids:
            client.delete(f"/api/v1/trades/{tid}", headers=headers)
