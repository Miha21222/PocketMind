from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.internal import router as internal_router
from app.api.v1.settings import router as settings_router
from app.api.v1.tasks import router as tasks_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(settings_router)
api_router.include_router(tasks_router)
api_router.include_router(internal_router)
