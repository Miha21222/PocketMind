import enum
from datetime import UTC, datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FeedbackKind(str, enum.Enum):
    rating = "rating"
    bug = "bug"


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[FeedbackKind] = mapped_column(Enum(FeedbackKind), nullable=False)
    rating: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    message: Mapped[str | None] = mapped_column(Text(), nullable=True)
    screenshot_path: Mapped[str | None] = mapped_column(String(length=512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
