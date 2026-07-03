from datetime import UTC, datetime

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task, TaskStatus
from app.services.reminder_log_service import reconcile_pending_reminder_log
from app.services.task_sync_service import RUNTIME_TRACKED_TASK_STATUSES, SCHEDULABLE_TASK_STATUSES, ensure_utc_datetime, normalize_task_overdue_state


async def get_due_tasks(db: AsyncSession) -> list[Task]:
    now = datetime.now(UTC)
    candidates = list(
        (
            await db.scalars(
                select(Task).where(
                    Task.deleted_at.is_(None),
                    Task.status.in_(tuple(RUNTIME_TRACKED_TASK_STATUSES)),
                    or_(
                        Task.status == TaskStatus.overdue,
                        Task.remind_at <= now,
                        Task.deadline_at <= now,
                    ),
                )
            )
        ).all()
    )

    mutated_tasks: list[Task] = []
    due_tasks: list[Task] = []
    for task in candidates:
        before = (task.status, task.remind_at, task.snoozed_until)
        normalize_task_overdue_state(task, now)
        if (task.status, task.remind_at, task.snoozed_until) != before:
            mutated_tasks.append(task)
        remind_at = ensure_utc_datetime(task.remind_at)
        if (
            task.deleted_at is None
            and remind_at is not None
            and remind_at <= now
            and task.status in SCHEDULABLE_TASK_STATUSES
        ):
            due_tasks.append(task)

    if mutated_tasks:
        for task in mutated_tasks:
            await reconcile_pending_reminder_log(db, task)
        await db.commit()

    return due_tasks
