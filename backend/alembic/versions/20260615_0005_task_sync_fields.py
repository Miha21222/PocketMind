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
    # Batch mode so SQLite (which cannot ALTER to add constraints) applies these
    # via copy-and-move; on Postgres it emits plain ALTER statements.
    with op.batch_alter_table("tasks", schema=None) as batch_op:
        batch_op.add_column(sa.Column("client_task_id", sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.create_index("ix_tasks_client_task_id", ["client_task_id"], unique=False)
        batch_op.create_unique_constraint("uq_tasks_user_client_task_id", ["user_id", "client_task_id"])


def downgrade() -> None:
    with op.batch_alter_table("tasks", schema=None) as batch_op:
        batch_op.drop_constraint("uq_tasks_user_client_task_id", type_="unique")
        batch_op.drop_index("ix_tasks_client_task_id")
        batch_op.drop_column("deleted_at")
        batch_op.drop_column("client_task_id")
