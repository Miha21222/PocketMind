from datetime import UTC, datetime, timedelta

from app.models.task import Task, TaskStatus
from app.services.task_sync_service import clear_task_reminder_state, normalize_task_overdue_state


def cancel_task(task: Task) -> None:
    task.status = TaskStatus.cancelled
    task.cancelled_at = datetime.now(UTC)
    clear_task_reminder_state(task)


def snooze_task(task: Task, minutes: int) -> None:
    now = datetime.now(UTC)
    remind_at = now + timedelta(minutes=minutes)
    task.status = TaskStatus.snoozed
    task.snoozed_until = remind_at
    task.remind_at = remind_at
    normalize_task_overdue_state(task, now)
