from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    telegram_id: int
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    language_code: str | None = None
    created_at: datetime
    updated_at: datetime
    last_seen_at: datetime
