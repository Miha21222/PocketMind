from fastapi import APIRouter, Header, HTTPException, Request, status

from app.bot.dispatcher import create_bot, create_dispatcher
from app.core.config import get_settings
from app.services.reminder_runner import process_due_tasks_once

router = APIRouter(prefix="/internal", tags=["internal"])


@router.post("/telegram/webhook/{secret}")
async def telegram_webhook(
    secret: str,
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
) -> dict[str, bool]:
    settings = get_settings()
    if not settings.telegram_webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telegram webhook is not configured",
        )
    if secret != settings.telegram_webhook_secret:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if x_telegram_bot_api_secret_token != settings.telegram_webhook_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized webhook request")

    payload = await request.json()
    bot = create_bot()
    dp = create_dispatcher()
    try:
        await dp.feed_raw_update(bot, payload)
    finally:
        await bot.session.close()
    return {"ok": True}


@router.get("/cron/reminders")
async def cron_process_reminders(authorization: str | None = Header(default=None)) -> dict[str, int | bool]:
    settings = get_settings()
    if not settings.cron_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="CRON_SECRET is not configured",
        )
    if authorization != f"Bearer {settings.cron_secret}":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    bot = create_bot()
    try:
        stats = await process_due_tasks_once(bot)
    finally:
        await bot.session.close()
    return {"ok": True, **stats}
