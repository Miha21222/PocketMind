"""One-time import of browser-resident legacy task data."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.task import Task
from app.models.user import User
from app.schemas.sync import SyncBatchItem, SyncTaskUpsert
from app.services.task_application_service import (
    PreferenceUpdateCommand,
    apply_preferences_snapshot,
    get_preferences,
    update_preferences,
)
from app.services.task_sync_service import apply_sync_payload, ensure_utc_datetime
from app.web.dependencies import (  # type: ignore[reportMissingImports]
    check_csrf,
    get_web_current_user,
    render,
)

router = APIRouter()


class MigrationPayload(BaseModel):
    tasks: list[dict[str, object]] = Field(default_factory=list)
    settings: dict[str, object] = Field(default_factory=dict)


@router.get("/migration")
async def migration_page(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_web_current_user),
):
    return render(
        request, "migration.html", user, preferences=await get_preferences(db, user)
    )


@router.post("/migration/import")
async def import_browser_data(
    request: Request,
    payload: MigrationPayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_web_current_user),
) -> dict[str, int]:
    check_csrf(request, request.headers.get("X-CSRF-Token", ""))
    settings = payload.settings
    await update_preferences(
        db,
        user,
        PreferenceUpdateCommand.model_validate(
            {
                "language": settings.get("language"),
                "timezone": settings.get("timezone"),
                "snooze_minutes": settings.get("default_snooze_minutes"),
                "quick_delay_minutes": settings.get("default_quick_delay_minutes"),
                "haptics_enabled": settings.get("haptics_enabled", True),
            }
        ),
    )
    imported = 0
    for raw_task in payload.tasks:
        try:
            incoming = SyncBatchItem.model_validate(
                {**raw_task, "client_task_id": raw_task.get("id")}
            )
        except ValidationError:
            continue
        existing = await db.scalar(
            select(Task).where(
                Task.user_id == user.id, Task.client_task_id == incoming.client_task_id
            )
        )
        existing_updated_at = (
            ensure_utc_datetime(existing.updated_at) if existing is not None else None
        )
        incoming_updated_at = ensure_utc_datetime(
            incoming.updated_at
        ) or datetime.min.replace(tzinfo=UTC)
        if (
            existing_updated_at is not None
            and existing_updated_at >= incoming_updated_at
        ):
            continue
        task = existing or Task(
            user_id=user.id,
            client_task_id=incoming.client_task_id,
            title=incoming.title,
        )
        if existing is None:
            db.add(task)
        apply_sync_payload(task, SyncTaskUpsert.model_validate(incoming.model_dump()))
        apply_preferences_snapshot(task, await get_preferences(db, user))
        imported += 1
    preferences = await get_preferences(db, user)
    preferences.legacy_imported_at = datetime.now(UTC)
    await db.commit()
    return {"imported": imported}
