from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    language: Mapped[str] = mapped_column(String(8), default="en", nullable=False)
    timezone: Mapped[str] = mapped_column(
        String(64), default="Europe/Kyiv", nullable=False
    )
    snooze_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    quick_delay_minutes: Mapped[int] = mapped_column(
        Integer, default=10, nullable=False
    )
    deadline_reminder_mode: Mapped[str] = mapped_column(
        String(32), default="daily_at_time", nullable=False
    )
    deadline_reminder_time_local: Mapped[str] = mapped_column(
        String(5), default="09:00", nullable=False
    )
    deadline_reminder_interval_hours: Mapped[int] = mapped_column(
        Integer, default=4, nullable=False
    )
    waiting_reminder_mode: Mapped[str] = mapped_column(
        String(32), default="daily_at_time", nullable=False
    )
    waiting_reminder_time_local: Mapped[str] = mapped_column(
        String(5), default="10:00", nullable=False
    )
    waiting_reminder_interval_hours: Mapped[int] = mapped_column(
        Integer, default=4, nullable=False
    )
    recurring_reminder_time_local: Mapped[str] = mapped_column(
        String(5), default="09:00", nullable=False
    )
    haptics_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    legacy_imported_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    user = relationship("User", back_populates="preferences")
