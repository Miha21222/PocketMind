from datetime import UTC, datetime

from sqlalchemy import BigInteger, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    first_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    language_code: Mapped[str | None] = mapped_column(String(16), nullable=True)
    preferred_language: Mapped[str | None] = mapped_column(String(8), nullable=True)
    preferred_timezone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    default_snooze_minutes: Mapped[int] = mapped_column(default=15, nullable=False)
    default_quick_delay_minutes: Mapped[int] = mapped_column(default=10, nullable=False)
    default_deadline_reminder_mode: Mapped[str] = mapped_column(String(32), default="daily_at_time", nullable=False)
    default_deadline_reminder_time_local: Mapped[str] = mapped_column(String(5), default="09:00", nullable=False)
    default_deadline_reminder_interval_hours: Mapped[int] = mapped_column(default=4, nullable=False)
    default_waiting_reminder_mode: Mapped[str] = mapped_column(String(32), default="daily_at_time", nullable=False)
    default_waiting_reminder_time_local: Mapped[str] = mapped_column(String(5), default="10:00", nullable=False)
    default_waiting_reminder_interval_hours: Mapped[int] = mapped_column(default=4, nullable=False)
    default_recurring_reminder_time_local: Mapped[str] = mapped_column(String(5), default="09:00", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
