import json
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.core.telegram_auth import TelegramAuthError, validate_init_data
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import AuthResponse, TelegramAuthRequest
from app.schemas.user import UserOut
from app.services.user_settings_service import build_user_settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/telegram", response_model=AuthResponse)
async def auth_telegram(payload: TelegramAuthRequest, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    try:
        data = validate_init_data(payload.init_data)
    except TelegramAuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    user_payload = data.get("user")
    if not user_payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="initData user payload is missing")

    try:
        tg_user = json.loads(user_payload)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Telegram user payload") from exc

    telegram_id = tg_user.get("id")
    if telegram_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Telegram user id is missing")

    user = await db.scalar(select(User).where(User.telegram_id == telegram_id))
    now = datetime.now(UTC)
    if user is None:
        user = User(
            telegram_id=telegram_id,
            username=tg_user.get("username"),
            first_name=tg_user.get("first_name"),
            last_name=tg_user.get("last_name"),
            language_code=tg_user.get("language_code"),
            preferred_language=None,
            preferred_timezone=None,
            default_snooze_minutes=15,
            default_quick_delay_minutes=10,
            default_deadline_reminder_mode="daily_at_time",
            default_deadline_reminder_time_local="09:00",
            default_deadline_reminder_interval_hours=4,
            default_waiting_reminder_mode="daily_at_time",
            default_waiting_reminder_time_local="10:00",
            default_waiting_reminder_interval_hours=4,
            default_recurring_reminder_time_local="09:00",
            last_seen_at=now,
        )
        db.add(user)
    else:
        user.username = tg_user.get("username")
        user.first_name = tg_user.get("first_name")
        user.last_name = tg_user.get("last_name")
        user.language_code = tg_user.get("language_code")
        user.last_seen_at = now

    await db.commit()
    await db.refresh(user)

    token = create_access_token(subject=str(user.id))
    user_out = UserOut.model_validate(user).model_copy(update={"settings": build_user_settings(user)})
    return AuthResponse(access_token=token, user=user_out)
