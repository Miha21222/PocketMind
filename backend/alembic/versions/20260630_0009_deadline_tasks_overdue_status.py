"""mark stale deadline tasks as overdue

Revision ID: 20260630_0009
Revises: 20260630_0008
Create Date: 2026-06-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260630_0009"
down_revision: str | None = "20260630_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


ACTIVE_ONLY_STATUSES = ("active", "snoozed", "done", "cancelled")
OVERDUE_STATUSES = ("active", "overdue", "snoozed", "done", "cancelled")
ACTIVE_ONLY_ENUM = sa.Enum(*ACTIVE_ONLY_STATUSES, name="taskstatus")
OVERDUE_ENUM = sa.Enum(*OVERDUE_STATUSES, name="taskstatus")


def _mark_stale_deadline_rows_overdue() -> None:
    op.execute(
        sa.text(
            """
            UPDATE tasks
            SET status = 'overdue',
                remind_at = NULL,
                snoozed_until = NULL
            WHERE type IN ('deadline', 'waiting')
              AND deadline_at IS NOT NULL
              AND deadline_at < CURRENT_TIMESTAMP
              AND status IN ('active', 'snoozed')
            """
        )
    )


def _collapse_overdue_rows() -> None:
    op.execute(sa.text("UPDATE tasks SET status = 'active' WHERE status = 'overdue'"))


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE taskstatus RENAME TO taskstatus_old")
        OVERDUE_ENUM.create(bind, checkfirst=False)
        op.execute(
            """
            ALTER TABLE tasks
            ALTER COLUMN status TYPE taskstatus
            USING status::text::taskstatus
            """
        )
        op.execute("DROP TYPE taskstatus_old")
    else:
        with op.batch_alter_table("tasks", schema=None) as batch_op:
            batch_op.alter_column(
                "status",
                existing_type=ACTIVE_ONLY_ENUM,
                type_=OVERDUE_ENUM,
                existing_nullable=False,
                server_default="active",
            )

    _mark_stale_deadline_rows_overdue()


def downgrade() -> None:
    bind = op.get_bind()
    _collapse_overdue_rows()

    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE taskstatus RENAME TO taskstatus_new")
        ACTIVE_ONLY_ENUM.create(bind, checkfirst=False)
        op.execute(
            """
            ALTER TABLE tasks
            ALTER COLUMN status TYPE taskstatus
            USING (
                CASE
                    WHEN status::text = 'overdue' THEN 'active'
                    ELSE status::text
                END
            )::taskstatus
            """
        )
        op.execute("DROP TYPE taskstatus_new")
        return

    with op.batch_alter_table("tasks", schema=None) as batch_op:
        batch_op.alter_column(
            "status",
            existing_type=OVERDUE_ENUM,
            type_=ACTIVE_ONLY_ENUM,
            existing_nullable=False,
            server_default="active",
        )
