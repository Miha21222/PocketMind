import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.bot.dispatcher import create_bot
from app.core.config import get_settings
from app.services.reminder_runner import process_due_tasks_once

logger = logging.getLogger(__name__)


async def run_scheduler() -> None:
    settings = get_settings()

    logging.basicConfig(level=logging.INFO)
    bot = create_bot()
    logger.info("PocketMind scheduler started, poll=%ss", settings.scheduler_poll_interval_seconds)

    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        process_due_tasks_once,
        "interval",
        seconds=settings.scheduler_poll_interval_seconds,
        kwargs={"bot": bot},
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()

    # Run one immediate cycle at startup so first reminders are not delayed by interval.
    await process_due_tasks_once(bot)
    await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(run_scheduler())
