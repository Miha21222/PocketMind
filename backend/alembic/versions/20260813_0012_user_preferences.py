"""add server-owned user preferences

Revision ID: 20260813_0012
Revises: 20260701_0011
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260813_0012"
down_revision: str | None = "20260701_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_preferences",
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("language", sa.String(length=8), nullable=False, server_default="en"),
        sa.Column(
            "timezone",
            sa.String(length=64),
            nullable=False,
            server_default="Europe/Kyiv",
        ),
        sa.Column("snooze_minutes", sa.Integer(), nullable=False, server_default="15"),
        sa.Column(
            "quick_delay_minutes", sa.Integer(), nullable=False, server_default="10"
        ),
        sa.Column(
            "deadline_reminder_mode",
            sa.String(length=32),
            nullable=False,
            server_default="daily_at_time",
        ),
        sa.Column(
            "deadline_reminder_time_local",
            sa.String(length=5),
            nullable=False,
            server_default="09:00",
        ),
        sa.Column(
            "deadline_reminder_interval_hours",
            sa.Integer(),
            nullable=False,
            server_default="4",
        ),
        sa.Column(
            "waiting_reminder_mode",
            sa.String(length=32),
            nullable=False,
            server_default="daily_at_time",
        ),
        sa.Column(
            "waiting_reminder_time_local",
            sa.String(length=5),
            nullable=False,
            server_default="10:00",
        ),
        sa.Column(
            "waiting_reminder_interval_hours",
            sa.Integer(),
            nullable=False,
            server_default="4",
        ),
        sa.Column(
            "recurring_reminder_time_local",
            sa.String(length=5),
            nullable=False,
            server_default="09:00",
        ),
        sa.Column(
            "haptics_enabled", sa.Boolean(), nullable=False, server_default=sa.true()
        ),
        sa.Column("legacy_imported_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.execute(
        """
        INSERT INTO user_preferences (user_id, language, timezone, snooze_minutes, quick_delay_minutes,
            deadline_reminder_mode, deadline_reminder_time_local, deadline_reminder_interval_hours,
            waiting_reminder_mode, waiting_reminder_time_local, waiting_reminder_interval_hours,
            recurring_reminder_time_local, haptics_enabled, created_at, updated_at)
        SELECT id,
            CASE WHEN lower(coalesce(language_code, '')) LIKE 'uk%' THEN 'uk'
                 WHEN lower(coalesce(language_code, '')) LIKE 'ru%' THEN 'ru' ELSE 'en' END,
            'Europe/Kyiv', 15, 10, 'daily_at_time', '09:00', 4,
            'daily_at_time', '10:00', 4, '09:00', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM users
        """
    )


def downgrade() -> None:
    op.drop_table("user_preferences")
