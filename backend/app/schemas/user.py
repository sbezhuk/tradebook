from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.schemas.common import UtcDateTime

class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username_or_email: str
    password: str

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
