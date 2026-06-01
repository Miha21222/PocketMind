import asyncio
import logging

from app.bot.dispatcher import create_bot, create_dispatcher

logger = logging.getLogger(__name__)


async def run_bot() -> None:
    logging.basicConfig(level=logging.INFO)
    bot = create_bot()
    dp = create_dispatcher()
    await bot.delete_webhook(drop_pending_updates=False)
    logger.info("PocketMind bot polling started")
    try:
        await dp.start_polling(bot)
    finally:
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(run_bot())
