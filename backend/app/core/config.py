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
    cors_allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    default_timezone: str = "Europe/Kyiv"
    scheduler_poll_interval_seconds: int = 60

    # Feedback/bug-report submissions are relayed to topics within this forum
    # supergroup rather than DMed to an individual admin.
    feedback_chat_id: int = -1004421534137
    feedback_topic_id: int = 3
    bug_report_topic_id: int = 5

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

    @property
    def cors_allowed_origins_list(self) -> list[str]:
        return [
            origin.strip().rstrip("/")
            for origin in self.cors_allowed_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.database_url.startswith("sqlite+aiosqlite"):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
    return settings
