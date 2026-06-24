from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.config import get_settings
from app.models.user import User
from app.schemas.settings import UserSettingsOut


def normalize_hhmm(value: str | None, fallback: str) -> str:
    if not value or len(value) != 5:
        return fallback
    hhmm = value.strip()
    hour, sep, minute = hhmm.partition(":")
    if sep != ":":
        return fallback
    if not (hour.isdigit() and minute.isdigit()):
        return fallback
    h = int(hour)
    m = int(minute)
    if h < 0 or h > 23 or m < 0 or m > 59:
        return fallback
    return f"{h:02d}:{m:02d}"


def normalize_reminder_mode(value: str | None, fallback: str) -> str:
    if value in {"none", "daily_at_time", "every_n_hours", "once_at_time"}:
        return value
    return fallback


def clamp_int(value: int | None, fallback: int, min_value: int, max_value: int) -> int:
    if value is None:
        return fallback
    return max(min_value, min(max_value, int(value)))


def normalize_language(value: str | None) -> str:
    if not value:
        return "en"
    lowered = value.lower()
    if lowered.startswith("uk"):
        return "uk"
    if lowered.startswith("ru"):
        return "ru"
    return "en"


def normalize_timezone(value: str | None) -> str:
    fallback = get_settings().default_timezone
    if not value:
        return fallback
    try:
        ZoneInfo(value)
        return value
    except ZoneInfoNotFoundError:
        return fallback


def build_user_settings(user: User) -> UserSettingsOut:
    language = normalize_language(user.preferred_language or user.language_code)
    timezone = normalize_timezone(user.preferred_timezone)
    snooze_minutes = clamp_int(user.default_snooze_minutes, 15, 5, 240)
    quick_delay = clamp_int(user.default_quick_delay_minutes, 10, 5, 240)
    deadline_mode = normalize_reminder_mode(user.default_deadline_reminder_mode, "daily_at_time")
    deadline_time = normalize_hhmm(user.default_deadline_reminder_time_local, "09:00")
    deadline_interval = clamp_int(user.default_deadline_reminder_interval_hours, 4, 1, 24)
    waiting_mode = normalize_reminder_mode(user.default_waiting_reminder_mode, "daily_at_time")
    waiting_time = normalize_hhmm(user.default_waiting_reminder_time_local, "10:00")
    waiting_interval = clamp_int(user.default_waiting_reminder_interval_hours, 4, 1, 24)
    recurring_time = normalize_hhmm(user.default_recurring_reminder_time_local, "09:00")
    return UserSettingsOut(
        language=language,
        timezone=timezone,
        default_snooze_minutes=snooze_minutes,
        default_quick_delay_minutes=quick_delay,
        default_deadline_reminder_mode=deadline_mode,
        default_deadline_reminder_time_local=deadline_time,
        default_deadline_reminder_interval_hours=deadline_interval,
        default_waiting_reminder_mode=waiting_mode,
        default_waiting_reminder_time_local=waiting_time,
        default_waiting_reminder_interval_hours=waiting_interval,
        default_recurring_reminder_time_local=recurring_time,
    )
