from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1 import api_router
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine

app = FastAPI(title="PocketMind API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            is_api_path = path.startswith("api/")
            looks_like_file = "." in Path(path).name
            if exc.status_code == 404 and not is_api_path and not looks_like_file:
                return await super().get_response("index.html", scope)
            raise

app_file = Path(__file__).resolve()
backend_root = app_file.parents[1]  # .../PocketMind/backend
repo_root = backend_root.parent  # .../PocketMind
frontend_candidates = [
    backend_root / "frontend_dist",  # Docker image layout (/app/backend/frontend_dist)
    repo_root / "frontend_dist",  # Optional alternative build output
    repo_root / "frontend" / "dist",  # Local built frontend
]
frontend_dist = next((path for path in frontend_candidates if path.exists()), None)
if frontend_dist:
    app.mount("/", SPAStaticFiles(directory=str(frontend_dist), html=True), name="frontend")


@app.on_event("startup")
async def startup() -> None:
    settings = get_settings()
    if settings.environment == "local":
        # Keep local bootstrap simple; production should use Alembic migrations.
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
