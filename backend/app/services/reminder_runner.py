import logging

from aiogram import Bot
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.user import User
from app.services.reminder_service import send_task_reminder
from app.services.task_service import get_due_tasks

logger = logging.getLogger(__name__)


async def process_due_tasks_once(bot: Bot) -> dict[str, int]:
    processed = 0
    sent = 0
    failed = 0

    async with SessionLocal() as db:
        due_tasks = await get_due_tasks(db)
        processed = len(due_tasks)

        for task in due_tasks:
            task_id = task.id
            user = await db.scalar(select(User).where(User.id == task.user_id))
            if user is None:
                logger.warning("Skip task %s because user %s not found", task_id, task.user_id)
                failed += 1
                continue

            try:
                await send_task_reminder(db, bot, task, user)
                await db.commit()
                sent += 1
            except Exception as exc:  # noqa: BLE001
                await db.rollback()
                failed += 1
                logger.exception("Reminder send failed for task=%s: %s", task_id, exc)

    return {"processed": processed, "sent": sent, "failed": failed}
