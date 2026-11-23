from datetime import datetime, timedelta, timezone
from typing import Union
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_temp_token,
    decode_temp_token,
)
from app.models.user import User
from app.models.account import TradingAccount
from app.models.otp import OTPCode
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    Token,
    LoginOtpRequired,
    LoginVerifyOtpRequest,
    OtpSendResponse,
    ResendOtpRequest,
)
from app.services.email_service import (
    generate_otp_code,
    hash_otp_code,
    verify_otp_code,
    mask_email,
    send_otp_email,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Автентифікація"])


@router.post("/register/send-otp", response_model=OtpSendResponse)
def send_register_otp(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Validate user info and send 6-digit OTP code to the provided email.
    """
    email = user_in.email.strip().lower()
    username = user_in.username.strip()

    # Check if username or email already exists
    existing = db.query(User).filter(
        or_(User.email == email, User.username == username)
    ).first()
    if existing:
        if existing.email.lower() == email:
            raise HTTPException(status_code=400, detail="Користувач з таким email вже існує")
        else:
            raise HTTPException(status_code=400, detail="Користувач з таким логіном вже існує")

    # Check resend cooldown
    now = datetime.now(timezone.utc)
    cooldown = timedelta(seconds=settings.OTP_RESEND_COOLDOWN_SECONDS)
    recent_otp = db.query(OTPCode).filter(
        OTPCode.email == email,
        OTPCode.purpose == "registration"
    ).order_by(OTPCode.created_at.desc()).first()

    if recent_otp:
        created_at_utc = recent_otp.created_at
        if created_at_utc.tzinfo is None:
            created_at_utc = created_at_utc.replace(tzinfo=timezone.utc)
        elapsed = (now - created_at_utc).total_seconds()
        if elapsed < settings.OTP_RESEND_COOLDOWN_SECONDS:
            remaining = int(settings.OTP_RESEND_COOLDOWN_SECONDS - elapsed)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Зачекайте ще {remaining} секунд перед повторним надсиланням коду."
            )

    # Invalidate older registration OTPs for this email
    db.query(OTPCode).filter(
        OTPCode.email == email,
        OTPCode.purpose == "registration",
        OTPCode.is_used == False
    ).update({"is_used": True})

    # Generate 6-digit OTP code
    otp_code = generate_otp_code()
    code_hash = hash_otp_code(otp_code, email)
    expires_at = now + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    otp_record = OTPCode(
        email=email,
        code_hash=code_hash,
        purpose="registration",
        expires_at=expires_at,
        is_used=False,
        attempts=0,
    )
    db.add(otp_record)
    db.commit()

    # Send email via Gmail SMTP
    try:
        send_otp_email(to_email=email, code=otp_code, purpose="registration")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не вдалося надіслати код на пошту: {str(e)}"
        )

    return OtpSendResponse(
        message="Код підтвердження успішно надіслано на вашу пошту",
        email=email,
        expires_in_seconds=settings.OTP_EXPIRE_MINUTES * 60,
        cooldown_seconds=settings.OTP_RESEND_COOLDOWN_SECONDS,
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Complete registration by verifying the 6-digit OTP code.
    """
    email = user_in.email.strip().lower()
    username = user_in.username.strip()

    # Check if username or email already exists
    existing = db.query(User).filter(
        or_(User.email == email, User.username == username)
    ).first()
    if existing:
        if existing.email.lower() == email:
            raise HTTPException(status_code=400, detail="Користувач з таким email вже існує")
        else:
            raise HTTPException(status_code=400, detail="Користувач з таким логіном вже існує")

    if settings.OTP_REQUIRED and not user_in.otp_code:
        raise HTTPException(
            status_code=400,
            detail="Будь ласка, введіть 6-значний код підтвердження з пошти"
        )

    if user_in.otp_code:
        now = datetime.now(timezone.utc)
        # Find latest active OTP for registration
        otp_record = db.query(OTPCode).filter(
            OTPCode.email == email,
            OTPCode.purpose == "registration",
            OTPCode.is_used == False
        ).order_by(OTPCode.created_at.desc()).first()

        if not otp_record:
            raise HTTPException(
                status_code=400,
                detail="Код підтвердження не знайдено або термін його дії закінчився. Запросіть новий код."
            )

        expires_at_utc = otp_record.expires_at
        if expires_at_utc.tzinfo is None:
            expires_at_utc = expires_at_utc.replace(tzinfo=timezone.utc)

        if now > expires_at_utc:
            otp_record.is_used = True
            db.commit()
            raise HTTPException(
                status_code=400,
                detail="Термін дії коду підтвердження минув. Запросіть новий код."
            )

        if otp_record.attempts >= settings.OTP_MAX_ATTEMPTS:
            otp_record.is_used = True
            db.commit()
            raise HTTPException(
                status_code=400,
                detail="Перевищено ліміт спроб введення коду. Будь ласка, запросіть новий код."
            )

        if not verify_otp_code(user_in.otp_code, email, otp_record.code_hash):
            otp_record.attempts += 1
            db.commit()
            remaining_attempts = settings.OTP_MAX_ATTEMPTS - otp_record.attempts
            detail = "Невірний код підтвердження."
            if remaining_attempts > 0:
                detail += f" Залишилось спроб: {remaining_attempts}."
            raise HTTPException(status_code=400, detail=detail)

        # Code is valid -> mark as used
        otp_record.is_used = True

    # Create new user
    hashed_pw = get_password_hash(user_in.password)
    user = User(
        email=email,
        username=username,
        hashed_password=hashed_pw
    )
    db.add(user)
    db.flush()

    # Automatically create default trading account
    default_account = TradingAccount(
        user_id=user.id,
        name="Основний рахунок",
        platform="HYPERLIQUID",
        account_type="PERSONAL",
        currency="USD",
        color="#c49bff",
        is_default=True
    )
    db.add(default_account)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.post("/login", response_model=Union[Token, LoginOtpRequired])
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate user. If demo user, log in directly.
    Otherwise, send a 6-digit OTP code to the user's email and return LoginOtpRequired.
    """
    login_id = credentials.username_or_email.strip()
    user = db.query(User).filter(
        or_(User.email == login_id.lower(), User.username == login_id)
    ).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невірний логін або пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Demo bypass for trader account
    if settings.OTP_DEMO_BYPASS and user.username == "trader":
        token = create_access_token(subject=user.id)
        return Token(
            access_token=token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )

    now = datetime.now(timezone.utc)

    # If otp_code was provided directly in request
    if credentials.otp_code:
        otp_record = db.query(OTPCode).filter(
            OTPCode.user_id == user.id,
            OTPCode.purpose == "login",
            OTPCode.is_used == False
        ).order_by(OTPCode.created_at.desc()).first()

        if not otp_record:
            raise HTTPException(status_code=400, detail="Код підтвердження не знайдено або термін його дії минув.")

        exp = otp_record.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if now > exp:
            otp_record.is_used = True
            db.commit()
            raise HTTPException(status_code=400, detail="Термін дії коду минув. Будь ласка, запросіть новий код.")

        if otp_record.attempts >= settings.OTP_MAX_ATTEMPTS:
            otp_record.is_used = True
            db.commit()
            raise HTTPException(status_code=400, detail="Перевищено ліміт спроб. Запросіть новий код.")

        if not verify_otp_code(credentials.otp_code, user.email, otp_record.code_hash):
            otp_record.attempts += 1
            db.commit()
            remaining = settings.OTP_MAX_ATTEMPTS - otp_record.attempts
            detail = "Невірний код підтвердження."
            if remaining > 0:
                detail += f" Залишилось спроб: {remaining}."
            raise HTTPException(status_code=400, detail=detail)

        otp_record.is_used = True
        db.commit()
        token = create_access_token(subject=user.id)
        return Token(
            access_token=token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )

    # Standard flow: Invalidate previous active login codes
    db.query(OTPCode).filter(
        OTPCode.user_id == user.id,
        OTPCode.purpose == "login",
        OTPCode.is_used == False
    ).update({"is_used": True})

    # Generate new 6-digit OTP code
    otp_code = generate_otp_code()
    code_hash = hash_otp_code(otp_code, user.email)
    expires_at = now + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    otp_record = OTPCode(
        email=user.email,
        user_id=user.id,
        code_hash=code_hash,
        purpose="login",
        expires_at=expires_at,
        is_used=False,
        attempts=0,
    )
    db.add(otp_record)
    db.commit()

    # Send OTP via Gmail SMTP
    try:
        send_otp_email(to_email=user.email, code=otp_code, purpose="login")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не вдалося надіслати код на пошту: {str(e)}"
        )

    temp_token = create_temp_token(
        {"sub": str(user.id), "email": user.email, "purpose": "otp_login"},
        expires_minutes=settings.OTP_EXPIRE_MINUTES
    )

    return LoginOtpRequired(
        otp_required=True,
        temp_token=temp_token,
        email_masked=mask_email(user.email),
        message="Код підтвердження надіслано на вашу електронну пошту"
    )


@router.post("/login/verify-otp", response_model=Token)
def verify_login_otp(payload: LoginVerifyOtpRequest, db: Session = Depends(get_db)):
    """
    Verify 6-digit OTP code and complete login.
    """
    token_data = decode_temp_token(payload.temp_token)
    if not token_data or token_data.get("purpose") != "otp_login":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Сесія підтвердження коду застаріла. Будь ласка, увійдіть знову."
        )

    user_id = int(token_data.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Користувача не знайдено")

    now = datetime.now(timezone.utc)
    otp_record = db.query(OTPCode).filter(
        OTPCode.user_id == user.id,
        OTPCode.purpose == "login",
        OTPCode.is_used == False
    ).order_by(OTPCode.created_at.desc()).first()

    if not otp_record:
        raise HTTPException(
            status_code=400,
            detail="Код підтвердження не знайдено або термін його дії минув. Запросіть новий код."
        )

    exp = otp_record.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if now > exp:
        otp_record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="Термін дії коду підтвердження минув. Запросіть новий код."
        )

    if otp_record.attempts >= settings.OTP_MAX_ATTEMPTS:
        otp_record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="Перевищено ліміт спроб введення коду. Запросіть новий код."
        )

    if not verify_otp_code(payload.otp_code, user.email, otp_record.code_hash):
        otp_record.attempts += 1
        db.commit()
        remaining = settings.OTP_MAX_ATTEMPTS - otp_record.attempts
        detail = "Невірний код підтвердження."
        if remaining > 0:
            detail += f" Залишилось спроб: {remaining}."
        raise HTTPException(status_code=400, detail=detail)

    # Valid -> mark as used
    otp_record.is_used = True
    db.commit()

    token = create_access_token(subject=user.id)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.post("/resend-otp", response_model=OtpSendResponse)
def resend_otp(payload: ResendOtpRequest, db: Session = Depends(get_db)):
    """
    Resend a new 6-digit OTP code for registration or login.
    """
    email = None
    user_id = None
    purpose = payload.purpose or "registration"

    if payload.temp_token:
        token_data = decode_temp_token(payload.temp_token)
        if not token_data or token_data.get("purpose") != "otp_login":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Сесія застаріла. Будь ласка, поверніться до форми входу."
            )
        user_id = int(token_data.get("sub"))
        email = token_data.get("email")
        purpose = "login"
    elif payload.email:
        email = payload.email.strip().lower()
    else:
        raise HTTPException(status_code=400, detail="Не вказано email або temp_token")

    now = datetime.now(timezone.utc)
    # Check cooldown
    recent_otp = db.query(OTPCode).filter(
        OTPCode.email == email,
        OTPCode.purpose == purpose
    ).order_by(OTPCode.created_at.desc()).first()

    if recent_otp:
        created_at_utc = recent_otp.created_at
        if created_at_utc.tzinfo is None:
            created_at_utc = created_at_utc.replace(tzinfo=timezone.utc)
        elapsed = (now - created_at_utc).total_seconds()
        if elapsed < settings.OTP_RESEND_COOLDOWN_SECONDS:
            remaining = int(settings.OTP_RESEND_COOLDOWN_SECONDS - elapsed)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Зачекайте ще {remaining} секунд перед повторним запитом коду."
            )

    # Invalidate previous unused codes
    db.query(OTPCode).filter(
        OTPCode.email == email,
        OTPCode.purpose == purpose,
        OTPCode.is_used == False
    ).update({"is_used": True})

    otp_code = generate_otp_code()
    code_hash = hash_otp_code(otp_code, email)
    expires_at = now + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    otp_record = OTPCode(
        email=email,
        user_id=user_id,
        code_hash=code_hash,
        purpose=purpose,
        expires_at=expires_at,
        is_used=False,
        attempts=0,
    )
    db.add(otp_record)
    db.commit()

    try:
        send_otp_email(to_email=email, code=otp_code, purpose=purpose)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не вдалося надіслати код на пошту: {str(e)}"
        )

    return OtpSendResponse(
        message="Новий код підтвердження успішно надіслано на вашу пошту",
        email=email,
        expires_in_seconds=settings.OTP_EXPIRE_MINUTES * 60,
        cooldown_seconds=settings.OTP_RESEND_COOLDOWN_SECONDS,
    )


@router.post("/token", response_model=Token, include_in_schema=False)
def login_form(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2 compatible token endpoint for Swagger docs authorization"""
    user = db.query(User).filter(
        or_(User.email == form_data.username.lower(), User.username == form_data.username)
    ).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невірний логін або пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(subject=user.id)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
