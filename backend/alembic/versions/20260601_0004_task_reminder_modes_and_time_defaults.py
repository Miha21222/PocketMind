"""add task reminder strategy fields and user time defaults

Revision ID: 20260601_0004
Revises: 20260528_0003
Create Date: 2026-06-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260601_0004"
down_revision: str | None = "20260528_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    reminder_mode_enum = sa.Enum("none", "daily_at_time", "every_n_hours", name="remindermode")
    reminder_mode_enum.create(op.get_bind(), checkfirst=True)
    op.add_column("tasks", sa.Column("reminder_mode", reminder_mode_enum, nullable=False, server_default="none"))
    op.add_column("tasks", sa.Column("reminder_time_local", sa.String(length=5), nullable=True))
    op.add_column("tasks", sa.Column("reminder_interval_hours", sa.Integer(), nullable=True))

    op.add_column("users", sa.Column("default_quick_delay_minutes", sa.Integer(), nullable=False, server_default="10"))
    op.add_column(
        "users",
        sa.Column("default_deadline_reminder_mode", sa.String(length=32), nullable=False, server_default="daily_at_time"),
    )
    op.add_column(
        "users",
        sa.Column("default_deadline_reminder_time_local", sa.String(length=5), nullable=False, server_default="09:00"),
    )
    op.add_column(
        "users",
        sa.Column("default_deadline_reminder_interval_hours", sa.Integer(), nullable=False, server_default="4"),
    )
    op.add_column(
        "users",
        sa.Column("default_waiting_reminder_mode", sa.String(length=32), nullable=False, server_default="daily_at_time"),
    )
    op.add_column(
        "users",
        sa.Column("default_waiting_reminder_time_local", sa.String(length=5), nullable=False, server_default="10:00"),
    )
    op.add_column(
        "users",
        sa.Column("default_waiting_reminder_interval_hours", sa.Integer(), nullable=False, server_default="4"),
    )
    op.add_column(
        "users",
        sa.Column("default_recurring_reminder_time_local", sa.String(length=5), nullable=False, server_default="09:00"),
    )


def downgrade() -> None:
    op.drop_column("users", "default_recurring_reminder_time_local")
    op.drop_column("users", "default_waiting_reminder_interval_hours")
    op.drop_column("users", "default_waiting_reminder_time_local")
    op.drop_column("users", "default_waiting_reminder_mode")
    op.drop_column("users", "default_deadline_reminder_interval_hours")
    op.drop_column("users", "default_deadline_reminder_time_local")
    op.drop_column("users", "default_deadline_reminder_mode")
    op.drop_column("users", "default_quick_delay_minutes")

    op.drop_column("tasks", "reminder_interval_hours")
    op.drop_column("tasks", "reminder_time_local")
    op.drop_column("tasks", "reminder_mode")
    sa.Enum(name="remindermode").drop(op.get_bind(), checkfirst=True)
