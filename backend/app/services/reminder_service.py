import logging
from datetime import UTC, datetime

from aiogram import Bot
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.bot.i18n import resolve_user_language, t
from app.bot.keyboards import reminder_keyboard
from app.models.reminder_log import ReminderLog, ReminderStatus
from app.models.task import Task, TaskStatus, TaskType
from app.models.user import User
from app.services.reminder_log_service import reconcile_pending_reminder_log
from app.services.reminder_planning_service import assign_next_reminder_after_send
from app.services.task_sync_service import ensure_utc_datetime, normalize_task_overdue_state
from app.services.user_settings_service import normalize_language, normalize_timezone


logger = logging.getLogger(__name__)

_DESCRIPTION_DISPLAY_LIMIT = 300


def _format_dt(value: datetime | None) -> str:
    if value is None:
        return "not set"
    return value.strftime("%d %b %Y, %H:%M UTC")


def _format_description(task: Task) -> str | None:
    if not task.description or not task.description.strip():
        return None
    stripped = task.description.strip()
    if len(stripped) <= _DESCRIPTION_DISPLAY_LIMIT:
        return stripped
    return stripped[: _DESCRIPTION_DISPLAY_LIMIT - 1].rstrip() + "…"


def build_reminder_text(task: Task, lang: str) -> str:
    reminder_at = _format_dt(task.remind_at or task.snoozed_until)
    deadline_at = _format_dt(task.deadline_at)
    description = _format_description(task)

    if task.type == TaskType.waiting:
        lines = [t(lang, "reminder_header"), "", f"📝 {task.title}"]
        if description:
            lines.append(f"🗒️ {description}")
        lines.append(f"🔔 {t(lang, 'followup_time')}: {reminder_at}")
        lines.extend(["", t(lang, "waiting_hint")])
        return "\n".join(lines)

    lines = [t(lang, "reminder_header"), "", f"📝 {task.title}"]
    if description:
        lines.append(f"🗒️ {description}")
    if task.deadline_at:
        lines.append(f"📅 {t(lang, 'deadline')}: {deadline_at}")
    lines.extend(["", t(lang, "reminder_hint")])
    return "\n".join(lines)


async def send_task_reminder(db: AsyncSession, bot: Bot, task: Task, user: User) -> None:
    # The task's own snapshot drives language/snooze/timezone; fall back to the
    # Telegram-derived language only if the task carries none.
    now = datetime.now(UTC)
    normalize_task_overdue_state(task, now)
    remind_at = ensure_utc_datetime(task.remind_at)
    if task.status not in {TaskStatus.active, TaskStatus.snoozed} or remind_at is None or remind_at > now:
        return
    lang = normalize_language(task.reminder_language) if task.reminder_language else resolve_user_language(user)
    snooze_minutes = task.snooze_minutes if task.snooze_minutes else 15

    log_entry = await db.scalar(
        select(ReminderLog)
        .where(ReminderLog.task_id == task.id, ReminderLog.status == ReminderStatus.pending)
        .order_by(ReminderLog.id.desc())
    )
    if log_entry is None:
        # No pending row was pre-scheduled for this reminder (legacy task predating this
        # flow, or a reconcile call site was missed) — self-heal by logging one now.
        logger.warning("No pending ReminderLog found for task=%s; creating one ad hoc", task.id)
        log_entry = ReminderLog(
            task_id=task.id,
            user_id=user.id,
            scheduled_for=task.remind_at or now,
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
                open_task_id=task.client_task_id,
                waiting=task.type == TaskType.waiting,
                recurring=task.type == TaskType.recurring,
                lang=lang,
                default_snooze_minutes=snooze_minutes,
            ),
        )
    except Exception as exc:  # noqa: BLE001
        log_entry.status = ReminderStatus.failed
        log_entry.error_message = str(exc)
        raise

    # Phase A: the message is now irreversibly delivered. Record that durable fact, alone,
    # and commit immediately — nothing here may depend on a later step succeeding.
    log_entry.status = ReminderStatus.sent
    log_entry.chat_id = sent_message.chat.id
    log_entry.message_id = sent_message.message_id
    log_entry.sent_at = now
    task.last_reminded_at = now
    # Clearing remind_at here (rather than only via assign_next_reminder_after_send in Phase
    # B) guarantees get_due_tasks won't re-pick this task up even if Phase B fails outright.
    task.remind_at = None
    await db.commit()

    # Phase B: best-effort scheduling of the next reminder. A failure here must never be able
    # to resurrect Phase A, so it is isolated in its own transaction and swallowed on error.
    try:
        timezone = normalize_timezone(task.reminder_timezone)
        assign_next_reminder_after_send(task, timezone)
        normalize_task_overdue_state(task, now)
        await reconcile_pending_reminder_log(db, task)
        await db.commit()
    except Exception:  # noqa: BLE001
        await db.rollback()
        logger.exception("Failed to schedule next reminder for task=%s after send", task.id)
