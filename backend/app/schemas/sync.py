from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.task import ReminderMode, TaskStatus, TaskType


class SyncTaskBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    type: TaskType
    status: TaskStatus = TaskStatus.active
    deadline_at: datetime | None = None
    remind_at: datetime | None = None
    reminder_mode: ReminderMode = ReminderMode.none
    reminder_time_local: str | None = Field(default=None, pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    reminder_interval_hours: int | None = Field(default=None, ge=1, le=24)
    recurrence_rule: str | None = Field(default=None, max_length=255)
    # Client-captured snapshot of the user's reminder-shaping settings. The backend
    # uses these to compute/fire this task's reminders; it keeps no user settings.
    reminder_timezone: str | None = Field(default=None, max_length=64)
    reminder_language: str | None = Field(default=None, max_length=8)
    snooze_minutes: int | None = Field(default=None, ge=5, le=240)
    updated_at: datetime
    deleted_at: datetime | None = None


class SyncTaskUpsert(SyncTaskBase):
    pass


class SyncBatchItem(SyncTaskBase):
    client_task_id: str = Field(min_length=1, max_length=64)


class SyncTaskRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    client_task_id: str
    title: str
    description: str | None
    type: TaskType
    status: TaskStatus
    deadline_at: datetime | None
    remind_at: datetime | None
    reminder_mode: ReminderMode
    reminder_time_local: str | None
    reminder_interval_hours: int | None
    recurrence_rule: str | None
    updated_at: datetime
    deleted_at: datetime | None
    completed_at: datetime | None
    cancelled_at: datetime | None
    last_reminded_at: datetime | None


class SyncTaskUpsertResponse(BaseModel):
    applied: bool
    task: SyncTaskRecord


class SyncBatchRequest(BaseModel):
    tasks: list[SyncBatchItem]


class SyncTaskListResponse(BaseModel):
    items: list[SyncTaskRecord]
    server_time: datetime
