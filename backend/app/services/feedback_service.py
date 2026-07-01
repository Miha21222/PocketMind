import logging

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from aiogram.types import BufferedInputFile

from app.core.config import Settings, get_settings
from app.models.feedback import Feedback, FeedbackKind
from app.models.user import User

logger = logging.getLogger(__name__)


def _format_user(user: User) -> str:
    handle = f"@{user.username}" if user.username else user.first_name or "unknown"
    return f"{handle} (telegram_id={user.telegram_id})"


def _build_text(record: Feedback, user: User) -> str:
    if record.kind == FeedbackKind.rating:
        lines = [f"⭐ New rating: {record.rating}/5", f"From: {_format_user(user)}"]
        if record.message:
            lines.append(f"Comment: {record.message}")
        return "\n".join(lines)

    return "\n".join(["🐞 New bug report", f"From: {_format_user(user)}", f"Description: {record.message}"])


def _topic_id(record: Feedback, settings: Settings) -> int:
    return settings.feedback_topic_id if record.kind == FeedbackKind.rating else settings.bug_report_topic_id


async def notify_feedback(record: Feedback, user: User) -> None:
    """Best-effort Telegram ping for a just-persisted Feedback row.

    The DB row is the source of truth; a missing BOT_TOKEN or a Telegram API
    failure here must never fail the submission itself.
    """
    settings = get_settings()
    if not settings.bot_token:
        logger.warning("Skip feedback notification id=%s: BOT_TOKEN is not configured", record.id)
        return

    bot = Bot(token=settings.bot_token)
    try:
        await bot.send_message(
            chat_id=settings.feedback_chat_id,
            message_thread_id=_topic_id(record, settings),
            text=_build_text(record, user),
        )
    except TelegramAPIError as exc:
        logger.warning("Feedback notification telegram error id=%s: %s", record.id, exc)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Feedback notification unexpected error id=%s: %s", record.id, exc)
    finally:
        await bot.session.close()


async def notify_feedback_screenshot(record: Feedback, image_bytes: bytes, filename: str) -> None:
    """Best-effort forward of an attached screenshot into the same topic.

    Same never-fail contract as notify_feedback: the screenshot is already
    persisted to disk by the caller before this is invoked.
    """
    settings = get_settings()
    if not settings.bot_token:
        logger.warning("Skip feedback screenshot notification id=%s: BOT_TOKEN is not configured", record.id)
        return

    bot = Bot(token=settings.bot_token)
    try:
        await bot.send_photo(
            chat_id=settings.feedback_chat_id,
            message_thread_id=_topic_id(record, settings),
            photo=BufferedInputFile(image_bytes, filename=filename),
            caption=f"Screenshot for feedback #{record.id}",
        )
    except TelegramAPIError as exc:
        logger.warning("Feedback screenshot notification telegram error id=%s: %s", record.id, exc)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Feedback screenshot notification unexpected error id=%s: %s", record.id, exc)
    finally:
        await bot.session.close()
