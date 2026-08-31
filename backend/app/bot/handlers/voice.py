"""Transcribe Telegram voice messages into quick tasks."""

import asyncio
import logging
from datetime import UTC, datetime

from aiogram import F, Router
from aiogram.types import Message
from sqlalchemy import select

from app.bot.i18n import resolve_user_language, t
from app.db.session import SessionLocal
from app.models.user import User
from app.services.task_application_service import TaskCreateCommand, create_task
from app.services.transcription_service import MAX_AUDIO_BYTES, transcribe_audio

logger = logging.getLogger(__name__)

router = Router()

MAX_TITLE_LENGTH = 255


async def _get_or_create_user(db, telegram_user) -> User:
    user = await db.scalar(
        select(User).where(User.telegram_id == telegram_user.id)
    )
    now = datetime.now(UTC)
    if user is None:
        user = User(telegram_id=telegram_user.id)
        db.add(user)
    user.username = getattr(telegram_user, "username", None)
    user.first_name = getattr(telegram_user, "first_name", None)
    user.last_name = getattr(telegram_user, "last_name", None)
    user.language_code = getattr(telegram_user, "language_code", None)
    user.last_seen_at = now
    await db.flush()
    return user


@router.message(F.voice)
async def on_voice_message(message: Message) -> None:
    if not message.from_user or not message.voice:
        return
    lang = resolve_user_language(None, message.from_user.language_code)

    voice = message.voice
    if voice.file_size and voice.file_size > MAX_AUDIO_BYTES:
        await message.answer(t(lang, "voice_too_large"))
        return

    try:
        downloaded = await message.bot.download(voice)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Voice download failed for user=%s: %s", message.from_user.id, exc)
        await message.answer(t(lang, "voice_transcribe_failed"))
        return

    audio_bytes = downloaded.read() if hasattr(downloaded, "read") else downloaded
    if not audio_bytes or len(audio_bytes) > MAX_AUDIO_BYTES:
        await message.answer(t(lang, "voice_too_large"))
        return

    try:
        text = await asyncio.to_thread(transcribe_audio, audio_bytes)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Voice transcription failed for user=%s: %s", message.from_user.id, exc)
        await message.answer(t(lang, "voice_transcribe_failed"))
        return

    title = " ".join(text.split())[:MAX_TITLE_LENGTH]
    if not title:
        await message.answer(t(lang, "voice_no_speech"))
        return

    try:
        async with SessionLocal() as db:
            user = await _get_or_create_user(db, message.from_user)
            await create_task(db, user, TaskCreateCommand(title=title))
            await db.commit()
    except Exception as exc:  # noqa: BLE001
        logger.exception("Voice task creation failed for user=%s: %s", message.from_user.id, exc)
        await message.answer(t(lang, "voice_transcribe_failed"))
        return

    await message.answer(t(lang, "voice_task_created", title=title))