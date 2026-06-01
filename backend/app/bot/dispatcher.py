from aiogram import Bot, Dispatcher

from app.bot.handlers import callbacks, help as help_handler, start
from app.core.config import get_settings


def create_bot() -> Bot:
    settings = get_settings()
    if not settings.bot_token:
        raise RuntimeError("BOT_TOKEN is not configured")
    return Bot(token=settings.bot_token)


def create_dispatcher() -> Dispatcher:
    dp = Dispatcher()
    dp.include_router(start.router)
    dp.include_router(help_handler.router)
    dp.include_router(callbacks.router)
    return dp
