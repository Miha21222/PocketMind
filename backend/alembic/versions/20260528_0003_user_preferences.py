"""add user preference fields

Revision ID: 20260528_0003
Revises: 20260528_0002
Create Date: 2026-05-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260528_0003"
down_revision: str | None = "20260528_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("preferred_language", sa.String(length=8), nullable=True))
    op.add_column("users", sa.Column("preferred_timezone", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("default_snooze_minutes", sa.Integer(), nullable=False, server_default="15"))


def downgrade() -> None:
    op.drop_column("users", "default_snooze_minutes")
    op.drop_column("users", "preferred_timezone")
    op.drop_column("users", "preferred_language")
