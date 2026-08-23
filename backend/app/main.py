from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.api.v1 import api_router
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import close_db, engine
from app.web.router import router as web_router

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.is_production and (
        settings.jwt_secret == "change-me" or not settings.bot_token
    ):
        raise RuntimeError("Production requires JWT_SECRET and BOT_TOKEN")
    if settings.environment == "local":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield
    await close_db()


app = FastAPI(title="PocketMind", version="1.0.0", lifespan=lifespan)
# Keep the legacy GitHub Pages client working through the migration window.
# Credentials require a concrete allowlist rather than a wildcard origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.jwt_secret,
    https_only=settings.is_production,
    same_site="lax",
)
app.mount(
    "/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static"
)
app.include_router(api_router)
app.include_router(web_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready")
async def ready() -> dict[str, str]:
    try:
        async with engine.connect() as connection:
            await connection.exec_driver_sql("SELECT 1")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not ready",
        ) from exc
    return {"status": "ready"}
