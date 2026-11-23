from datetime import datetime
from typing import Optional, Union
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.schemas.common import UtcDateTime

class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    otp_code: Optional[str] = None

class UserRegisterConfirm(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    otp_code: str = Field(..., min_length=6, max_length=6)

class UserLogin(BaseModel):
    username_or_email: str
    password: str
    otp_code: Optional[str] = None

class LoginOtpRequired(BaseModel):
    otp_required: bool = True
    temp_token: str
    email_masked: str
    message: str = "Код підтвердження надіслано на вашу пошту"

class LoginVerifyOtpRequest(BaseModel):
    temp_token: str
    otp_code: str = Field(..., min_length=6, max_length=6)

class OtpSendResponse(BaseModel):
    message: str
    email: str
    expires_in_seconds: int = 600
    cooldown_seconds: int = 60

class ResendOtpRequest(BaseModel):
    email: Optional[EmailStr] = None
    temp_token: Optional[str] = None
    purpose: str = "registration"  # "registration" | "login"

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str
    created_at: UtcDateTime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
