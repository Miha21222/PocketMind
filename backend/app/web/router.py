"""Composition root for server-rendered PocketMind routes."""

from fastapi import APIRouter

from app.web.auth import router as auth_router  # type: ignore[reportMissingImports]
from app.web.migration import router as migration_router  # type: ignore[reportMissingImports]
from app.web.settings import router as settings_router  # type: ignore[reportMissingImports]
from app.web.tasks import router as tasks_router  # type: ignore[reportMissingImports]

router = APIRouter()
router.include_router(auth_router)
router.include_router(tasks_router)
router.include_router(settings_router)
router.include_router(migration_router)
