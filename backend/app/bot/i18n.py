from app.models.user import User
from app.services.user_settings_service import normalize_language

BOT_I18N: dict[str, dict[str, str]] = {
    "en": {
        "start_text": "Hi! I help you keep tasks organized and remind you on time.",
        "help_text": "PocketMind reminders arrive in this chat. Use reminder buttons to snooze a task or open it in the app.",
        "open_app": "Open Mini App",
        "mini_app_disabled": "Mini App button is disabled: MINI_APP_URL must be HTTPS.\nCurrent MINI_APP_URL: {url}",
        "mini_app_disabled_app": "Mini App button is disabled because MINI_APP_URL is not HTTPS.\nCurrent MINI_APP_URL: {url}\nUse an HTTPS URL (for example, your VPS domain or an HTTPS tunnel).",
        "open_manager": "Open your task manager:",
        "reminder_header": "⏰ PocketMind reminder",
        "waiting_hint": "Still waiting for a reply? 👉 Choose an action below:",
        "reminder_hint": "👉 Choose an action below:",
        "followup_time": "Follow-up time",
        "deadline": "Deadline",
        "waiting_snooze": "🔴 Remind later",
        "recurring_snooze": "🔴 Later",
        "snooze": "🔴 Snooze {minutes} min",
        "open": "🔵 Open",
        "cb_invalid_action": "Invalid action",
        "cb_invalid_task_id": "Invalid task id",
        "cb_unknown_user": "Unknown user",
        "cb_user_not_found": "User not found",
        "cb_task_not_found": "Task not found",
        "cb_task_closed": "Task already closed",
        "cb_already_handled": "This reminder is already handled",
        "cb_snoozed": "Reminder moved by {minutes} minutes",
        "cb_unknown_action": "Unknown action",
    },
    "ru": {
        "start_text": "Привет! Я помогаю держать задачи под контролем и вовремя напоминаю о них.",
        "help_text": "Напоминания PocketMind приходят в этот чат. Используйте кнопки в напоминании, чтобы отложить задачу или открыть её в приложении.",
        "open_app": "Открыть Mini App",
        "mini_app_disabled": "Кнопка Mini App отключена: MINI_APP_URL должен быть HTTPS.\nТекущий MINI_APP_URL: {url}",
        "mini_app_disabled_app": "Кнопка Mini App отключена, потому что MINI_APP_URL не HTTPS.\nТекущий MINI_APP_URL: {url}\nИспользуйте HTTPS URL (например, домен на VPS или HTTPS-туннель).",
        "open_manager": "Откройте менеджер задач:",
        "reminder_header": "⏰ Напоминание PocketMind",
        "waiting_hint": "Всё ещё ждёте ответ? 👉 Выберите действие ниже:",
        "reminder_hint": "👉 Выберите действие ниже:",
        "followup_time": "Время фоллоу-апа",
        "deadline": "Дедлайн",
        "waiting_snooze": "🔴 Напомнить позже",
        "recurring_snooze": "🔴 Позже",
        "snooze": "🔴 Отложить на {minutes} мин",
        "open": "🔵 Открыть",
        "cb_invalid_action": "Некорректное действие",
        "cb_invalid_task_id": "Некорректный id задачи",
        "cb_unknown_user": "Неизвестный пользователь",
        "cb_user_not_found": "Пользователь не найден",
        "cb_task_not_found": "Задача не найдена",
        "cb_task_closed": "Задача уже закрыта",
        "cb_already_handled": "Это напоминание уже обработано",
        "cb_snoozed": "Напоминание перенесено на {minutes} мин",
        "cb_unknown_action": "Неизвестное действие",
    },
    "uk": {
        "start_text": "Привіт! Я допомагаю тримати завдання під контролем і вчасно нагадую про них.",
        "help_text": "Нагадування PocketMind приходять у цей чат. Використовуйте кнопки в нагадуванні, щоб відкласти завдання або відкрити його в застосунку.",
        "open_app": "Відкрити Mini App",
        "mini_app_disabled": "Кнопку Mini App вимкнено: MINI_APP_URL має бути HTTPS.\nПоточний MINI_APP_URL: {url}",
        "mini_app_disabled_app": "Кнопку Mini App вимкнено, бо MINI_APP_URL не HTTPS.\nПоточний MINI_APP_URL: {url}\nВикористайте HTTPS URL (наприклад, домен на VPS або HTTPS-тунель).",
        "open_manager": "Відкрийте менеджер завдань:",
        "reminder_header": "⏰ Нагадування PocketMind",
        "waiting_hint": "Усе ще чекаєте на відповідь? 👉 Оберіть дію нижче:",
        "reminder_hint": "👉 Оберіть дію нижче:",
        "followup_time": "Час фолоу-апу",
        "deadline": "Дедлайн",
        "waiting_snooze": "🔴 Нагадати пізніше",
        "recurring_snooze": "🔴 Пізніше",
        "snooze": "🔴 Відкласти на {minutes} хв",
        "open": "🔵 Відкрити",
        "cb_invalid_action": "Некоректна дія",
        "cb_invalid_task_id": "Некоректний id завдання",
        "cb_unknown_user": "Невідомий користувач",
        "cb_user_not_found": "Користувача не знайдено",
        "cb_task_not_found": "Завдання не знайдено",
        "cb_task_closed": "Завдання вже закрито",
        "cb_already_handled": "Це нагадування вже оброблено",
        "cb_snoozed": "Нагадування перенесено на {minutes} хв",
        "cb_unknown_action": "Невідома дія",
    },
}


def resolve_user_language(user: User | None, telegram_language_code: str | None = None) -> str:
    # Per-task language snapshots drive reminder text; this only covers messages
    # with no task in scope (e.g. /start, /help), so Telegram's locale is enough.
    fallback = telegram_language_code or (user.language_code if user else None)
    return normalize_language(fallback)


def t(lang: str, key: str, **kwargs) -> str:
    table = BOT_I18N.get(lang, BOT_I18N["en"])
    template = table.get(key, BOT_I18N["en"].get(key, key))
    return template.format(**kwargs)
