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


def test_delete_all_trades_isolated_user():
    import uuid
    suffix = uuid.uuid4().hex[:8]
    reg = client.post("/api/v1/auth/register", json={
        "username": f"wipe_{suffix}",
        "email": f"wipe_{suffix}@example.com",
        "password": "password123",
    })
    assert reg.status_code == 201
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    for sym in ("BTC/USDT", "ETH/USDT"):
        r = client.post("/api/v1/trades", headers=headers, json={
            "symbol": sym,
            "market": "CRYPTO",
            "direction": "LONG",
            "status": "CLOSED",
            "entry_price": 100,
            "exit_price": 110,
            "quantity": 1,
            "entry_date": "2026-11-01T10:00:00",
            "exit_date": "2026-11-01T12:00:00",
        })
        assert r.status_code == 201

    assert client.get("/api/v1/trades", headers=headers).json()["total"] == 2

    del_all = client.delete("/api/v1/trades", headers=headers)
    assert del_all.status_code == 200
    assert del_all.json()["deleted_count"] == 2

    assert client.get("/api/v1/trades", headers=headers).json()["total"] == 0
    analytics = client.get("/api/v1/analytics", headers=headers).json()
    assert analytics["overall_total_trades"] == 0
    assert analytics["overall_total_pnl"] == 0.0


def test_open_trade_lifecycle_and_close():
    login = client.post("/api/v1/auth/login", json={
        "username_or_email": "trader",
        "password": "password123",
    })
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    created_id = None
    try:
        # 1. Creating a trade without explicit status defaults to OPEN with cleared exit/PnL fields
        create_res = client.post("/api/v1/trades", headers=headers, json={
            "symbol": "SOL/USDT",
            "market": "CRYPTO",
            "direction": "LONG",
            "entry_price": 150.0,
            "quantity": 2.0,
            "stop_loss": 140.0,
            "take_profit": 180.0,
            "fees": 5.0,
            "entry_date": "2026-11-11T10:00:00",
        })
        assert create_res.status_code == 201
        created = create_res.json()
        created_id = created["id"]
        assert created["status"] == "OPEN"
        assert created["exit_price"] is None
        assert created["exit_date"] is None
        assert created["pnl"] == 0.0
        assert created["pnl_percentage"] == 0.0
        assert created["r_multiple"] is None

        # 2. Creating a CLOSED trade without exit_price (or manual PnL) fails with 400
        bad_create = client.post("/api/v1/trades", headers=headers, json={
            "symbol": "BTC/USDT",
            "market": "CRYPTO",
            "direction": "LONG",
            "status": "CLOSED",
            "entry_price": 60000.0,
            "quantity": 0.1,
            "entry_date": "2026-11-11T10:00:00",
        })
        assert bad_create.status_code == 400

        # 3. Closing an OPEN trade without exit_price fails with 400
        bad_close = client.put(f"/api/v1/trades/{created_id}", headers=headers, json={
            "status": "CLOSED",
        })
        assert bad_close.status_code == 400

        # 4. Closing the OPEN trade with exit_price succeeds, auto-fills exit_date, and calculates PnL/R
        close_res = client.put(f"/api/v1/trades/{created_id}", headers=headers, json={
            "status": "CLOSED",
            "exit_price": 170.0,
        })
        assert close_res.status_code == 200
        closed = close_res.json()
        assert closed["status"] == "CLOSED"
        assert closed["exit_price"] == 170.0
        assert closed["exit_date"] is not None
        assert closed["pnl"] == 35.0  # (170 - 150) * 2 - 5
        assert closed["r_multiple"] == 1.75  # 35 / (10 * 2)

        # 5. Reverting CLOSED -> OPEN clears exit fields and zeroes PnL metrics
        reopen_res = client.put(f"/api/v1/trades/{created_id}", headers=headers, json={
            "status": "OPEN",
        })
        assert reopen_res.status_code == 200
        reopened = reopen_res.json()
        assert reopened["status"] == "OPEN"
        assert reopened["exit_price"] is None
        assert reopened["exit_date"] is None
        assert reopened["pnl"] == 0.0
        assert reopened["pnl_percentage"] == 0.0
        assert reopened["r_multiple"] is None
    finally:
        if created_id is not None:
            client.delete(f"/api/v1/trades/{created_id}", headers=headers)
