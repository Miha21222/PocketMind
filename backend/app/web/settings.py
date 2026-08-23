"""Preference pages and mutations."""

from typing import Annotated

from fastapi import APIRouter, Depends, Form, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.services.task_application_service import (
    PreferenceUpdateCommand,
    get_preferences,
    update_preferences,
)
from app.web.dependencies import (  # type: ignore[reportMissingImports]
    check_csrf,
    get_web_current_user,
    redirect,
    render,
)

router = APIRouter()


@router.get("/settings")
async def settings_page(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_web_current_user),
):
    return render(
        request,
        "settings.html",
        user,
        preferences=await get_preferences(db, user),
        message=request.query_params.get("message"),
    )


@router.post("/settings")
async def settings_save(
    request: Request,
    csrf: Annotated[str, Form()],
    language: Annotated[str, Form()],
    timezone: Annotated[str, Form()],
    snooze_minutes: Annotated[int, Form()] = 15,
    quick_delay_minutes: Annotated[int, Form()] = 10,
    haptics_enabled: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_web_current_user),
):
    check_csrf(request, csrf)
    await update_preferences(
        db,
        user,
        PreferenceUpdateCommand(
            language=language,
            timezone=timezone,
            snooze_minutes=snooze_minutes,
            quick_delay_minutes=quick_delay_minutes,
            haptics_enabled=haptics_enabled is not None,
        ),
    )
    await db.commit()
    return redirect("/settings", "Settings saved")
