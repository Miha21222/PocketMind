from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine

settings = get_settings()

app = FastAPI(title="PocketMind API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    # Keep CORS explicit in production. Local dev defaults come from Settings.
    allow_origins=settings.cors_allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.on_event("startup")
async def startup() -> None:
    if settings.environment == "local":
        # Keep local bootstrap simple; production should use Alembic migrations.
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
