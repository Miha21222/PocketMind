"""add chat_id and message_id to reminder_logs

Revision ID: 20260528_0002
Revises: 20260527_0001
Create Date: 2026-05-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260528_0002"
down_revision: str | None = "20260527_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("reminder_logs", sa.Column("chat_id", sa.BigInteger(), nullable=True))
    op.add_column("reminder_logs", sa.Column("message_id", sa.BigInteger(), nullable=True))


def downgrade() -> None:
    op.drop_column("reminder_logs", "message_id")
    op.drop_column("reminder_logs", "chat_id")
