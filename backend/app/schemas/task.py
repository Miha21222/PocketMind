from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.task import ReminderMode, TaskStatus, TaskType


class TaskBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    type: TaskType
    deadline_at: datetime | None = None
    remind_at: datetime | None = None
    reminder_mode: ReminderMode | None = None
    reminder_time_local: str | None = Field(default=None, pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    reminder_interval_hours: int | None = Field(default=None, ge=1, le=24)
    recurrence_rule: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def validate_rules(self) -> "TaskBase":
        if self.type == TaskType.recurring and not self.recurrence_rule:
            raise ValueError("recurrence_rule is required for recurring tasks")
        if self.reminder_mode == ReminderMode.daily_at_time and not self.reminder_time_local:
            raise ValueError("reminder_time_local is required for daily_at_time mode")
        if self.reminder_mode == ReminderMode.every_n_hours and not self.reminder_interval_hours:
            raise ValueError("reminder_interval_hours is required for every_n_hours mode")
        return self


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    type: TaskType | None = None
    status: TaskStatus | None = None
    deadline_at: datetime | None = None
    remind_at: datetime | None = None
    reminder_mode: ReminderMode | None = None
    reminder_time_local: str | None = Field(default=None, pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    reminder_interval_hours: int | None = Field(default=None, ge=1, le=24)
    recurrence_rule: str | None = Field(default=None, max_length=255)


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    description: str | None
    type: TaskType
    status: TaskStatus
    deadline_at: datetime | None
    remind_at: datetime | None
    reminder_mode: ReminderMode
    reminder_time_local: str | None
    reminder_interval_hours: int | None
    snoozed_until: datetime | None
    recurrence_rule: str | None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None
    cancelled_at: datetime | None
    last_reminded_at: datetime | None


class TaskListResponse(BaseModel):
    items: list[TaskOut]
    total: int


class TaskSnoozeRequest(BaseModel):
    minutes: int = Field(gt=0, le=60 * 24 * 30)


class TaskRescheduleRequest(BaseModel):
    remind_at: datetime | None = None
    deadline_at: datetime | None = None
