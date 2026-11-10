import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.core.config import settings
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/upload", tags=["Завантаження файлів"])

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}

@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Дозволені лише графічні формати: PNG, JPG, JPEG, WEBP, GIF")

    # Generate safe unique filename
    unique_name = f"{uuid.uuid4().hex}{ext}"
    dest_path = settings.UPLOAD_DIR / unique_name

    try:
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Помилка збереження файлу: {str(e)}")

    return {"url": f"/uploads/{unique_name}"}
