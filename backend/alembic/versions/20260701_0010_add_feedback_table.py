"""add feedback table

Revision ID: 20260701_0010
Revises: 20260630_0009
Create Date: 2026-07-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260701_0010"
down_revision: str | None = "20260630_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "feedback",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.Enum("rating", "bug", name="feedbackkind"), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_feedback_user_id"), "feedback", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_feedback_user_id"), table_name="feedback")
    op.drop_table("feedback")
    sa.Enum(name="feedbackkind").drop(op.get_bind(), checkfirst=True)
