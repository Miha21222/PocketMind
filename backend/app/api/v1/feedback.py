from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import DATA_DIR
from app.db.session import get_db
from app.models.feedback import Feedback
from app.models.user import User
from app.schemas.feedback import FeedbackCreate
from app.services.feedback_service import notify_feedback

router = APIRouter(prefix="/feedback", tags=["feedback"])

MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024  # 8 MB
SCREENSHOT_DIR = DATA_DIR / "feedback_screenshots"


@router.post("")
async def create_feedback(
    kind: str = Form(...),
    rating: int | None = Form(None),
    message: str | None = Form(None),
    screenshot: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, int]:
    try:
        payload = FeedbackCreate(kind=kind, rating=rating, message=message)
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from exc

    image_bytes: bytes | None = None
    if screenshot is not None:
        if not (screenshot.content_type or "").startswith("image/"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be an image")
        image_bytes = await screenshot.read()
        if not image_bytes:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")
        if len(image_bytes) > MAX_SCREENSHOT_BYTES:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image too large")

    record = Feedback(
        user_id=current_user.id,
        kind=payload.kind,
        rating=payload.rating,
        message=payload.message,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    if image_bytes is not None:
        SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
        extension = Path(screenshot.filename or "").suffix or ".jpg"
        saved_path = SCREENSHOT_DIR / f"{record.id}{extension}"
        saved_path.write_bytes(image_bytes)
        record.screenshot_path = str(saved_path)
        await db.commit()

    await notify_feedback(record, current_user, image_bytes, screenshot.filename if screenshot else None)

    return {"id": record.id}
