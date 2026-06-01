from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from sqlalchemy import select

from app.bot.i18n import resolve_user_language, t
from app.db.session import SessionLocal
from app.models.user import User

router = Router()


@router.message(Command("help"))
async def cmd_help(message: Message) -> None:
    db_user = None
    if message.from_user:
        async with SessionLocal() as db:
            db_user = await db.scalar(select(User).where(User.telegram_id == message.from_user.id))
    lang = resolve_user_language(db_user, message.from_user.language_code if message.from_user else None)
    await message.answer(t(lang, "help_text"))
