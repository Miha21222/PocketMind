from urllib.parse import urlparse

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from app.bot.i18n import t
from app.core.config import get_settings


def is_valid_webapp_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
    except ValueError:
        return False
    return parsed.scheme == "https" and bool(parsed.netloc)


def mini_app_keyboard(lang: str = "en") -> InlineKeyboardMarkup | None:
    settings = get_settings()
    if not is_valid_webapp_url(settings.mini_app_url):
        return None
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=t(lang, "open_app"), web_app=WebAppInfo(url=settings.mini_app_url))]
        ]
    )


def reminder_keyboard(
    task_id: int,
    open_task_id: str | None = None,
    waiting: bool = False,
    recurring: bool = False,
    lang: str = "en",
    default_snooze_minutes: int = 15,
) -> InlineKeyboardMarkup:
    settings = get_settings()
    route_task_id = open_task_id or str(task_id)
    task_url = f"{settings.mini_app_url.rstrip('/')}/tasks/{route_task_id}"
    can_open_task = is_valid_webapp_url(task_url)
    snooze_minutes = max(5, min(default_snooze_minutes, 240))

    if waiting:
        rows = [
            [InlineKeyboardButton(text=t(lang, "waiting_done"), callback_data=f"task:{task_id}:done", style="success")],
            [InlineKeyboardButton(text=t(lang, "waiting_snooze"), callback_data=f"task:{task_id}:snooze{snooze_minutes}", style="danger")],
        ]
    elif recurring:
        rows = [
            [InlineKeyboardButton(text=t(lang, "recurring_done"), callback_data=f"task:{task_id}:done", style="success")],
            [InlineKeyboardButton(text=t(lang, "recurring_snooze"), callback_data=f"task:{task_id}:snooze{snooze_minutes}", style="danger")],
        ]
    else:
        rows = [
            [InlineKeyboardButton(text=t(lang, "done"), callback_data=f"task:{task_id}:done", style="success")],
            [InlineKeyboardButton(text=t(lang, "snooze", minutes=snooze_minutes), callback_data=f"task:{task_id}:snooze{snooze_minutes}", style="danger")],
        ]

    if can_open_task:
        rows.append([InlineKeyboardButton(text=t(lang, "open"), web_app=WebAppInfo(url=task_url), style="primary")])

    return InlineKeyboardMarkup(inline_keyboard=rows)
