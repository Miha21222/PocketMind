"""add task sync fields for local-first frontend

Revision ID: 20260615_0005
Revises: 20260601_0004
Create Date: 2026-06-15
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260615_0005"
down_revision: str | None = "20260601_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Additive operations work directly on SQLite. Keep the table rebuild limited
    # to the unique constraint: batching all operations together causes Alembic's
    # SQLite column-order resolver to find a circular dependency.
    op.add_column(
        "tasks", sa.Column("client_task_id", sa.String(length=64), nullable=True)
    )
    op.add_column(
        "tasks", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index(
        "ix_tasks_client_task_id", "tasks", ["client_task_id"], unique=False
    )
    with op.batch_alter_table("tasks", schema=None) as batch_op:
        batch_op.create_unique_constraint(
            "uq_tasks_user_client_task_id", ["user_id", "client_task_id"]
        )


def downgrade() -> None:
    with op.batch_alter_table("tasks", schema=None) as batch_op:
        batch_op.drop_constraint("uq_tasks_user_client_task_id", type_="unique")
    op.drop_index("ix_tasks_client_task_id", table_name="tasks")
    op.drop_column("tasks", "deleted_at")
    op.drop_column("tasks", "client_task_id")
