from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import Base, engine
import app.models  # Ensure all models are registered

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
    # TradeBook Backend API
    Потужний та масштабований REST API для щоденника трейдингу.
    
    Підтримує:
    * Автентифікацію через JWT Bearer токени (повністю сумісно з мобільними клієнтами iOS / Android / Flutter / React Native).
    * Мульти-активний трейдинг (Crypto, Forex, Stocks, Futures).
    * Автоматичний розрахунок PnL, ROI %, R-Multiple (R:R).
    * Аналітику: Winrate, Profit Factor, крива прибутковості (Equity curve), розподіл за днями тижня, ринками та сетапами/тегами.
    * Завантаження графіків та скріншотів угод.
    """,
    openapi_tags=[
        {"name": "Автентифікація", "description": "Реєстрація, вхід та отримання профілю"},
        {"name": "Угоди", "description": "Створення, редагування, фільтрація та список угод"},
        {"name": "Аналітика", "description": "Статистика, показники ефективності та графік еквайті"},
        {"name": "Завантаження файлів", "description": "Завантаження скріншотів угод та графіків"},
    ]
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads static files
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
from app.api.v1.auth import router as auth_router
from app.api.v1.trades import router as trades_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.upload import router as upload_router

app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(trades_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(upload_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Система"])
def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME, "version": settings.VERSION}
