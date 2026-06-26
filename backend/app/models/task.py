import enum
from datetime import UTC, datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TaskType(str, enum.Enum):
    quick = "quick"
    deadline = "deadline"
    no_deadline = "no_deadline"
    recurring = "recurring"
    waiting = "waiting"


class TaskStatus(str, enum.Enum):
    new = "new"
    planned = "planned"
    reminded = "reminded"
    snoozed = "snoozed"
    done = "done"
    cancelled = "cancelled"


class ReminderMode(str, enum.Enum):
    none = "none"
    daily_at_time = "daily_at_time"
    every_n_hours = "every_n_hours"
    once_at_time = "once_at_time"


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (UniqueConstraint("user_id", "client_task_id", name="uq_tasks_user_client_task_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    client_task_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[TaskType] = mapped_column(Enum(TaskType), default=TaskType.quick, nullable=False)
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), default=TaskStatus.new, nullable=False)
    deadline_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    remind_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reminder_mode: Mapped[ReminderMode] = mapped_column(
        Enum(ReminderMode, name="remindermode"),
        default=ReminderMode.none,
        nullable=False,
    )
    reminder_time_local: Mapped[str | None] = mapped_column(String(5), nullable=True)
    reminder_interval_hours: Mapped[int | None] = mapped_column(nullable=True)
    snoozed_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    recurrence_rule: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Per-task snapshot of the user's reminder-shaping settings, taken on the
    # client at sync time. The backend owns no user settings; everything it needs
    # to compute and fire this task's reminders travels with the task itself.
    reminder_timezone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reminder_language: Mapped[str | None] = mapped_column(String(8), nullable=True)
    snooze_minutes: Mapped[int | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_reminded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="tasks")
    reminder_logs = relationship("ReminderLog", back_populates="task", cascade="all, delete-orphan")
