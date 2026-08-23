"""Server-owned task commands shared by HTML routes and migration imports."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import ReminderMode, Task, TaskStatus, TaskType
from app.models.user import User
from app.models.user_preferences import UserPreferences
from app.services.reminder_log_service import reconcile_pending_reminder_log
from app.services.task_sync_service import (
    apply_timing_by_type,
    clear_task_reminder_state,
    ensure_utc_datetime,
    normalize_task_overdue_state,
)
from app.services.user_settings_service import (
    clamp_int,
    normalize_hhmm,
    normalize_reminder_mode,
    normalize_timezone,
)

FINAL_STATUSES = {TaskStatus.done, TaskStatus.cancelled}


class TaskValidationError(ValueError):
    def __init__(self, field: str, message: str):
        self.field = field
        super().__init__(message)


class TaskCreateCommand(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    type: TaskType = TaskType.quick
    deadline_at: datetime | None = None
    recurrence_rule: str | None = None
    reminder_mode: ReminderMode | None = None
    reminder_time_local: str | None = None
    reminder_interval_hours: int | None = Field(default=None, ge=1, le=24)


class TaskUpdateCommand(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    type: TaskType | None = None
    deadline_at: datetime | None = None
    recurrence_rule: str | None = None
    reminder_mode: ReminderMode | None = None
    reminder_time_local: str | None = None
    reminder_interval_hours: int | None = Field(default=None, ge=1, le=24)


class PreferenceUpdateCommand(BaseModel):
    language: str | None = None
    timezone: str | None = None
    snooze_minutes: int | None = Field(default=None, ge=5, le=240)
    quick_delay_minutes: int | None = Field(default=None, ge=5, le=240)
    haptics_enabled: bool | None = None


class TaskSaveCommand(BaseModel):
    """Fully resolved task values used only after an ownership-scoped lookup."""

    title: str
    description: str | None
    type: TaskType
    deadline_at: datetime | None
    recurrence_rule: str | None
    reminder_mode: ReminderMode | None
    reminder_time_local: str | None
    reminder_interval_hours: int | None


class TaskReminderDefaults(BaseModel):
    reminder_mode: str
    reminder_time_local: str | None
    reminder_interval_hours: int | None


def task_defaults(
    preferences: UserPreferences, task_type: TaskType
) -> TaskReminderDefaults:
    if task_type == TaskType.deadline:
        return TaskReminderDefaults(
            reminder_mode=preferences.deadline_reminder_mode,
            reminder_time_local=preferences.deadline_reminder_time_local,
            reminder_interval_hours=preferences.deadline_reminder_interval_hours,
        )
    if task_type == TaskType.waiting:
        return TaskReminderDefaults(
            reminder_mode=preferences.waiting_reminder_mode,
            reminder_time_local=preferences.waiting_reminder_time_local,
            reminder_interval_hours=preferences.waiting_reminder_interval_hours,
        )
    if task_type == TaskType.recurring:
        return TaskReminderDefaults(
            reminder_mode="none",
            reminder_time_local=preferences.recurring_reminder_time_local,
            reminder_interval_hours=None,
        )
    return TaskReminderDefaults(
        reminder_mode="none", reminder_time_local=None, reminder_interval_hours=None
    )


def apply_preferences_snapshot(task: Task, preferences: UserPreferences) -> None:
    task.reminder_timezone = preferences.timezone
    task.reminder_language = preferences.language
    task.snooze_minutes = preferences.snooze_minutes


def _validate(task: Task) -> None:
    if not task.title.strip():
        raise TaskValidationError("title", "Title is required")
    if task.type == TaskType.deadline and task.deadline_at is None:
        raise TaskValidationError("deadline_at", "A deadline is required")
    if task.type == TaskType.recurring and not task.recurrence_rule:
        raise TaskValidationError("recurrence_rule", "A recurrence is required")


async def get_preferences(db: AsyncSession, user: User) -> UserPreferences:
    preferences = await db.scalar(
        select(UserPreferences).where(UserPreferences.user_id == user.id)
    )
    if preferences is None:
        preferences = UserPreferences(
            user_id=user.id, language=(user.language_code or "en")[:2]
        )
        db.add(preferences)
        await db.flush()
    return preferences


async def get_task(db: AsyncSession, user: User, client_task_id: str) -> Task | None:
    task = await db.scalar(
        select(Task).where(
            Task.user_id == user.id,
            Task.client_task_id == client_task_id,
            Task.deleted_at.is_(None),
        )
    )
    if task is not None:
        normalize_task_overdue_state(task, datetime.now(UTC))
    return task


def _create_values(command: TaskCreateCommand) -> TaskSaveCommand:
    return TaskSaveCommand(**command.model_dump())


def _update_values(task: Task, command: TaskUpdateCommand) -> TaskSaveCommand:
    fields = command.model_fields_set
    return TaskSaveCommand(
        title=command.title if command.title is not None else task.title,
        description=command.description
        if "description" in fields
        else task.description,
        type=command.type or task.type,
        deadline_at=command.deadline_at
        if "deadline_at" in fields
        else task.deadline_at,
        recurrence_rule=(
            command.recurrence_rule
            if "recurrence_rule" in fields
            else task.recurrence_rule
        ),
        reminder_mode=command.reminder_mode or task.reminder_mode,
        reminder_time_local=(
            command.reminder_time_local
            if "reminder_time_local" in fields
            else task.reminder_time_local
        ),
        reminder_interval_hours=(
            command.reminder_interval_hours
            if "reminder_interval_hours" in fields
            else task.reminder_interval_hours
        ),
    )


async def _apply_task_save(
    db: AsyncSession,
    user: User,
    task: Task,
    command: TaskSaveCommand,
    *,
    reset_quick_timer: bool,
) -> Task:
    preferences = await get_preferences(db, user)
    now = datetime.now(UTC)
    task.title = command.title.strip()
    task.description = (command.description or "").strip() or None
    task.type = command.type
    task.deadline_at = (
        ensure_utc_datetime(command.deadline_at)
        if command.deadline_at is not None
        else None
    )
    task.recurrence_rule = (command.recurrence_rule or "").strip() or None
    defaults = task_defaults(preferences, command.type)
    default_mode = defaults.reminder_mode
    selected_mode = (
        command.reminder_mode.value
        if command.reminder_mode is not None
        else default_mode
    )
    task.reminder_mode = ReminderMode(
        normalize_reminder_mode(selected_mode, default_mode)
    )
    task.reminder_time_local = (
        normalize_hhmm(
            command.reminder_time_local or "", defaults.reminder_time_local or "09:00"
        )
        if defaults.reminder_time_local
        else None
    )
    if defaults.reminder_interval_hours:
        task.reminder_interval_hours = max(
            1,
            min(
                24, command.reminder_interval_hours or defaults.reminder_interval_hours
            ),
        )
    else:
        task.reminder_interval_hours = None
    apply_preferences_snapshot(task, preferences)
    _validate(task)
    if command.type == TaskType.no_deadline and task.deadline_at is None:
        task.reminder_mode = ReminderMode.none
        task.reminder_time_local = None
        task.reminder_interval_hours = None
        clear_task_reminder_state(task)
    apply_timing_by_type(
        task, preferences.timezone, now, reset_quick_timer=reset_quick_timer
    )
    if command.type == TaskType.quick and reset_quick_timer:
        task.remind_at = now + timedelta(minutes=preferences.quick_delay_minutes)
    normalize_task_overdue_state(task, now)
    task.updated_at = now
    await db.flush()
    await reconcile_pending_reminder_log(db, task)
    return task


async def create_task(db: AsyncSession, user: User, command: TaskCreateCommand) -> Task:
    task = Task(
        user_id=user.id,
        client_task_id=str(uuid4()),
        title="",
        type=command.type,
    )
    db.add(task)
    return await _apply_task_save(
        db, user, task, _create_values(command), reset_quick_timer=True
    )


async def update_task(
    db: AsyncSession,
    user: User,
    client_task_id: str,
    command: TaskUpdateCommand,
) -> Task | None:
    task = await get_task(db, user, client_task_id)
    if task is None:
        return None
    return await _apply_task_save(
        db, user, task, _update_values(task, command), reset_quick_timer=False
    )


async def complete_task(
    db: AsyncSession, user: User, client_task_id: str
) -> Task | None:
    task = await get_task(db, user, client_task_id)
    if task is None:
        return None
    now = datetime.now(UTC)
    if task.type == TaskType.recurring:
        preferences = await get_preferences(db, user)
        apply_preferences_snapshot(task, preferences)
        apply_timing_by_type(task, preferences.timezone, now)
        task.completed_at = now
        task.status = TaskStatus.active
    else:
        task.status = TaskStatus.done
        task.completed_at = now
        clear_task_reminder_state(task)
    task.updated_at = now
    await reconcile_pending_reminder_log(db, task)
    return task


async def cancel_task(db: AsyncSession, user: User, client_task_id: str) -> Task | None:
    task = await get_task(db, user, client_task_id)
    if task is None:
        return None
    now = datetime.now(UTC)
    task.status = TaskStatus.cancelled
    task.cancelled_at = now
    task.updated_at = now
    clear_task_reminder_state(task)
    await reconcile_pending_reminder_log(db, task)
    return task


async def delete_task(db: AsyncSession, user: User, client_task_id: str) -> Task | None:
    task = await get_task(db, user, client_task_id)
    if task is None:
        return None
    now = datetime.now(UTC)
    task.deleted_at = now
    task.updated_at = now
    clear_task_reminder_state(task)
    await reconcile_pending_reminder_log(db, task)
    return task


async def update_preferences(
    db: AsyncSession, user: User, command: PreferenceUpdateCommand
) -> UserPreferences:
    preferences = await get_preferences(db, user)
    if command.language is not None:
        preferences.language = (
            command.language if command.language in {"en", "ru", "uk"} else "en"
        )
    if command.timezone is not None:
        preferences.timezone = normalize_timezone(command.timezone)
    if command.snooze_minutes is not None:
        preferences.snooze_minutes = clamp_int(command.snooze_minutes, 15, 5, 240)
    if command.quick_delay_minutes is not None:
        preferences.quick_delay_minutes = clamp_int(
            command.quick_delay_minutes, 10, 5, 240
        )
    if command.haptics_enabled is not None:
        preferences.haptics_enabled = command.haptics_enabled
    active_tasks = (
        await db.scalars(
            select(Task).where(
                Task.user_id == user.id,
                Task.deleted_at.is_(None),
                Task.status.not_in(tuple(FINAL_STATUSES)),
            )
        )
    ).all()
    for task in active_tasks:
        apply_preferences_snapshot(task, preferences)
        if task.status != TaskStatus.snoozed:
            apply_timing_by_type(task, preferences.timezone, datetime.now(UTC))
        normalize_task_overdue_state(task, datetime.now(UTC))
        await reconcile_pending_reminder_log(db, task)
    return preferences
