import time
import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.otp import OTPCode
from app.models.user import User
from app.services.email_service import hash_otp_code

client = TestClient(app)

def test_registration_otp_flow():
    email = "new_trader@example.com"
    username = "new_trader"
    password = "secure_password_123"

    # Step 1: Send OTP for registration
    send_res = client.post("/api/v1/auth/register/send-otp", json={
        "email": email,
        "username": username,
        "password": password
    })
    assert send_res.status_code == 200
    data = send_res.json()
    assert data["email"] == email
    assert "Код підтвердження" in data["message"]

    # Retrieve the generated OTP from database
    db = SessionLocal()
    otp_record = db.query(OTPCode).filter(
        OTPCode.email == email,
        OTPCode.purpose == "registration",
        OTPCode.is_used == False
    ).first()
    assert otp_record is not None
    db.close()

    # Step 2: Attempt registration with an invalid code
    bad_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "username": username,
        "password": password,
        "otp_code": "000000"
    })
    assert bad_res.status_code == 400
    assert "Невірний код" in bad_res.json()["detail"]

    # We need the real 6-digit code for this test. We can compute which 6-digit code matches the hash:
    real_code = None
    for c in range(100000, 1000000):
        if hash_otp_code(str(c), email) == otp_record.code_hash:
            real_code = str(c)
            break
    assert real_code is not None

    # Step 3: Register with the correct code
    good_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "username": username,
        "password": password,
        "otp_code": real_code
    })
    assert good_res.status_code == 201
    auth_data = good_res.json()
    assert "access_token" in auth_data
    assert auth_data["user"]["username"] == username
    assert auth_data["user"]["email"] == email

    # Step 4: Reusing the same code must fail
    reuse_res = client.post("/api/v1/auth/register", json={
        "email": "another@example.com",
        "username": "another_user",
        "password": password,
        "otp_code": real_code
    })
    assert reuse_res.status_code == 400


def test_registration_otp_rate_limiting():
    email = "fast_clicker@example.com"
    username = "fast_clicker"
    password = "password123"

    # First request
    res1 = client.post("/api/v1/auth/register/send-otp", json={
        "email": email,
        "username": username,
        "password": password
    })
    assert res1.status_code == 200

    # Immediate second request should be throttled (429)
    res2 = client.post("/api/v1/auth/register/send-otp", json={
        "email": email,
        "username": username,
        "password": password
    })
    assert res2.status_code == 429
    assert "Зачекайте ще" in res2.json()["detail"]


def test_login_otp_flow():
    # User was created in test_registration_otp_flow: new_trader / secure_password_123
    # Step 1: Login with valid credentials initiates OTP
    login_res = client.post("/api/v1/auth/login", json={
        "username_or_email": "new_trader",
        "password": "secure_password_123"
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data.get("otp_required") is True
    temp_token = login_data["temp_token"]
    assert "email_masked" in login_data

    # Step 2: Retrieve the login OTP from DB
    db = SessionLocal()
    otp_record = db.query(OTPCode).filter(
        OTPCode.email == "new_trader@example.com",
        OTPCode.purpose == "login",
        OTPCode.is_used == False
    ).order_by(OTPCode.created_at.desc()).first()
    assert otp_record is not None
    db.close()

    # Step 3: Verify with invalid OTP code
    bad_verify = client.post("/api/v1/auth/login/verify-otp", json={
        "temp_token": temp_token,
        "otp_code": "111111"
    })
    assert bad_verify.status_code == 400
    assert "Невірний код" in bad_verify.json()["detail"]

    # Find the real code
    real_code = None
    for c in range(100000, 1000000):
        if hash_otp_code(str(c), "new_trader@example.com") == otp_record.code_hash:
            real_code = str(c)
            break
    assert real_code is not None

    # Step 4: Verify with correct OTP code
    good_verify = client.post("/api/v1/auth/login/verify-otp", json={
        "temp_token": temp_token,
        "otp_code": real_code
    })
    assert good_verify.status_code == 200
    token_data = good_verify.json()
    assert "access_token" in token_data
    assert token_data["user"]["username"] == "new_trader"


def test_demo_login_bypasses_otp():
    res = client.post("/api/v1/auth/login", json={
        "username_or_email": "trader",
        "password": "password123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data.get("otp_required") is not True
    assert data["user"]["username"] == "trader"


def test_expired_otp_rejected():
    email = "expired_user@example.com"
    send_res = client.post("/api/v1/auth/register/send-otp", json={
        "email": email,
        "username": "expired_user",
        "password": "password123"
    })
    assert send_res.status_code == 200

    # Manually expire the code in DB
    db = SessionLocal()
    otp_record = db.query(OTPCode).filter(
        OTPCode.email == email,
        OTPCode.purpose == "registration"
    ).first()
    assert otp_record is not None
    otp_record.expires_at = datetime.now(timezone.utc) - timedelta(minutes=5)
    db.commit()
    db.close()

    res = client.post("/api/v1/auth/register", json={
        "email": email,
        "username": "expired_user",
        "password": "password123",
        "otp_code": "123456"
    })
    assert res.status_code == 400
    assert "минув" in res.json()["detail"]


def test_max_attempts_exceeded():
    email = "brute_force_tester@example.com"
    send_res = client.post("/api/v1/auth/register/send-otp", json={
        "email": email,
        "username": "brute_user",
        "password": "password123"
    })
    assert send_res.status_code == 200

    # Send 5 incorrect attempts
    for i in range(5):
        res = client.post("/api/v1/auth/register", json={
            "email": email,
            "username": "brute_user",
            "password": "password123",
            "otp_code": "000000"
        })
        assert res.status_code == 400

    # 6th attempt should state limit exceeded
    res6 = client.post("/api/v1/auth/register", json={
        "email": email,
        "username": "brute_user",
        "password": "password123",
        "otp_code": "000000"
    })
    assert res6.status_code == 400
    assert "Перевищено ліміт спроб" in res6.json()["detail"]

