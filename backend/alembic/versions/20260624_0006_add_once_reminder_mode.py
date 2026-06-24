"""add one-time reminder mode

Revision ID: 20260624_0006
Revises: 20260615_0005
Create Date: 2026-06-24
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260624_0006"
down_revision: str | None = "20260615_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE remindermode ADD VALUE IF NOT EXISTS 'once_at_time'")


def downgrade() -> None:
    # PostgreSQL enum values cannot be removed without rebuilding the enum and
    # rewriting dependent columns; keep downgrade as a no-op to avoid data loss.
    pass
