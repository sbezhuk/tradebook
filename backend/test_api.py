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


def test_deposits_and_growth_percentages():
    import uuid
    suffix = uuid.uuid4().hex[:8]
    reg = client.post("/api/v1/auth/register", json={
        "username": f"dep_{suffix}",
        "email": f"dep_{suffix}@example.com",
        "password": "password123",
    })
    assert reg.status_code == 201
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    # Add Deposit #1 ($1000 in Oct 2026) and Deposit #2 ($1000 in Nov 2026)
    d1 = client.post("/api/v1/deposits", headers=headers, json={
        "amount": 1000.0,
        "deposit_date": "2026-10-01T10:00:00",
        "note": "Oct initial",
    })
    assert d1.status_code == 201
    d1_id = d1.json()["id"]

    d2 = client.post("/api/v1/deposits", headers=headers, json={
        "amount": 1000.0,
        "deposit_date": "2026-11-01T10:00:00",
        "note": "Nov top-up",
    })
    assert d2.status_code == 201

    # Invalid deposit (<= 0) rejected with 422
    bad_dep = client.post("/api/v1/deposits", headers=headers, json={"amount": -50})
    assert bad_dep.status_code == 422

    # Trades: +$250 in Oct 2026, +$100 in Nov 2026
    t_oct = client.post("/api/v1/trades", headers=headers, json={
        "symbol": "BTC/USDT",
        "market": "CRYPTO",
        "direction": "LONG",
        "status": "CLOSED",
        "entry_price": 1000.0,
        "exit_price": 1250.0,
        "quantity": 1.0,
        "entry_date": "2026-10-10T10:00:00",
        "exit_date": "2026-10-10T15:00:00",
    })
    assert t_oct.status_code == 201

    t_nov = client.post("/api/v1/trades", headers=headers, json={
        "symbol": "ETH/USDT",
        "market": "CRYPTO",
        "direction": "LONG",
        "status": "CLOSED",
        "entry_price": 1000.0,
        "exit_price": 1100.0,
        "quantity": 1.0,
        "entry_date": "2026-11-05T10:00:00",
        "exit_date": "2026-11-05T15:00:00",
    })
    assert t_nov.status_code == 201

    # Check Deposit list
    dep_list = client.get("/api/v1/deposits", headers=headers)
    assert dep_list.status_code == 200
    assert dep_list.json()["count"] == 2
    assert dep_list.json()["total_amount"] == 2000.0

    # Check Overall Analytics: total_deposits=2000, overall_total_pnl=350 -> +17.5%, balance=2350
    all_an = client.get("/api/v1/analytics", headers=headers).json()
    assert all_an["total_deposits"] == 2000.0
    assert all_an["overall_total_pnl"] == 350.0
    assert all_an["current_balance"] == 2350.0
    assert all_an["overall_deposit_growth_pct"] == 17.5
    assert all_an["summary"]["period_deposit_growth_pct"] == 17.5

    months_map = {m["month"]: m for m in all_an["available_months"]}
    assert months_map["2026-10"]["cumulative_deposits"] == 1000.0
    assert months_map["2026-10"]["deposit_growth_pct"] == 25.0  # +250 / 1000
    assert months_map["2026-11"]["cumulative_deposits"] == 2000.0
    assert months_map["2026-11"]["deposit_growth_pct"] == 5.0   # +100 / 2000

    # Check Period Filtered Analytics (?month=2026-10)
    oct_an = client.get("/api/v1/analytics?month=2026-10", headers=headers).json()
    assert oct_an["summary"]["period_deposits"] == 1000.0
    assert oct_an["summary"]["period_cumulative_deposits"] == 1000.0
    assert oct_an["summary"]["period_deposit_growth_pct"] == 25.0
    # Overall remains 17.5% across all months
    assert oct_an["overall_deposit_growth_pct"] == 17.5

    # Delete Deposit #1 -> remaining $1000 in Nov; Oct has no cumulative deposits (None), overall = 350 / 1000 = +35.0%
    del_res = client.delete(f"/api/v1/deposits/{d1_id}", headers=headers)
    assert del_res.status_code == 204
    after_del = client.get("/api/v1/analytics", headers=headers).json()
    assert after_del["total_deposits"] == 1000.0
    assert after_del["overall_deposit_growth_pct"] == 35.0
    after_months = {m["month"]: m for m in after_del["available_months"]}
    assert after_months["2026-10"]["deposit_growth_pct"] is None
    assert after_months["2026-11"]["deposit_growth_pct"] == 10.0


def test_trades_pagination():
    import uuid
    suffix = uuid.uuid4().hex[:8]
    reg = client.post("/api/v1/auth/register", json={
        "username": f"pag_{suffix}",
        "email": f"pag_{suffix}@example.com",
        "password": "password123",
    })
    assert reg.status_code == 201
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    # Create 7 trades with identical entry_date to also verify deterministic tie-breaker sorting
    for i in range(7):
        r = client.post("/api/v1/trades", headers=headers, json={
            "symbol": f"PAIR{i}/USDT",
            "market": "CRYPTO",
            "direction": "LONG",
            "status": "CLOSED" if i < 5 else "OPEN",
            "entry_price": 100.0,
            "exit_price": 110.0 if i < 5 else None,
            "quantity": 1.0,
            "entry_date": "2026-11-10T10:00:00",
            "exit_date": "2026-11-10T12:00:00" if i < 5 else None,
        })
        assert r.status_code == 201

    page1 = client.get("/api/v1/trades?skip=0&limit=3&sort_by=date_desc", headers=headers)
    assert page1.status_code == 200
    p1_data = page1.json()
    assert p1_data["total"] == 7
    assert len(p1_data["items"]) == 3

    page2 = client.get("/api/v1/trades?skip=3&limit=3&sort_by=date_desc", headers=headers)
    assert page2.status_code == 200
    p2_data = page2.json()
    assert p2_data["total"] == 7
    assert len(p2_data["items"]) == 3

    page3 = client.get("/api/v1/trades?skip=6&limit=3&sort_by=date_desc", headers=headers)
    assert page3.status_code == 200
    p3_data = page3.json()
    assert p3_data["total"] == 7
    assert len(p3_data["items"]) == 1

    # All returned IDs across pages must be disjoint and cover all 7 trades
    all_ids = [t["id"] for t in p1_data["items"] + p2_data["items"] + p3_data["items"]]
    assert len(all_ids) == 7
    assert len(set(all_ids)) == 7

    # Filtered pagination
    open_page = client.get("/api/v1/trades?status=OPEN&skip=0&limit=3", headers=headers)
    assert open_page.status_code == 200
    assert open_page.json()["total"] == 2
    assert len(open_page.json()["items"]) == 2

    # Out-of-range skip returns empty items while keeping accurate total
    empty_page = client.get("/api/v1/trades?skip=100&limit=10", headers=headers)
    assert empty_page.status_code == 200
    assert empty_page.json()["total"] == 7
    assert empty_page.json()["items"] == []


def test_hyperliquid_deposit_import():
    import uuid
    suffix = uuid.uuid4().hex[:8]
    reg = client.post("/api/v1/auth/register", json={
        "username": f"depimp_{suffix}",
        "email": f"depimp_{suffix}@example.com",
        "password": "password123",
    })
    assert reg.status_code == 201
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    sample_csv = (
        "time,action,source,destination,accountValueChange,fee\n"
        "10/17/2026 - 20:13:44,deposit,hyperevm,trading,52.604246 USDC,0 USDC\n"
        "11/4/2026 - 19:05:39,deposit,hyperevm,trading,11.717616 USDC,0 USDC\n"
        "11/9/2026 - 17:57:12,deposit,hyperevm,trading,53.38464 USDC,0 USDC\n"
        "11/10/2026 - 16:17:16,send,trading,trading,1.889331 USDC,0 USDC\n"
    )
    files = {"file": ("deposits_and_withdrawals.csv", sample_csv, "text/csv")}
    imp_res = client.post("/api/v1/deposits/import/hyperliquid", headers=headers, files=files)
    assert imp_res.status_code == 200
    imp_data = imp_res.json()
    assert imp_data["imported_count"] == 4
    assert imp_data["skipped_duplicates"] == 0
    assert imp_data["total_amount"] == 119.6
    assert len(imp_data["deposits"]) == 4
    assert "Hyperliquid: deposit (hyperevm → trading)" in imp_data["deposits"][0]["note"]
    assert "Hyperliquid: send (trading → trading)" in imp_data["deposits"][3]["note"]

    # Re-importing the same CSV skips all duplicates
    imp_res2 = client.post("/api/v1/deposits/import/hyperliquid", headers=headers, files=files)
    assert imp_res2.status_code == 200
    assert imp_res2.json()["imported_count"] == 0
    assert imp_res2.json()["skipped_duplicates"] == 4
    assert imp_res2.json()["total_amount"] == 0.0

    # List deposits and analytics reflect total
    dep_list = client.get("/api/v1/deposits", headers=headers)
    assert dep_list.status_code == 200
    assert dep_list.json()["count"] == 4
    assert dep_list.json()["total_amount"] == 119.6

    # Withdraw row reduces net total and serializes properly
    withdraw_csv = (
        "time,action,source,destination,accountValueChange,fee\n"
        "11/11/2026 - 10:00:00,withdraw,trading,arbitrum,-19.60 USDC,1 USDC\n"
    )
    w_res = client.post(
        "/api/v1/deposits/import/hyperliquid",
        headers=headers,
        files={"file": ("deposits_and_withdrawals.csv", withdraw_csv, "text/csv")},
    )
    assert w_res.status_code == 200
    assert w_res.json()["imported_count"] == 1
    assert w_res.json()["total_amount"] == -19.6
    assert "fee 1 USDC" in w_res.json()["deposits"][0]["note"]

    dep_list2 = client.get("/api/v1/deposits", headers=headers)
    assert dep_list2.status_code == 200
    assert dep_list2.json()["count"] == 5
    assert dep_list2.json()["total_amount"] == 100.0

    # Missing required columns returns 400
    bad_csv = "time,coin,px\n10/17/2026 - 20:13:44,BTC,50000\n"
    bad_res = client.post(
        "/api/v1/deposits/import/hyperliquid",
        headers=headers,
        files={"file": ("bad.csv", bad_csv, "text/csv")},
    )
    assert bad_res.status_code == 400


def test_multi_accounts_isolation_and_lifecycle():
    import uuid
    suffix = uuid.uuid4().hex[:8]
    reg = client.post("/api/v1/auth/register", json={
        "username": f"multi_{suffix}",
        "email": f"multi_{suffix}@example.com",
        "password": "password123",
    })
    assert reg.status_code == 201
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    # 1. User automatically gets a default account
    acc_list = client.get("/api/v1/accounts", headers=headers)
    assert acc_list.status_code == 200
    acc_data = acc_list.json()
    assert acc_data["total"] == 1
    acc1 = acc_data["items"][0]
    assert acc1["is_default"] is True

    # Cannot delete the only remaining account
    del_only = client.delete(f"/api/v1/accounts/{acc1['id']}", headers=headers)
    assert del_only.status_code == 400

    # 2. Create a second account (Bybit Futures)
    c_res = client.post("/api/v1/accounts", headers=headers, json={
        "name": "Bybit Futures",
        "platform": "BYBIT",
        "account_type": "FUTURES",
        "currency": "USD",
        "color": "#60a5fa",
    })
    assert c_res.status_code == 201
    acc2 = c_res.json()
    assert acc2["name"] == "Bybit Futures"
    assert acc2["platform"] == "BYBIT"

    # 3. Add deposits and trades separately to acc1 and acc2
    d1 = client.post("/api/v1/deposits", headers=headers, json={
        "account_id": acc1["id"],
        "amount": 1000.0,
        "deposit_date": "2026-11-01T10:00:00",
    })
    assert d1.status_code == 201

    d2 = client.post("/api/v1/deposits", headers=headers, json={
        "account_id": acc2["id"],
        "amount": 500.0,
        "deposit_date": "2026-11-02T10:00:00",
    })
    assert d2.status_code == 201

    t1 = client.post("/api/v1/trades", headers=headers, json={
        "account_id": acc1["id"],
        "symbol": "BTC/USDT",
        "market": "CRYPTO",
        "direction": "LONG",
        "status": "CLOSED",
        "entry_price": 100.0,
        "exit_price": 120.0,
        "quantity": 10.0,
        "entry_date": "2026-11-05T10:00:00",
        "exit_date": "2026-11-05T12:00:00",
    })
    assert t1.status_code == 201  # +200 PnL

    t2 = client.post("/api/v1/trades", headers=headers, json={
        "account_id": acc2["id"],
        "symbol": "ETH/USDT",
        "market": "CRYPTO",
        "direction": "SHORT",
        "status": "CLOSED",
        "entry_price": 100.0,
        "exit_price": 110.0,
        "quantity": 5.0,
        "entry_date": "2026-11-06T10:00:00",
        "exit_date": "2026-11-06T12:00:00",
    })
    assert t2.status_code == 201  # -50 PnL

    # 4. Verify filtered trades, deposits, and analytics per account vs combined
    assert client.get(f"/api/v1/trades?account_id={acc1['id']}", headers=headers).json()["total"] == 1
    assert client.get(f"/api/v1/trades?account_id={acc2['id']}", headers=headers).json()["total"] == 1
    assert client.get("/api/v1/trades", headers=headers).json()["total"] == 2

    an_acc1 = client.get(f"/api/v1/analytics?account_id={acc1['id']}", headers=headers).json()
    assert an_acc1["overall_total_pnl"] == 200.0
    assert an_acc1["total_deposits"] == 1000.0
    assert an_acc1["current_balance"] == 1200.0

    an_acc2 = client.get(f"/api/v1/analytics?account_id={acc2['id']}", headers=headers).json()
    assert an_acc2["overall_total_pnl"] == -50.0
    assert an_acc2["total_deposits"] == 500.0
    assert an_acc2["current_balance"] == 450.0

    an_all = client.get("/api/v1/analytics", headers=headers).json()
    assert an_all["overall_total_pnl"] == 150.0
    assert an_all["total_deposits"] == 1500.0
    assert an_all["current_balance"] == 1650.0

    # 5. Verify account list reflects computed stats
    acc_list2 = client.get("/api/v1/accounts", headers=headers).json()["items"]
    by_id = {a["id"]: a for a in acc_list2}
    assert by_id[acc1["id"]]["total_pnl"] == 200.0
    assert by_id[acc2["id"]]["total_pnl"] == -50.0
    assert by_id[acc2["id"]]["current_balance"] == 450.0

    # 6. Delete acc2 transferring data to acc1
    del_acc2 = client.delete(f"/api/v1/accounts/{acc2['id']}?delete_data=false", headers=headers)
    assert del_acc2.status_code == 204

    assert client.get("/api/v1/accounts", headers=headers).json()["total"] == 1
    assert client.get(f"/api/v1/trades?account_id={acc1['id']}", headers=headers).json()["total"] == 2
    assert client.get(f"/api/v1/deposits?account_id={acc1['id']}", headers=headers).json()["count"] == 2
