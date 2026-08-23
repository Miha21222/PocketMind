import asyncio
import os
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

TEST_DB_PATH = ROOT_DIR / ".tmp_task_application_service_test.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_PATH.as_posix()}"
os.environ["ENVIRONMENT"] = "local"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["BOT_TOKEN"] = ""

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.task import ReminderMode, Task, TaskStatus, TaskType
from app.models.user import User
from app.services.task_application_service import (
    PreferenceUpdateCommand,
    TaskCreateCommand,
    TaskUpdateCommand,
    create_task,
    cancel_task,
    complete_task,
    delete_task,
    get_task,
    update_task,
    update_preferences,
)


async def reset_db() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)


async def create_user(telegram_id: int) -> User:
    async with SessionLocal() as db:
        user = User(telegram_id=telegram_id, first_name="Test")
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user


class TestTaskApplicationService:
    def setup_method(self) -> None:
        asyncio.run(reset_db())

    def test_deadline_clear_removes_reminder_state(self) -> None:
        async def exercise() -> Task:
            user = await create_user(1)
            async with SessionLocal() as db:
                task = Task(
                    user_id=user.id,
                    client_task_id="deadline",
                    title="Deadline",
                    type=TaskType.deadline,
                    deadline_at=datetime.now(UTC) + timedelta(days=1),
                    remind_at=datetime.now(UTC) + timedelta(hours=1),
                    reminder_mode=ReminderMode.daily_at_time,
                    reminder_time_local="09:00",
                    reminder_interval_hours=4,
                )
                db.add(task)
                await db.flush()
                updated = await update_task(
                    db,
                    user,
                    task.client_task_id or "",
                    TaskUpdateCommand(
                        title="No deadline",
                        type=TaskType.no_deadline,
                        deadline_at=None,
                    ),
                )
                assert updated is not None
                await db.commit()
                return updated

        task = asyncio.run(exercise())
        assert task.deadline_at is None
        assert task.remind_at is None
        assert task.reminder_mode == ReminderMode.none
        assert task.reminder_time_local is None
        assert task.reminder_interval_hours is None

    def test_editing_quick_task_preserves_its_reminder(self) -> None:
        async def exercise() -> tuple[Task, datetime]:
            user = await create_user(2)
            original_remind_at = datetime.now(UTC) + timedelta(minutes=7)
            async with SessionLocal() as db:
                task = Task(
                    user_id=user.id,
                    client_task_id="quick",
                    title="Quick",
                    type=TaskType.quick,
                    remind_at=original_remind_at,
                )
                db.add(task)
                await db.flush()
                updated = await update_task(
                    db,
                    user,
                    "quick",
                    TaskUpdateCommand(title="Renamed", type=TaskType.quick),
                )
                assert updated is not None
                await db.commit()
                return updated, original_remind_at

        task, original_remind_at = asyncio.run(exercise())
        assert task.remind_at is not None
        assert task.remind_at.replace(tzinfo=UTC) == original_remind_at

    def test_new_quick_task_uses_configured_delay(self) -> None:
        async def exercise() -> tuple[Task, datetime, int]:
            user = await create_user(20)
            async with SessionLocal() as db:
                preferences = await update_preferences(
                    db, user, PreferenceUpdateCommand(quick_delay_minutes=35)
                )
                before = datetime.now(UTC)
                task = await create_task(db, user, TaskCreateCommand(title="Quick"))
                await db.commit()
                return task, before, preferences.quick_delay_minutes

        task, before, delay = asyncio.run(exercise())
        assert task.remind_at is not None
        assert task.remind_at.replace(tzinfo=UTC) >= before + timedelta(minutes=delay)
        assert task.remind_at.replace(tzinfo=UTC) <= before + timedelta(
            minutes=delay, seconds=1
        )

    def test_preferences_preserve_snoozed_task(self) -> None:
        async def exercise() -> tuple[Task, datetime]:
            user = await create_user(3)
            snoozed_until = datetime.now(UTC) + timedelta(minutes=30)
            async with SessionLocal() as db:
                task = Task(
                    user_id=user.id,
                    client_task_id="snoozed",
                    title="Snoozed",
                    type=TaskType.waiting,
                    status=TaskStatus.snoozed,
                    snoozed_until=snoozed_until,
                    remind_at=snoozed_until,
                )
                db.add(task)
                await update_preferences(
                    db, user, PreferenceUpdateCommand(language="uk")
                )
                await db.commit()
                return task, snoozed_until

        task, snoozed_until = asyncio.run(exercise())
        assert task.status == TaskStatus.snoozed
        assert task.snoozed_until is not None
        assert task.remind_at is not None
        assert task.snoozed_until.replace(tzinfo=UTC) == snoozed_until
        assert task.remind_at.replace(tzinfo=UTC) == snoozed_until

    def test_cancel_and_soft_delete_are_distinct(self) -> None:
        async def exercise() -> tuple[Task, Task]:
            user = await create_user(4)
            async with SessionLocal() as db:
                cancelled = Task(
                    user_id=user.id, client_task_id="cancel", title="Cancel"
                )
                deleted = Task(user_id=user.id, client_task_id="delete", title="Delete")
                db.add_all([cancelled, deleted])
                await db.flush()
                await cancel_task(db, user, "cancel")
                await delete_task(db, user, "delete")
                assert await get_task(db, user, "cancel") is cancelled
                assert await get_task(db, user, "delete") is None
                await db.commit()
                return cancelled, deleted

        cancelled, deleted = asyncio.run(exercise())
        assert cancelled.cancelled_at is not None
        assert cancelled.deleted_at is None
        assert deleted.deleted_at is not None

    def test_task_lookup_is_scoped_to_user(self) -> None:
        async def exercise() -> Task | None:
            owner = await create_user(5)
            other = await create_user(6)
            async with SessionLocal() as db:
                db.add(
                    Task(user_id=owner.id, client_task_id="private", title="Private")
                )
                await db.commit()
                return await get_task(db, other, "private")

        assert asyncio.run(exercise()) is None

    def test_recurring_completion_advances_next_reminder(self) -> None:
        async def exercise() -> Task:
            user = await create_user(7)
            async with SessionLocal() as db:
                task = Task(
                    user_id=user.id,
                    client_task_id="recurring",
                    title="Repeat",
                    type=TaskType.recurring,
                    recurrence_rule="RRULE:FREQ=DAILY",
                    reminder_time_local="09:00",
                )
                db.add(task)
                await complete_task(db, user, "recurring")
                await db.commit()
                return task

        task = asyncio.run(exercise())
        assert task.status == TaskStatus.active
        assert task.completed_at is not None
        assert task.remind_at is not None
        assert task.remind_at.replace(tzinfo=UTC) > task.completed_at.replace(
            tzinfo=UTC
        )

    def test_mutations_do_not_cross_user_boundaries(self) -> None:
        async def exercise() -> tuple[Task, User]:
            owner = await create_user(30)
            other = await create_user(31)
            async with SessionLocal() as db:
                task = Task(user_id=owner.id, client_task_id="private", title="Private")
                db.add(task)
                await db.commit()
                assert (
                    await update_task(
                        db, other, "private", TaskUpdateCommand(title="No")
                    )
                    is None
                )
                assert await complete_task(db, other, "private") is None
                assert await cancel_task(db, other, "private") is None
                assert await delete_task(db, other, "private") is None
                await db.refresh(task)
                return task, other

        task, _ = asyncio.run(exercise())
        assert task.title == "Private"
        assert task.status == TaskStatus.active
        assert task.deleted_at is None
