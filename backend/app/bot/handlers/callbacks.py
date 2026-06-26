from aiogram import F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.types import CallbackQuery
from sqlalchemy import select

from app.bot.i18n import resolve_user_language, t
from app.db.session import SessionLocal
from app.models.reminder_log import ReminderLog, ReminderStatus
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.services.reminder_cleanup_service import cleanup_task_reminder_messages
from app.services.task_actions import complete_task, snooze_task
from app.services.user_settings_service import normalize_language, normalize_timezone

router = Router()


async def _drop_reminder_keyboard(callback: CallbackQuery) -> None:
    if not callback.message:
        return
    try:
        await callback.message.edit_reply_markup(reply_markup=None)
    except TelegramBadRequest:
        return


async def _cleanup_reminder_message(callback: CallbackQuery) -> None:
    if not callback.message:
        return
    try:
        await callback.message.delete()
    except TelegramBadRequest:
        await _drop_reminder_keyboard(callback)


@router.callback_query(F.data.startswith("task:"))
async def on_task_action(callback: CallbackQuery) -> None:
    parts = (callback.data or "").split(":")
    if len(parts) != 3:
        await callback.answer(t("en", "cb_invalid_action"), show_alert=True)
        return
    _, task_id_raw, action = parts
    try:
        task_id = int(task_id_raw)
    except ValueError:
        await callback.answer(t("en", "cb_invalid_task_id"), show_alert=True)
        return

    actor_telegram_id = callback.from_user.id if callback.from_user else None
    if actor_telegram_id is None:
        await callback.answer(t("en", "cb_unknown_user"), show_alert=True)
        return

    async with SessionLocal() as db:
        actor = await db.scalar(select(User).where(User.telegram_id == actor_telegram_id))
        if actor is None:
            await callback.answer(t("en", "cb_user_not_found"), show_alert=True)
            return
        lang = resolve_user_language(actor, callback.from_user.language_code if callback.from_user else None)

        task = await db.scalar(select(Task).where(Task.id == task_id, Task.user_id == actor.id))
        if task is None:
            await callback.answer(t(lang, "cb_task_not_found"), show_alert=True)
            return

        # The task carries its own language snapshot; prefer it for replies.
        if task.reminder_language:
            lang = normalize_language(task.reminder_language)

        if task.status in {TaskStatus.done, TaskStatus.cancelled}:
            await callback.answer(t(lang, "cb_task_closed"), show_alert=True)
            await _cleanup_reminder_message(callback)
            return

        if not callback.message:
            await callback.answer(t(lang, "cb_already_handled"), show_alert=True)
            return

        reminder_log = await db.scalar(
            select(ReminderLog).where(
                ReminderLog.task_id == task.id,
                ReminderLog.user_id == actor.id,
                ReminderLog.chat_id == callback.message.chat.id,
                ReminderLog.message_id == callback.message.message_id,
            )
        )
        if reminder_log is None or reminder_log.status != ReminderStatus.sent:
            await callback.answer(t(lang, "cb_already_handled"), show_alert=True)
            await _cleanup_reminder_message(callback)
            return

        if action == "done":
            complete_task(task, timezone=normalize_timezone(task.reminder_timezone))
            notice = t(lang, "cb_marked_done")
        elif action.startswith("snooze"):
            try:
                minutes = int(action.removeprefix("snooze"))
            except ValueError:
                await callback.answer(t(lang, "cb_unknown_action"), show_alert=True)
                return
            snooze_task(task, minutes)
            notice = t(lang, "cb_snoozed", minutes=minutes)
        else:
            await callback.answer(t(lang, "cb_unknown_action"), show_alert=True)
            return

        await db.commit()
        await cleanup_task_reminder_messages(db, task.id, bot=callback.bot)
        await _cleanup_reminder_message(callback)
        await callback.answer(notice)
