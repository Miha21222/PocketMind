from __future__ import annotations

from calendar import monthrange
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.models.task import ReminderMode, Task, TaskType


def parse_hhmm(value: str | None, fallback: str = "09:00") -> time:
    raw = value or fallback
    hour, _, minute = raw.partition(":")
    try:
        h = int(hour)
        m = int(minute)
    except ValueError:
        h, m = map(int, fallback.split(":"))
    h = max(0, min(23, h))
    m = max(0, min(59, m))
    return time(hour=h, minute=m)


def combine_local_to_utc(day: date, hhmm: str | None, timezone: str) -> datetime:
    local_tz = ZoneInfo(timezone)
    local_dt = datetime.combine(day, parse_hhmm(hhmm), tzinfo=local_tz)
    return local_dt.astimezone(UTC)


def next_daily_reminder(now_utc: datetime, timezone: str, hhmm: str | None) -> datetime:
    local_tz = ZoneInfo(timezone)
    local_now = now_utc.astimezone(local_tz)
    candidate = combine_local_to_utc(local_now.date(), hhmm, timezone)
    if candidate <= now_utc:
        candidate = combine_local_to_utc(local_now.date() + timedelta(days=1), hhmm, timezone)
    return candidate


def _next_month_date(base_date: date) -> date:
    year = base_date.year
    month = base_date.month + 1
    if month > 12:
        month = 1
        year += 1
    day = min(base_date.day, monthrange(year, month)[1])
    return date(year, month, day)


def _weekday_from_rrule(rule: str) -> int | None:
    marker = "BYDAY="
    if marker not in rule:
        return None
    value = rule.split(marker, maxsplit=1)[1].split(";", maxsplit=1)[0].strip().upper()
    mapping = {"MO": 0, "TU": 1, "WE": 2, "TH": 3, "FR": 4, "SA": 5, "SU": 6}
    return mapping.get(value)


def next_recurrence_reminder(
    now_utc: datetime,
    timezone: str,
    recurrence_rule: str | None,
    hhmm: str | None,
) -> datetime | None:
    if not recurrence_rule:
        return None
    local_tz = ZoneInfo(timezone)
    local_now = now_utc.astimezone(local_tz)
    rule = recurrence_rule.upper()

    if "FREQ=DAILY" in rule:
        return next_daily_reminder(now_utc, timezone, hhmm)

    if "FREQ=WEEKLY" in rule:
        target_weekday = _weekday_from_rrule(rule)
        if target_weekday is None:
            target_weekday = local_now.weekday()
        days_ahead = (target_weekday - local_now.weekday()) % 7
        candidate_date = local_now.date() + timedelta(days=days_ahead)
        candidate = combine_local_to_utc(candidate_date, hhmm, timezone)
        if candidate <= now_utc:
            candidate = combine_local_to_utc(candidate_date + timedelta(days=7), hhmm, timezone)
        return candidate

    if "FREQ=MONTHLY" in rule:
        candidate = combine_local_to_utc(local_now.date(), hhmm, timezone)
        if candidate <= now_utc:
            candidate = combine_local_to_utc(_next_month_date(local_now.date()), hhmm, timezone)
        return candidate

    return None


def next_strategy_reminder(
    now_utc: datetime,
    timezone: str,
    mode: ReminderMode,
    hhmm: str | None,
    interval_hours: int | None,
    deadline_at: datetime | None = None,
) -> datetime | None:
    candidate: datetime | None
    if mode == ReminderMode.none:
        return None
    if mode == ReminderMode.daily_at_time:
        candidate = next_daily_reminder(now_utc, timezone, hhmm)
    elif mode == ReminderMode.every_n_hours:
        step = interval_hours if interval_hours and interval_hours > 0 else 4
        candidate = now_utc + timedelta(hours=step)
    else:
        candidate = None
    if candidate and deadline_at and candidate > deadline_at:
        return None
    return candidate


def assign_next_reminder_after_send(task: Task, timezone: str) -> None:
    now = datetime.now(UTC)
    if task.type == TaskType.recurring:
        task.remind_at = next_recurrence_reminder(now, timezone, task.recurrence_rule, task.reminder_time_local)
        return
    if task.type in {TaskType.deadline, TaskType.waiting}:
        task.remind_at = next_strategy_reminder(
            now_utc=now,
            timezone=timezone,
            mode=task.reminder_mode,
            hhmm=task.reminder_time_local,
            interval_hours=task.reminder_interval_hours,
            deadline_at=task.deadline_at,
        )
        return
    task.remind_at = None
