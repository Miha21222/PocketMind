from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.config import get_settings


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
