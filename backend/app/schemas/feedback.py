from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.models.feedback import FeedbackKind


class FeedbackCreate(BaseModel):
    kind: Literal["rating", "bug"]
    rating: int | None = Field(default=None, ge=1, le=5)
    message: str | None = Field(default=None, max_length=5000)

    @model_validator(mode="after")
    def check_kind_requirements(self) -> "FeedbackCreate":
        if self.kind == FeedbackKind.rating and self.rating is None:
            raise ValueError("rating is required when kind is 'rating'")
        if self.kind == FeedbackKind.bug and not (self.message and self.message.strip()):
            raise ValueError("message is required when kind is 'bug'")
        return self
