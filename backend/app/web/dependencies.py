"""Shared dependencies and presentation helpers for server-rendered routes."""

from pathlib import Path
from secrets import token_urlsafe

from fastapi import Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User

templates = Jinja2Templates(directory=str(Path(__file__).parent.parent / "templates"))


def csrf_token(request: Request) -> str:
    token = request.session.get("csrf")
    if not token:
        token = token_urlsafe(32)
        request.session["csrf"] = token
    return token


def check_csrf(request: Request, csrf: str) -> None:
    if not csrf or csrf != request.session.get("csrf"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token"
        )


def redirect(path: str, message: str | None = None) -> RedirectResponse:
    suffix = f"?message={message}" if message else ""
    return RedirectResponse(path + suffix, status_code=status.HTTP_303_SEE_OTHER)


def render(request: Request, name: str, user: User, **context: object) -> HTMLResponse:
    return templates.TemplateResponse(
        request, name, {"user": user, "csrf_token": csrf_token(request), **context}
    )


def safe_next_path(next_path: str) -> str:
    return (
        next_path
        if next_path.startswith("/") and not next_path.startswith("//")
        else "/"
    )


async def get_web_current_user(
    request: Request, db: AsyncSession = Depends(get_db)
) -> User:
    token = request.cookies.get("pocketmind_session")
    payload = decode_access_token(token) if token else None
    if payload is not None:
        try:
            user = await db.scalar(select(User).where(User.id == int(payload["sub"])))
        except (KeyError, TypeError, ValueError):
            user = None
        if user is not None:
            return user

    next_path = request.url.path
    if request.url.query:
        next_path = f"{next_path}?{request.url.query}"
    from urllib.parse import urlencode

    raise HTTPException(
        status_code=status.HTTP_303_SEE_OTHER,
        headers={
            "Location": f"/launch?{urlencode({'next': safe_next_path(next_path)})}"
        },
    )
