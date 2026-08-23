from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import create_access_token
from app.db.session import get_db
from app.services.telegram_auth_service import (  # type: ignore[reportMissingImports]
    TelegramIdentityError,
    validate_and_upsert_telegram_user,
)
from app.web.dependencies import (  # type: ignore[reportMissingImports]
    safe_next_path,
    templates,
)

router = APIRouter(tags=["web-auth"])


@router.get("/launch", response_class=HTMLResponse)
async def telegram_launch(request: Request, next: str = "/") -> HTMLResponse:
    return templates.TemplateResponse(
        request, "telegram_gate.html", {"next_path": safe_next_path(next)}
    )


@router.get("/telegram-gate", response_class=HTMLResponse, include_in_schema=False)
async def telegram_gate(request: Request) -> HTMLResponse:
    return await telegram_launch(request)


@router.post("/web-auth/telegram")
async def telegram_cookie_auth(
    request: Request, db: AsyncSession = Depends(get_db)
) -> JSONResponse:
    payload = await request.json()
    try:
        user = await validate_and_upsert_telegram_user(
            db, str(payload.get("init_data", ""))
        )
    except TelegramIdentityError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc
    await db.commit()
    response = JSONResponse({"ok": True})
    response.set_cookie(
        "pocketmind_session",
        create_access_token(subject=str(user.id)),
        httponly=True,
        secure=get_settings().is_production,
        samesite="lax",
        max_age=60 * 60 * 24 * 7,
        path="/",
    )
    return response
