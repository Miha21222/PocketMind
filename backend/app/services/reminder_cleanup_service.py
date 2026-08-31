import logging

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError, TelegramBadRequest
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.reminder_log import ReminderLog, ReminderStatus
from app.models.task import Task, TaskStatus

logger = logging.getLogger(__name__)

_DELETE_OK_ERROR_MARKERS = (
    "message to delete not found",
    "message can't be deleted",
    "chat not found",
)


def _is_delete_terminal_error(exc: TelegramBadRequest) -> bool:
    text = str(exc).lower()
    return any(marker in text for marker in _DELETE_OK_ERROR_MARKERS)


async def cleanup_task_reminder_messages(
    db: AsyncSession,
    task_id: int,
    bot: Bot | None = None,
) -> int:
    try:
        reminder_logs = (
            await db.scalars(
                select(ReminderLog).where(
                    ReminderLog.task_id == task_id,
                    ReminderLog.status == ReminderStatus.sent,
                    ReminderLog.chat_id.is_not(None),
                    ReminderLog.message_id.is_not(None),
                )
            )
        ).all()
    except SQLAlchemyError as exc:
        await db.rollback()
        logger.warning("Skip reminder cleanup for task=%s due to DB schema/state issue: %s", task_id, exc)
        return 0
    if not reminder_logs:
        return 0

    local_bot = bot
    created_local_bot = False
    if local_bot is None:
        settings = get_settings()
        if not settings.bot_token:
            logger.warning("Skip reminder cleanup for task=%s: BOT_TOKEN is not configured", task_id)
            return 0
        local_bot = Bot(token=settings.bot_token)
        created_local_bot = True

    cancelled_count = 0
    try:
        for log_entry in reminder_logs:
            assert local_bot is not None
            try:
                await local_bot.delete_message(chat_id=log_entry.chat_id, message_id=log_entry.message_id)
                log_entry.status = ReminderStatus.cancelled
                cancelled_count += 1
            except TelegramBadRequest as exc:
                if _is_delete_terminal_error(exc):
                    log_entry.status = ReminderStatus.cancelled
                    cancelled_count += 1
                    continue
                logger.warning("Reminder cleanup bad request task=%s log=%s: %s", task_id, log_entry.id, exc)
            except TelegramAPIError as exc:
                logger.warning("Reminder cleanup telegram error task=%s log=%s: %s", task_id, log_entry.id, exc)
            except Exception as exc:  # noqa: BLE001
                logger.exception("Reminder cleanup unexpected error task=%s log=%s: %s", task_id, log_entry.id, exc)
    finally:
        if created_local_bot and local_bot is not None:
            await local_bot.session.close()

    if cancelled_count:
        await db.commit()
    return cancelled_count


async def cleanup_task_reminders_if_closed(
    db: AsyncSession, task: Task, bot: Bot | None = None
) -> int:
    """Delete sent reminder messages once a task is done, cancelled, or deleted."""
    if task.status not in {TaskStatus.done, TaskStatus.cancelled} and task.deleted_at is None:
        return 0
    return await cleanup_task_reminder_messages(db, task.id, bot=bot)
