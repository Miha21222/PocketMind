from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task, TaskStatus


async def get_due_tasks(db: AsyncSession) -> list[Task]:
    now = datetime.now(UTC)
    result = await db.scalars(
        select(Task).where(
            Task.deleted_at.is_(None),
            Task.remind_at.is_not(None),
            Task.remind_at <= now,
            Task.status.in_([TaskStatus.planned, TaskStatus.snoozed]),
        )
    )
    return list(result.all())
