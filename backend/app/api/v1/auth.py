from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.db.session import get_db
from app.schemas.auth import AuthResponse, TelegramAuthRequest
from app.schemas.user import UserOut
from app.services.telegram_auth_service import (  # type: ignore[reportMissingImports]
    TelegramIdentityError,
    validate_and_upsert_telegram_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/telegram", response_model=AuthResponse)
async def auth_telegram(
    payload: TelegramAuthRequest, db: AsyncSession = Depends(get_db)
) -> AuthResponse:
    try:
        user = await validate_and_upsert_telegram_user(db, payload.init_data)
    except TelegramIdentityError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc
    await db.commit()
    await db.refresh(user)

    token = create_access_token(subject=str(user.id))
    return AuthResponse(access_token=token, user=UserOut.model_validate(user))
