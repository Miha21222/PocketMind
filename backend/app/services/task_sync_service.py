from datetime import UTC, datetime, timedelta
from uuid import uuid4

from app.models.task import ReminderMode, Task, TaskStatus, TaskType
from app.schemas.sync import SyncTaskRecord, SyncTaskUpsert
from app.services.reminder_planning_service import next_recurrence_reminder, next_strategy_reminder
from app.services.user_settings_service import (
    clamp_int,
    normalize_hhmm,
    normalize_language,
    normalize_reminder_mode,
    normalize_timezone,
)


def ensure_utc_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def ensure_client_task_id(task: Task) -> None:
    if not task.client_task_id:
        task.client_task_id = str(uuid4())


# Static fallbacks used only when a task omits a reminder field. The client
# normally sends concrete reminder fields (it owns all settings), so these are
# rarely hit; they exist so the backend never depends on per-user settings.
_DEFAULT_QUICK_DELAY_MINUTES = 10
_DEFAULT_DEADLINE_TIME = "09:00"
_DEFAULT_WAITING_TIME = "10:00"
_DEFAULT_RECURRING_TIME = "09:00"
_DEFAULT_INTERVAL_HOURS = 4


def apply_timing_by_type(task: Task, timezone: str, now: datetime, reset_quick_timer: bool = False) -> None:
    if task.type == TaskType.quick:
        task.reminder_mode = ReminderMode.none
        task.reminder_time_local = None
        task.reminder_interval_hours = None
        task.deadline_at = None
        task.recurrence_rule = None
        if reset_quick_timer or task.remind_at is None:
            task.remind_at = now + timedelta(minutes=_DEFAULT_QUICK_DELAY_MINUTES)
        if task.status not in {TaskStatus.done, TaskStatus.cancelled}:
            task.status = TaskStatus.planned
        return

    if task.type == TaskType.deadline:
        mode = normalize_reminder_mode(task.reminder_mode.value if task.reminder_mode else None, "daily_at_time")
        task.reminder_mode = ReminderMode(mode)
        task.reminder_time_local = normalize_hhmm(task.reminder_time_local, _DEFAULT_DEADLINE_TIME)
        task.reminder_interval_hours = clamp_int(task.reminder_interval_hours, _DEFAULT_INTERVAL_HOURS, 1, 24)
        task.remind_at = next_strategy_reminder(
            now_utc=now,
            timezone=timezone,
            mode=task.reminder_mode,
            hhmm=task.reminder_time_local,
            interval_hours=task.reminder_interval_hours,
            deadline_at=task.deadline_at,
        )
        if task.status not in {TaskStatus.done, TaskStatus.cancelled}:
            task.status = TaskStatus.planned if task.remind_at else TaskStatus.new
        return

    if task.type == TaskType.waiting:
        mode = normalize_reminder_mode(task.reminder_mode.value if task.reminder_mode else None, "daily_at_time")
        task.reminder_mode = ReminderMode(mode)
        task.reminder_time_local = normalize_hhmm(task.reminder_time_local, _DEFAULT_WAITING_TIME)
        task.reminder_interval_hours = clamp_int(task.reminder_interval_hours, _DEFAULT_INTERVAL_HOURS, 1, 24)
        task.remind_at = next_strategy_reminder(
            now_utc=now,
            timezone=timezone,
            mode=task.reminder_mode,
            hhmm=task.reminder_time_local,
            interval_hours=task.reminder_interval_hours,
            deadline_at=task.deadline_at,
        )
        if task.status not in {TaskStatus.done, TaskStatus.cancelled}:
            task.status = TaskStatus.planned if task.remind_at else TaskStatus.new
        return

    if task.type == TaskType.recurring:
        task.reminder_mode = ReminderMode.none
        task.reminder_interval_hours = None
        task.deadline_at = None
        task.reminder_time_local = normalize_hhmm(task.reminder_time_local, _DEFAULT_RECURRING_TIME)
        task.remind_at = next_recurrence_reminder(
            now_utc=now,
            timezone=timezone,
            recurrence_rule=task.recurrence_rule,
            hhmm=task.reminder_time_local,
        )
        if task.status not in {TaskStatus.done, TaskStatus.cancelled}:
            task.status = TaskStatus.planned if task.remind_at else TaskStatus.new
        return

    task.reminder_mode = ReminderMode.none
    task.reminder_time_local = None
    task.reminder_interval_hours = None
    if task.status not in {TaskStatus.done, TaskStatus.cancelled} and task.remind_at:
        task.status = TaskStatus.planned
    elif task.status not in {TaskStatus.done, TaskStatus.cancelled}:
        task.status = TaskStatus.new


def apply_sync_payload(task: Task, payload: SyncTaskUpsert, now: datetime | None = None) -> None:
    effective_now = now or datetime.now(UTC)
    ensure_client_task_id(task)
    task.title = payload.title
    task.description = payload.description
    task.type = payload.type
    task.status = payload.status
    task.deadline_at = payload.deadline_at
    task.remind_at = payload.remind_at
    task.reminder_mode = payload.reminder_mode
    task.reminder_time_local = payload.reminder_time_local
    task.reminder_interval_hours = payload.reminder_interval_hours
    task.recurrence_rule = payload.recurrence_rule
    # Per-task settings snapshot. normalize_timezone always yields a valid zone
    # (falls back to DEFAULT_TIMEZONE), so reminder math below never lacks one.
    task.reminder_timezone = normalize_timezone(payload.reminder_timezone)
    task.reminder_language = normalize_language(payload.reminder_language) if payload.reminder_language else None
    task.snooze_minutes = clamp_int(payload.snooze_minutes, 15, 5, 240) if payload.snooze_minutes is not None else None
    task.deleted_at = ensure_utc_datetime(payload.deleted_at)
    task.updated_at = ensure_utc_datetime(payload.updated_at) or effective_now

    if payload.deleted_at is not None:
        task.status = TaskStatus.cancelled
        task.cancelled_at = ensure_utc_datetime(payload.deleted_at)
        task.remind_at = None
        task.snoozed_until = None
        return

    reset_quick_timer = task.type == TaskType.quick and payload.remind_at is None
    apply_timing_by_type(task, timezone=task.reminder_timezone, now=effective_now, reset_quick_timer=reset_quick_timer)


def mark_sync_task_deleted(task: Task, deleted_at: datetime | None = None) -> None:
    when = deleted_at or datetime.now(UTC)
    ensure_client_task_id(task)
    task.deleted_at = when
    task.updated_at = when
    task.cancelled_at = when
    task.status = TaskStatus.cancelled
    task.remind_at = None
    task.snoozed_until = None


def to_sync_record(task: Task) -> SyncTaskRecord:
    ensure_client_task_id(task)
    return SyncTaskRecord(
        client_task_id=task.client_task_id,
        title=task.title,
        type=task.type,
        status=task.status,
        deadline_at=ensure_utc_datetime(task.deadline_at),
        remind_at=ensure_utc_datetime(task.remind_at),
        reminder_mode=task.reminder_mode,
        reminder_time_local=task.reminder_time_local,
        reminder_interval_hours=task.reminder_interval_hours,
        recurrence_rule=task.recurrence_rule,
        updated_at=ensure_utc_datetime(task.updated_at) or datetime.now(UTC),
        deleted_at=ensure_utc_datetime(task.deleted_at),
        completed_at=ensure_utc_datetime(task.completed_at),
        cancelled_at=ensure_utc_datetime(task.cancelled_at),
        last_reminded_at=ensure_utc_datetime(task.last_reminded_at),
    )
