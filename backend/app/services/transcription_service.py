import logging
import tempfile
from functools import lru_cache
from typing import TYPE_CHECKING

from app.core.config import get_settings

if TYPE_CHECKING:
    from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)

MAX_AUDIO_BYTES = 10 * 1024 * 1024  # 10 MB


@lru_cache(maxsize=1)
def _get_model() -> "WhisperModel":
    """Load the Whisper model once and reuse it across requests.

    The model is baked into the image under ``whisper_download_root`` at build
    time, so this loads from local files without a network call. The heavy
    ``faster_whisper`` import is deferred to here so the API/bot/scheduler
    processes (which never transcribe) don't require the package at import time.
    """
    from faster_whisper import WhisperModel

    settings = get_settings()
    logger.info(
        "Loading Whisper model '%s' (device=%s, compute=%s)",
        settings.whisper_model,
        settings.whisper_device,
        settings.whisper_compute_type,
    )
    return WhisperModel(
        settings.whisper_model,
        device=settings.whisper_device,
        compute_type=settings.whisper_compute_type,
        download_root=settings.whisper_download_root or None,
    )


def transcribe_audio(audio_bytes: bytes, language: str | None = None) -> str:
    """Transcribe raw audio bytes (any ffmpeg-decodable format) to text.

    CPU-bound and blocking — call from a worker thread, not the event loop.
    """
    settings = get_settings()
    model = _get_model()
    resolved_language = language or settings.whisper_language or None

    with tempfile.NamedTemporaryFile(suffix=".audio") as tmp:
        tmp.write(audio_bytes)
        tmp.flush()
        segments, _info = model.transcribe(tmp.name, language=resolved_language)
        return " ".join(segment.text.strip() for segment in segments).strip()
