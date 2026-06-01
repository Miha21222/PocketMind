from datetime import UTC, datetime

from aiogram import Bot
from sqlalchemy.ext.asyncio import AsyncSession

from app.bot.i18n import resolve_user_language, t
from app.bot.keyboards import reminder_keyboard
from app.models.reminder_log import ReminderLog, ReminderStatus
from app.models.task import Task, TaskStatus, TaskType
from app.models.user import User
from app.services.reminder_planning_service import assign_next_reminder_after_send
from app.services.user_settings_service import normalize_timezone


def _format_dt(value: datetime | None) -> str:
    if value is None:
        return "not set"
    return value.strftime("%d %b %Y, %H:%M UTC")


def build_reminder_text(task: Task, lang: str) -> str:
    task_type_label = task.type.value.replace("_", " ").title()
    reminder_at = _format_dt(task.remind_at or task.snoozed_until)
    deadline_at = _format_dt(task.deadline_at)

    if task.type == TaskType.waiting:
        return (
            f"{t(lang, 'reminder_header')}\n\n"
            f"📝 {t(lang, 'task')}: {task.title}\n"
            f"🏷️ {t(lang, 'type')}: {task_type_label}\n"
            f"🔔 {t(lang, 'followup_time')}: {reminder_at}\n\n"
            f"{t(lang, 'waiting_hint')}"
        )

    lines = [
        t(lang, "reminder_header"),
        "",
        f"📝 {t(lang, 'task')}: {task.title}",
        f"🏷️ {t(lang, 'type')}: {task_type_label}",
    ]
    if task.deadline_at:
        lines.append(f"📅 {t(lang, 'deadline')}: {deadline_at}")
    if task.remind_at or task.snoozed_until:
        lines.append(f"🔔 {t(lang, 'reminder_time')}: {reminder_at}")
    lines.extend(["", t(lang, "reminder_hint")])
    return "\n".join(lines)


async def send_task_reminder(db: AsyncSession, bot: Bot, task: Task, user: User) -> None:
    lang = resolve_user_language(user)
    snooze_minutes = user.default_snooze_minutes if user.default_snooze_minutes else 15
    log_entry = ReminderLog(
        task_id=task.id,
        user_id=user.id,
        scheduled_for=task.remind_at or datetime.now(UTC),
        status=ReminderStatus.pending,
    )
    db.add(log_entry)
    await db.flush()

    try:
        sent_message = await bot.send_message(
            chat_id=user.telegram_id,
            text=build_reminder_text(task, lang),
            reply_markup=reminder_keyboard(
                task.id,
                waiting=task.type == TaskType.waiting,
                recurring=task.type == TaskType.recurring,
                lang=lang,
                default_snooze_minutes=snooze_minutes,
            ),
        )
        log_entry.status = ReminderStatus.sent
        log_entry.chat_id = sent_message.chat.id
        log_entry.message_id = sent_message.message_id
        log_entry.sent_at = datetime.now(UTC)
        task.last_reminded_at = datetime.now(UTC)
        task.status = TaskStatus.reminded

        timezone = normalize_timezone(user.preferred_timezone)
        assign_next_reminder_after_send(task, timezone)
        if task.remind_at is not None:
            task.status = TaskStatus.planned
    except Exception as exc:  # noqa: BLE001
        log_entry.status = ReminderStatus.failed
        log_entry.error_message = str(exc)
        raise
