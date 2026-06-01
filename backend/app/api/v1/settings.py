from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.settings import UserSettingsOut, UserSettingsUpdate
from app.services.user_settings_service import (
    build_user_settings,
    normalize_hhmm,
    normalize_reminder_mode,
    normalize_timezone,
)

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/me", response_model=UserSettingsOut)
async def get_my_settings(current_user: User = Depends(get_current_user)) -> UserSettingsOut:
    return build_user_settings(current_user)


@router.patch("/me", response_model=UserSettingsOut)
async def update_my_settings(
    payload: UserSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserSettingsOut:
    if payload.language is not None:
        current_user.preferred_language = payload.language

    if payload.timezone is not None:
        try:
            ZoneInfo(payload.timezone)
        except ZoneInfoNotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid timezone") from exc
        current_user.preferred_timezone = payload.timezone

    if payload.default_snooze_minutes is not None:
        current_user.default_snooze_minutes = payload.default_snooze_minutes
    if payload.default_quick_delay_minutes is not None:
        current_user.default_quick_delay_minutes = payload.default_quick_delay_minutes
    if payload.default_deadline_reminder_mode is not None:
        current_user.default_deadline_reminder_mode = payload.default_deadline_reminder_mode
    if payload.default_deadline_reminder_time_local is not None:
        current_user.default_deadline_reminder_time_local = payload.default_deadline_reminder_time_local
    if payload.default_deadline_reminder_interval_hours is not None:
        current_user.default_deadline_reminder_interval_hours = payload.default_deadline_reminder_interval_hours
    if payload.default_waiting_reminder_mode is not None:
        current_user.default_waiting_reminder_mode = payload.default_waiting_reminder_mode
    if payload.default_waiting_reminder_time_local is not None:
        current_user.default_waiting_reminder_time_local = payload.default_waiting_reminder_time_local
    if payload.default_waiting_reminder_interval_hours is not None:
        current_user.default_waiting_reminder_interval_hours = payload.default_waiting_reminder_interval_hours
    if payload.default_recurring_reminder_time_local is not None:
        current_user.default_recurring_reminder_time_local = payload.default_recurring_reminder_time_local

    # Normalize timezone if persisted value becomes invalid for current runtime tzdata.
    current_user.preferred_timezone = normalize_timezone(current_user.preferred_timezone)
    current_user.default_deadline_reminder_mode = normalize_reminder_mode(
        current_user.default_deadline_reminder_mode,
        "daily_at_time",
    )
    current_user.default_waiting_reminder_mode = normalize_reminder_mode(
        current_user.default_waiting_reminder_mode,
        "daily_at_time",
    )
    current_user.default_deadline_reminder_time_local = normalize_hhmm(
        current_user.default_deadline_reminder_time_local,
        "09:00",
    )
    current_user.default_waiting_reminder_time_local = normalize_hhmm(
        current_user.default_waiting_reminder_time_local,
        "10:00",
    )
    current_user.default_recurring_reminder_time_local = normalize_hhmm(
        current_user.default_recurring_reminder_time_local,
        "09:00",
    )
    await db.commit()
    await db.refresh(current_user)
    return build_user_settings(current_user)
