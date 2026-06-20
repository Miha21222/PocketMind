from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.concurrency import run_in_threadpool

from app.api.deps import get_current_user
from app.models.user import User
from app.services.transcription_service import transcribe_audio

router = APIRouter(prefix="/voice", tags=["voice"])

MAX_AUDIO_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    audio = await file.read()
    if not audio:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty audio")
    if len(audio) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Audio too large")

    text = await run_in_threadpool(transcribe_audio, audio, language)
    return {"text": text}
