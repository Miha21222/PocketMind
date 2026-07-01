from datetime import UTC, datetime, timedelta

from app.models.task import Task, TaskStatus, TaskType
from app.services.reminder_planning_service import next_recurrence_reminder
from app.services.task_sync_service import clear_task_reminder_state, normalize_task_overdue_state


def complete_task(task: Task, timezone: str = "UTC") -> None:
    now = datetime.now(UTC)
    if task.type == TaskType.recurring and task.recurrence_rule:
        next_reminder = next_recurrence_reminder(
            now_utc=now,
            timezone=timezone,
            recurrence_rule=task.recurrence_rule,
            hhmm=task.reminder_time_local,
        )
        if next_reminder:
            task.remind_at = next_reminder
            task.snoozed_until = None
            task.status = TaskStatus.active
            task.completed_at = now
            return

    task.status = TaskStatus.done
    task.completed_at = now
    clear_task_reminder_state(task)


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
