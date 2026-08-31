from aiogram import Bot, Dispatcher

from app.bot.handlers import callbacks, help as help_handler, start, voice
from app.core.config import get_settings


def create_bot() -> Bot:
    settings = get_settings()
    if not settings.bot_token:
        raise RuntimeError("BOT_TOKEN is not configured")
    return Bot(token=settings.bot_token)


def _build_dispatcher() -> Dispatcher:
    dp = Dispatcher()
    dp.include_router(start.router)
    dp.include_router(help_handler.router)
    dp.include_router(callbacks.router)
    dp.include_router(voice.router)
    return dp


_DISPATCHER = _build_dispatcher()


def create_dispatcher() -> Dispatcher:
    return _DISPATCHER
