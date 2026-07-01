"""collapse legacy task statuses into active

Revision ID: 20260630_0008
Revises: 20260626_0007
Create Date: 2026-06-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260630_0008"
down_revision: str | None = "20260626_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


LEGACY_STATUSES = ("new", "planned", "reminded")
ACTIVE_ONLY_STATUSES = ("active", "snoozed", "done", "cancelled")
LEGACY_ENUM = sa.Enum("new", "planned", "reminded", "snoozed", "done", "cancelled", name="taskstatus")
ACTIVE_ONLY_ENUM = sa.Enum(*ACTIVE_ONLY_STATUSES, name="taskstatus")


def _collapse_legacy_rows() -> None:
    op.execute(sa.text("UPDATE tasks SET status = 'active' WHERE status IN ('new', 'planned', 'reminded')"))


def upgrade() -> None:
    bind = op.get_bind()
    _collapse_legacy_rows()

    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE taskstatus RENAME TO taskstatus_old")
        ACTIVE_ONLY_ENUM.create(bind, checkfirst=False)
        op.execute(
            """
            ALTER TABLE tasks
            ALTER COLUMN status TYPE taskstatus
            USING (
                CASE
                    WHEN status::text IN ('new', 'planned', 'reminded') THEN 'active'
                    ELSE status::text
                END
            )::taskstatus
            """
        )
        op.execute("DROP TYPE taskstatus_old")
        return

    with op.batch_alter_table("tasks", schema=None) as batch_op:
        batch_op.alter_column(
            "status",
            existing_type=LEGACY_ENUM,
            type_=ACTIVE_ONLY_ENUM,
            existing_nullable=False,
            server_default="active",
        )


def downgrade() -> None:
    bind = op.get_bind()
    op.execute(sa.text("UPDATE tasks SET status = 'reminded' WHERE status = 'active' AND last_reminded_at IS NOT NULL"))
    op.execute(sa.text("UPDATE tasks SET status = 'planned' WHERE status = 'active' AND remind_at IS NOT NULL"))
    op.execute(sa.text("UPDATE tasks SET status = 'new' WHERE status = 'active' AND remind_at IS NULL"))

    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE taskstatus RENAME TO taskstatus_new")
        LEGACY_ENUM.create(bind, checkfirst=False)
        op.execute(
            """
            ALTER TABLE tasks
            ALTER COLUMN status TYPE taskstatus
            USING status::text::taskstatus
            """
        )
        op.execute("DROP TYPE taskstatus_new")
        return

    with op.batch_alter_table("tasks", schema=None) as batch_op:
        batch_op.alter_column(
            "status",
            existing_type=ACTIVE_ONLY_ENUM,
            type_=LEGACY_ENUM,
            existing_nullable=False,
            server_default="new",
        )
