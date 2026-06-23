import re

from pydantic import BaseModel, Field, field_validator


SUPPORTED_LANGUAGES = {"en", "ru", "uk"}
SUPPORTED_REMINDER_MODES = {"none", "daily_at_time", "every_n_hours"}
HHMM_PATTERN = re.compile(r"^(?:[01]\d|2[0-3]):[0-5]\d$")


class UserSettingsOut(BaseModel):
    language: str
    timezone: str
    default_snooze_minutes: int
    default_quick_delay_minutes: int
    default_deadline_reminder_mode: str
    default_deadline_reminder_time_local: str
    default_deadline_reminder_interval_hours: int
    default_waiting_reminder_mode: str
    default_waiting_reminder_time_local: str
    default_waiting_reminder_interval_hours: int
    default_recurring_reminder_time_local: str


class UserSettingsUpdate(BaseModel):
    language: str | None = None
    timezone: str | None = None
    default_snooze_minutes: int | None = Field(default=None, ge=5, le=240)
    default_quick_delay_minutes: int | None = Field(default=None, ge=5, le=240)
    default_deadline_reminder_mode: str | None = None
    default_deadline_reminder_time_local: str | None = None
    default_deadline_reminder_interval_hours: int | None = Field(default=None, ge=1, le=24)
    default_waiting_reminder_mode: str | None = None
    default_waiting_reminder_time_local: str | None = None
    default_waiting_reminder_interval_hours: int | None = Field(default=None, ge=1, le=24)
    default_recurring_reminder_time_local: str | None = None

    @field_validator("language")
    @classmethod
    def validate_language(cls, value: str | None) -> str | None:
        if value is None:
            return None
        lowered = value.lower()
        if lowered not in SUPPORTED_LANGUAGES:
            raise ValueError("Unsupported language")
        return lowered

    @field_validator("default_deadline_reminder_mode", "default_waiting_reminder_mode")
    @classmethod
    def validate_reminder_mode(cls, value: str | None) -> str | None:
        if value is None:
            return None
        lowered = value.lower()
        if lowered not in SUPPORTED_REMINDER_MODES:
            raise ValueError("Unsupported reminder mode")
        return lowered

    @field_validator(
        "default_deadline_reminder_time_local",
        "default_waiting_reminder_time_local",
        "default_recurring_reminder_time_local",
    )
    @classmethod
    def validate_hhmm(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not HHMM_PATTERN.match(value):
            raise ValueError("Time must be in HH:mm format")
        return value
