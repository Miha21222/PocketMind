"""Shared Telegram launch-data validation and user provisioning."""

import json
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.telegram_auth import TelegramAuthError, validate_init_data
from app.models.user import User


class TelegramIdentityError(ValueError):
    """Telegram launch data is missing or cannot identify a user."""


async def validate_and_upsert_telegram_user(db: AsyncSession, init_data: str) -> User:
    """Validate Telegram init data and create or refresh its local user."""
    try:
        data = validate_init_data(init_data)
        user_payload = data["user"]
        telegram_user = json.loads(user_payload)
        telegram_id = telegram_user["id"]
    except (
        TelegramAuthError,
        KeyError,
        TypeError,
        ValueError,
        json.JSONDecodeError,
    ) as exc:
        raise TelegramIdentityError("Invalid Telegram launch data") from exc

    if not isinstance(telegram_id, int):
        raise TelegramIdentityError("Telegram user id is missing")

    user = await db.scalar(select(User).where(User.telegram_id == telegram_id))
    now = datetime.now(UTC)
    if user is None:
        user = User(telegram_id=telegram_id)
        db.add(user)

    user.username = telegram_user.get("username")
    user.first_name = telegram_user.get("first_name")
    user.last_name = telegram_user.get("last_name")
    user.language_code = telegram_user.get("language_code")
    user.last_seen_at = now
    await db.flush()
    return user
