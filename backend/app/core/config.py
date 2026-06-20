from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"


class Settings(BaseSettings):
    bot_token: str = ""
    database_url: str = f"sqlite+aiosqlite:///{(DATA_DIR / 'pocketmind.db').as_posix()}"
    mini_app_url: str = "http://localhost:5173"
    jwt_secret: str = "change-me"
    jwt_expire_minutes: int = 60 * 24 * 7
    environment: str = "local"
    default_timezone: str = "Europe/Kyiv"
    scheduler_poll_interval_seconds: int = 60

    # Self-hosted speech-to-text (faster-whisper). The model is baked into the
    # image at build time; "small" gives better Russian accuracy than "base"
    # at the cost of more CPU/RAM. compute_type "int8" is fast on CPU.
    whisper_model: str = "base"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    whisper_download_root: str = "/app/models"
    whisper_language: str = ""

    model_config = SettingsConfigDict(
        env_file=(BASE_DIR.parent / ".env", BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.database_url.startswith("sqlite+aiosqlite"):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
    return settings
