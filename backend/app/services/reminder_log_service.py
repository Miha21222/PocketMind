from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reminder_log import ReminderLog, ReminderStatus
from app.models.task import Task
from app.services.task_sync_service import ensure_utc_datetime


async def reconcile_pending_reminder_log(db: AsyncSession, task: Task) -> None:
    if task.id is None:
        await db.flush()

    pending_logs = (
        await db.scalars(
            select(ReminderLog).where(
                ReminderLog.task_id == task.id,
                ReminderLog.status == ReminderStatus.pending,
            )
        )
    ).all()
    for log_entry in pending_logs:
        log_entry.status = ReminderStatus.cancelled

    scheduled_for = ensure_utc_datetime(task.remind_at)
    if scheduled_for is not None:
        db.add(
            ReminderLog(
                task_id=task.id,
                user_id=task.user_id,
                scheduled_for=scheduled_for,
                status=ReminderStatus.pending,
            )
        )
