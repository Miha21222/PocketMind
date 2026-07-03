import asyncio
import os
import sys
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from sqlalchemy import select


ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

TEST_DB_PATH = ROOT_DIR / ".tmp_reminder_service_test.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_PATH.as_posix()}"
os.environ["ENVIRONMENT"] = "local"
os.environ["JWT_SECRET"] = "test-secret"

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.reminder_log import ReminderLog, ReminderStatus
from app.models.task import ReminderMode, Task, TaskStatus, TaskType
from app.models.user import User
from app.services.reminder_service import send_task_reminder
from app.services.task_service import get_due_tasks


async def reset_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


def make_bot() -> AsyncMock:
    bot = AsyncMock()
    bot.send_message = AsyncMock(return_value=SimpleNamespace(chat=SimpleNamespace(id=999), message_id=111))
    return bot


class ReminderServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        asyncio.run(reset_db())

    async def _seed_user_and_task(self, **task_overrides) -> tuple[int, int]:
        async with SessionLocal() as db:
            user = User(
                telegram_id=20001,
                username="reminder-tester",
                first_name="Reminder",
                last_name="Tester",
                language_code="en",
            )
            db.add(user)
            await db.flush()

            now = datetime.now(UTC)
            defaults = dict(
                user_id=user.id,
                client_task_id="reminder-task-1",
                title="Send me",
                description=None,
                type=TaskType.deadline,
                status=TaskStatus.active,
                deadline_at=now + timedelta(days=30),
                remind_at=now - timedelta(minutes=1),
                reminder_mode=ReminderMode.every_n_hours,
                reminder_interval_hours=4,
                reminder_timezone="UTC",
            )
            defaults.update(task_overrides)
            task = Task(**defaults)
            db.add(task)
            await db.commit()
            return user.id, task.id

    def test_send_task_reminder_phase_a_survives_phase_b_failure(self) -> None:
        async def exercise():
            user_id, task_id = await self._seed_user_and_task()
            bot = make_bot()
            async with SessionLocal() as db:
                task = await db.get(Task, task_id)
                user = await db.get(User, user_id)
                with patch(
                    "app.services.reminder_service.assign_next_reminder_after_send",
                    side_effect=RuntimeError("boom"),
                ):
                    await send_task_reminder(db, bot, task, user)

            async with SessionLocal() as verify_db:
                refreshed = await verify_db.get(Task, task_id)
                logs = (await verify_db.scalars(select(ReminderLog).where(ReminderLog.task_id == task_id))).all()
                due = await get_due_tasks(verify_db)
            return bot, refreshed, list(logs), due

        bot, task, logs, due = asyncio.run(exercise())
        bot.send_message.assert_awaited_once()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].status, ReminderStatus.sent)
        self.assertIsNotNone(logs[0].sent_at)
        self.assertIsNotNone(logs[0].chat_id)
        self.assertIsNotNone(logs[0].message_id)
        self.assertIsNotNone(task.last_reminded_at)
        # The literal regression check: even though Phase B (scheduling the next
        # reminder) failed, remind_at was already cleared in Phase A, so the next
        # poll must not pick this task up again.
        self.assertIsNone(task.remind_at)
        self.assertEqual([t.client_task_id for t in due], [])

    def test_send_task_reminder_reuses_existing_pending_log(self) -> None:
        async def exercise():
            user_id, task_id = await self._seed_user_and_task(client_task_id="reminder-task-2")
            async with SessionLocal() as db:
                task = await db.get(Task, task_id)
                pre_log = ReminderLog(
                    task_id=task_id,
                    user_id=user_id,
                    scheduled_for=task.remind_at,
                    status=ReminderStatus.pending,
                )
                db.add(pre_log)
                await db.commit()
                await db.refresh(pre_log)
                pre_log_id = pre_log.id

            bot = make_bot()
            async with SessionLocal() as db:
                task = await db.get(Task, task_id)
                user = await db.get(User, user_id)
                await send_task_reminder(db, bot, task, user)

            async with SessionLocal() as verify_db:
                logs = (
                    await verify_db.scalars(
                        select(ReminderLog).where(ReminderLog.task_id == task_id).order_by(ReminderLog.id)
                    )
                ).all()
            return pre_log_id, list(logs)

        pre_log_id, logs = asyncio.run(exercise())
        self.assertEqual(len(logs), 2)
        sent_logs = [log for log in logs if log.status == ReminderStatus.sent]
        pending_logs = [log for log in logs if log.status == ReminderStatus.pending]
        self.assertEqual(len(sent_logs), 1)
        self.assertEqual(len(pending_logs), 1)
        self.assertEqual(sent_logs[0].id, pre_log_id)

    def test_send_task_reminder_ad_hoc_fallback_when_no_pending_row(self) -> None:
        async def exercise():
            user_id, task_id = await self._seed_user_and_task(client_task_id="reminder-task-3")
            bot = make_bot()
            async with SessionLocal() as db:
                task = await db.get(Task, task_id)
                user = await db.get(User, user_id)
                await send_task_reminder(db, bot, task, user)

            async with SessionLocal() as verify_db:
                logs = (await verify_db.scalars(select(ReminderLog).where(ReminderLog.task_id == task_id))).all()
            return bot, list(logs)

        bot, logs = asyncio.run(exercise())
        bot.send_message.assert_awaited_once()
        sent_logs = [log for log in logs if log.status == ReminderStatus.sent]
        self.assertEqual(len(sent_logs), 1)

    def test_assign_next_reminder_after_send_handles_naive_deadline_from_sqlite(self) -> None:
        # SQLAlchemy + SQLite round-trips DateTime(timezone=True) columns as
        # naive datetimes, so a task loaded fresh from the DB (exactly what
        # get_due_tasks -> send_task_reminder does on every scheduler poll) can
        # carry a naive deadline_at even though it was stored as UTC. This used
        # to raise "can't compare offset-naive and offset-aware datetimes"
        # inside assign_next_reminder_after_send for any deadline/waiting task
        # with a deadline set, silently failing Phase B on every send.
        from app.services.reminder_planning_service import assign_next_reminder_after_send

        now = datetime.now(UTC)
        task = Task(
            user_id=1,
            client_task_id="naive-deadline-1",
            title="Naive deadline",
            type=TaskType.deadline,
            status=TaskStatus.active,
            deadline_at=(now + timedelta(days=1)).replace(tzinfo=None),
            remind_at=now - timedelta(minutes=1),
            reminder_mode=ReminderMode.daily_at_time,
            reminder_time_local="09:00",
        )

        assign_next_reminder_after_send(task, "UTC")

        self.assertIsNotNone(task.remind_at)


if __name__ == "__main__":
    unittest.main()
