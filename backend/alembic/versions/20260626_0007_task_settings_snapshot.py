"""per-task settings snapshot; drop user settings columns

Reminder-shaping settings (timezone, language, snooze) now travel with each task
as a client-captured snapshot. The backend no longer owns any user settings, so
the per-user settings columns are removed.

Revision ID: 20260626_0007
Revises: 20260624_0006
Create Date: 2026-06-26
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260626_0007"
down_revision: str | None = "20260624_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


USER_SETTINGS_COLUMNS = (
    "preferred_language",
    "preferred_timezone",
    "default_snooze_minutes",
    "default_quick_delay_minutes",
    "default_deadline_reminder_mode",
    "default_deadline_reminder_time_local",
    "default_deadline_reminder_interval_hours",
    "default_waiting_reminder_mode",
    "default_waiting_reminder_time_local",
    "default_waiting_reminder_interval_hours",
    "default_recurring_reminder_time_local",
)


def upgrade() -> None:
    with op.batch_alter_table("tasks") as batch_op:
        batch_op.add_column(sa.Column("reminder_timezone", sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column("reminder_language", sa.String(length=8), nullable=True))
        batch_op.add_column(sa.Column("snooze_minutes", sa.Integer(), nullable=True))

    with op.batch_alter_table("users") as batch_op:
        for column in USER_SETTINGS_COLUMNS:
            batch_op.drop_column(column)


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("preferred_language", sa.String(length=8), nullable=True))
        batch_op.add_column(sa.Column("preferred_timezone", sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column("default_snooze_minutes", sa.Integer(), nullable=False, server_default="15"))
        batch_op.add_column(sa.Column("default_quick_delay_minutes", sa.Integer(), nullable=False, server_default="10"))
        batch_op.add_column(sa.Column("default_deadline_reminder_mode", sa.String(length=32), nullable=False, server_default="daily_at_time"))
        batch_op.add_column(sa.Column("default_deadline_reminder_time_local", sa.String(length=5), nullable=False, server_default="09:00"))
        batch_op.add_column(sa.Column("default_deadline_reminder_interval_hours", sa.Integer(), nullable=False, server_default="4"))
        batch_op.add_column(sa.Column("default_waiting_reminder_mode", sa.String(length=32), nullable=False, server_default="daily_at_time"))
        batch_op.add_column(sa.Column("default_waiting_reminder_time_local", sa.String(length=5), nullable=False, server_default="10:00"))
        batch_op.add_column(sa.Column("default_waiting_reminder_interval_hours", sa.Integer(), nullable=False, server_default="4"))
        batch_op.add_column(sa.Column("default_recurring_reminder_time_local", sa.String(length=5), nullable=False, server_default="09:00"))

    with op.batch_alter_table("tasks") as batch_op:
        batch_op.drop_column("snooze_minutes")
        batch_op.drop_column("reminder_language")
        batch_op.drop_column("reminder_timezone")
