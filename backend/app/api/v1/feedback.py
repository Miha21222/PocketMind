from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import DATA_DIR
from app.db.session import get_db
from app.models.feedback import Feedback
from app.models.user import User
from app.schemas.feedback import FeedbackCreate
from app.services.feedback_service import notify_feedback, notify_feedback_screenshot

router = APIRouter(prefix="/feedback", tags=["feedback"])

MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024  # 8 MB
SCREENSHOT_DIR = DATA_DIR / "feedback_screenshots"


@router.post("")
async def create_feedback(
    payload: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, int]:
    record = Feedback(
        user_id=current_user.id,
        kind=payload.kind,
        rating=payload.rating,
        message=payload.message,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    await notify_feedback(record, current_user)

    return {"id": record.id}


@router.post("/{feedback_id}/screenshot")
async def upload_feedback_screenshot(
    feedback_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, bool]:
    record = await db.scalar(
        select(Feedback).where(Feedback.id == feedback_id, Feedback.user_id == current_user.id)
    )
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")

    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be an image")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")
    if len(image_bytes) > MAX_SCREENSHOT_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image too large")

    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    extension = Path(file.filename or "").suffix or ".jpg"
    screenshot_path = SCREENSHOT_DIR / f"{record.id}{extension}"
    screenshot_path.write_bytes(image_bytes)

    record.screenshot_path = str(screenshot_path)
    await db.commit()

    await notify_feedback_screenshot(record, image_bytes, file.filename or f"screenshot{extension}")

    return {"ok": True}
