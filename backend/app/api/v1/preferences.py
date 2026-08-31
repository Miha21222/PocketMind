"""Client-owned Mini App settings mirrored to the backend."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services.task_application_service import (
    PreferenceSyncCommand,
    sync_preferences,
)

router = APIRouter(prefix="/preferences", tags=["preferences"])


@router.put("/me")
async def sync_my_preferences(
    payload: PreferenceSyncCommand,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, bool]:
    await sync_preferences(db, current_user, payload)
    await db.commit()
    return {"synced": True}