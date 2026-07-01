from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.feedback import router as feedback_router
from app.api.v1.sync import router as sync_router
from app.api.v1.voice import router as voice_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(sync_router)
api_router.include_router(voice_router)
api_router.include_router(feedback_router)
