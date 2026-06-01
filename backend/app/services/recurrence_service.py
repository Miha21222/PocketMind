from datetime import timedelta


def next_reminder_delta_from_rule(rule: str) -> timedelta | None:
    if rule == "RRULE:FREQ=DAILY":
        return timedelta(days=1)
    if rule.startswith("RRULE:FREQ=WEEKLY"):
        return timedelta(days=7)
    if rule == "RRULE:FREQ=MONTHLY":
        return timedelta(days=30)
    return None

