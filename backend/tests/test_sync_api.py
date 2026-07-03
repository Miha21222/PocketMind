import asyncio
import os
import sys
import unittest
from datetime import UTC, datetime
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import select


ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

TEST_DB_PATH = ROOT_DIR / ".tmp_sync_api_test.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_PATH.as_posix()}"
os.environ["ENVIRONMENT"] = "local"
os.environ["JWT_SECRET"] = "test-secret"

from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.reminder_log import ReminderLog, ReminderStatus
from app.models.task import ReminderMode, Task, TaskStatus, TaskType
from app.models.user import User
from app.services.task_service import get_due_tasks


async def reset_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


async def seed_user() -> User:
    async with SessionLocal() as db:
        user = User(
            telegram_id=10001,
            username="tester",
            first_name="Sync",
            last_name="Tester",
            language_code="en",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user


class SyncApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.client.close()

    def setUp(self) -> None:
        asyncio.run(reset_db())
        user = asyncio.run(seed_user())
        self.token = create_access_token(subject=str(user.id))
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_put_sync_task_and_bootstrap(self) -> None:
        payload = {
            "title": "Plan migration",
            "type": "no_deadline",
            "status": "active",
            "description": None,
            "deadline_at": None,
            "remind_at": None,
            "reminder_mode": "none",
            "reminder_time_local": None,
            "reminder_interval_hours": None,
            "recurrence_rule": None,
            "updated_at": "2026-06-15T09:00:00Z",
            "deleted_at": None,
        }

        response = self.client.put("/api/v1/sync/tasks/local-1", json=payload, headers=self.headers)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["applied"])
        self.assertEqual(body["task"]["client_task_id"], "local-1")
        self.assertEqual(body["task"]["title"], "Plan migration")

        bootstrap = self.client.get("/api/v1/sync/bootstrap", headers=self.headers)
        self.assertEqual(bootstrap.status_code, 200)
        bootstrap_body = bootstrap.json()
        self.assertEqual(len(bootstrap_body["items"]), 1)
        self.assertEqual(bootstrap_body["items"][0]["client_task_id"], "local-1")
        self.assertIn("server_time", bootstrap_body)

    def test_delete_sync_task(self) -> None:
        payload = {
            "title": "Plan migration",
            "type": "no_deadline",
            "status": "active",
            "description": None,
            "deadline_at": None,
            "remind_at": None,
            "reminder_mode": "none",
            "reminder_time_local": None,
            "reminder_interval_hours": None,
            "recurrence_rule": None,
            "updated_at": "2026-06-15T09:00:00Z",
            "deleted_at": None,
        }
        put_response = self.client.put("/api/v1/sync/tasks/local-1", json=payload, headers=self.headers)
        self.assertEqual(put_response.status_code, 200)

        delete_response = self.client.delete("/api/v1/sync/tasks/local-1", headers=self.headers)

        self.assertEqual(delete_response.status_code, 200)
        body = delete_response.json()
        self.assertTrue(body["applied"])
        self.assertEqual(body["task"]["client_task_id"], "local-1")
        self.assertEqual(body["task"]["status"], "cancelled")
        self.assertIsNotNone(body["task"]["deleted_at"])
        self.assertIsNotNone(body["task"]["cancelled_at"])

    def test_delete_sync_task_missing_returns_404(self) -> None:
        response = self.client.delete("/api/v1/sync/tasks/missing-task", headers=self.headers)
        self.assertEqual(response.status_code, 404)

    def test_stale_sync_update_is_ignored(self) -> None:
        current_payload = {
            "title": "Newest title",
            "type": "quick",
            "status": "active",
            "description": None,
            "deadline_at": None,
            "remind_at": None,
            "reminder_mode": "none",
            "reminder_time_local": None,
            "reminder_interval_hours": None,
            "recurrence_rule": None,
            "updated_at": "2026-06-15T10:05:00Z",
            "deleted_at": None,
        }
        stale_payload = {
            **current_payload,
            "title": "Older title",
            "updated_at": "2026-06-15T10:00:00Z",
        }

        current = self.client.put("/api/v1/sync/tasks/local-2", json=current_payload, headers=self.headers)
        self.assertEqual(current.status_code, 200)

        stale = self.client.put("/api/v1/sync/tasks/local-2", json=stale_payload, headers=self.headers)
        self.assertEqual(stale.status_code, 200)
        stale_body = stale.json()
        self.assertFalse(stale_body["applied"])
        self.assertEqual(stale_body["task"]["title"], "Newest title")

        since = datetime(2026, 6, 15, 10, 1, tzinfo=UTC).isoformat().replace("+00:00", "Z")
        changes = self.client.get(f"/api/v1/sync/changes?since={since}", headers=self.headers)
        self.assertEqual(changes.status_code, 200)
        change_items = changes.json()["items"]
        self.assertEqual(len(change_items), 1)
        self.assertEqual(change_items[0]["title"], "Newest title")

    def test_task_timezone_snapshot_drives_reminder(self) -> None:
        # Each task carries its own timezone snapshot; the backend computes the
        # reminder from it with no per-user settings. 09:00 local in different
        # zones must resolve to different UTC instants.
        base = {
            "title": "Timezone task",
            "type": "deadline",
            "status": "active",
            "description": None,
            "deadline_at": "2099-01-01T00:00:00Z",
            "remind_at": None,
            "reminder_mode": "daily_at_time",
            "reminder_time_local": "09:00",
            "reminder_interval_hours": None,
            "recurrence_rule": None,
            "reminder_language": "ru",
            "snooze_minutes": 30,
            "updated_at": "2026-06-26T00:00:00Z",
            "deleted_at": None,
        }

        tokyo = self.client.put(
            "/api/v1/sync/tasks/tz-tokyo",
            json={**base, "reminder_timezone": "Asia/Tokyo"},
            headers=self.headers,
        )
        new_york = self.client.put(
            "/api/v1/sync/tasks/tz-ny",
            json={**base, "reminder_timezone": "America/New_York"},
            headers=self.headers,
        )

        self.assertEqual(tokyo.status_code, 200)
        self.assertEqual(new_york.status_code, 200)
        tokyo_remind = tokyo.json()["task"]["remind_at"]
        new_york_remind = new_york.json()["task"]["remind_at"]
        self.assertIsNotNone(tokyo_remind)
        self.assertIsNotNone(new_york_remind)
        self.assertNotEqual(tokyo_remind, new_york_remind)

    def test_deadline_task_past_deadline_persists_as_overdue(self) -> None:
        payload = {
            "title": "Past deadline task",
            "type": "deadline",
            "status": "overdue",
            "description": None,
            "deadline_at": "2026-06-01T09:00:00Z",
            "remind_at": "2026-06-30T08:00:00Z",
            "reminder_mode": "daily_at_time",
            "reminder_time_local": "09:00",
            "reminder_interval_hours": 4,
            "recurrence_rule": None,
            "updated_at": "2026-06-30T09:00:00Z",
            "deleted_at": None,
        }

        response = self.client.put("/api/v1/sync/tasks/overdue-deadline-1", json=payload, headers=self.headers)
        self.assertEqual(response.status_code, 200)
        task = response.json()["task"]
        self.assertEqual(task["status"], "overdue")
        self.assertIsNone(task["remind_at"])

        bootstrap = self.client.get("/api/v1/sync/bootstrap", headers=self.headers)
        self.assertEqual(bootstrap.status_code, 200)
        self.assertEqual(bootstrap.json()["items"][0]["status"], "overdue")

    def test_unsupported_task_type_does_not_persist_as_overdue(self) -> None:
        payload = {
            "title": "Quick overdue task",
            "type": "quick",
            "status": "overdue",
            "description": None,
            "deadline_at": None,
            "remind_at": None,
            "reminder_mode": "none",
            "reminder_time_local": None,
            "reminder_interval_hours": None,
            "recurrence_rule": None,
            "updated_at": "2026-06-30T09:00:00Z",
            "deleted_at": None,
        }

        response = self.client.put("/api/v1/sync/tasks/quick-overdue-1", json=payload, headers=self.headers)
        self.assertEqual(response.status_code, 200)
        task = response.json()["task"]
        self.assertEqual(task["status"], "active")
        self.assertIsNotNone(task["remind_at"])

    def test_legacy_statuses_are_rejected(self) -> None:
        payload = {
            "title": "Legacy planned task",
            "type": "deadline",
            "status": "planned",
            "description": None,
            "deadline_at": "2026-07-01T09:00:00Z",
            "remind_at": "2026-07-01T08:00:00Z",
            "reminder_mode": "daily_at_time",
            "reminder_time_local": "09:00",
            "reminder_interval_hours": 4,
            "recurrence_rule": None,
            "updated_at": "2026-06-30T09:00:00Z",
            "deleted_at": None,
        }

        response = self.client.put("/api/v1/sync/tasks/legacy-status-1", json=payload, headers=self.headers)
        self.assertEqual(response.status_code, 422)

    def test_due_task_query_marks_past_deadline_task_overdue_and_skips_it(self) -> None:
        async def exercise() -> tuple[list[str], Task]:
            async with SessionLocal() as db:
                user = await db.scalar(select(User).where(User.telegram_id == 10001))
                assert user is not None
                task = Task(
                    user_id=user.id,
                    client_task_id="runner-overdue-1",
                    title="Runner overdue task",
                    description=None,
                    type=TaskType.waiting,
                    status=TaskStatus.active,
                    deadline_at=datetime(2026, 6, 1, 9, 0, tzinfo=UTC),
                    remind_at=datetime(2026, 6, 30, 8, 0, tzinfo=UTC),
                    reminder_mode=ReminderMode.daily_at_time,
                    reminder_time_local="09:00",
                )
                db.add(task)
                await db.commit()

                due_tasks = await get_due_tasks(db)
                await db.refresh(task)
                return [item.client_task_id for item in due_tasks], task

        due_ids, task = asyncio.run(exercise())
        self.assertEqual(due_ids, [])
        self.assertEqual(task.status, TaskStatus.overdue)
        self.assertIsNone(task.remind_at)
        self.assertIsNone(task.snoozed_until)

    def _reminder_logs_for_client_task(self, client_task_id: str) -> list[ReminderLog]:
        async def fetch() -> list[ReminderLog]:
            async with SessionLocal() as db:
                task = await db.scalar(select(Task).where(Task.client_task_id == client_task_id))
                assert task is not None
                logs = (await db.scalars(select(ReminderLog).where(ReminderLog.task_id == task.id))).all()
                return list(logs)

        return asyncio.run(fetch())

    def test_put_sync_task_creates_single_pending_reminder_log(self) -> None:
        payload = {
            "title": "Deadline with interval reminder",
            "type": "deadline",
            "status": "active",
            "description": None,
            "deadline_at": "2099-01-01T00:00:00Z",
            "remind_at": None,
            "reminder_mode": "every_n_hours",
            "reminder_time_local": None,
            "reminder_interval_hours": 4,
            "recurrence_rule": None,
            "updated_at": "2026-06-15T09:00:00Z",
            "deleted_at": None,
        }

        response = self.client.put("/api/v1/sync/tasks/pending-log-1", json=payload, headers=self.headers)
        self.assertEqual(response.status_code, 200)
        remind_at = response.json()["task"]["remind_at"]
        self.assertIsNotNone(remind_at)

        logs = self._reminder_logs_for_client_task("pending-log-1")
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].status, ReminderStatus.pending)

    def test_put_sync_task_twice_supersedes_stale_pending_row(self) -> None:
        base = {
            "title": "Deadline with interval reminder",
            "type": "deadline",
            "status": "active",
            "description": None,
            "deadline_at": "2099-01-01T00:00:00Z",
            "remind_at": None,
            "reminder_mode": "every_n_hours",
            "reminder_time_local": None,
            "reminder_interval_hours": 4,
            "recurrence_rule": None,
            "deleted_at": None,
        }

        first = self.client.put(
            "/api/v1/sync/tasks/pending-log-2",
            json={**base, "updated_at": "2026-06-15T09:00:00Z"},
            headers=self.headers,
        )
        self.assertEqual(first.status_code, 200)
        second = self.client.put(
            "/api/v1/sync/tasks/pending-log-2",
            json={**base, "reminder_interval_hours": 6, "updated_at": "2026-06-15T10:00:00Z"},
            headers=self.headers,
        )
        self.assertEqual(second.status_code, 200)

        logs = self._reminder_logs_for_client_task("pending-log-2")
        self.assertEqual(len(logs), 2)
        statuses = sorted(log.status for log in logs)
        self.assertEqual(statuses, sorted([ReminderStatus.cancelled, ReminderStatus.pending]))

    def test_delete_sync_task_cancels_pending_reminder_log(self) -> None:
        payload = {
            "title": "Deadline task to delete",
            "type": "deadline",
            "status": "active",
            "description": None,
            "deadline_at": "2099-01-01T00:00:00Z",
            "remind_at": None,
            "reminder_mode": "every_n_hours",
            "reminder_time_local": None,
            "reminder_interval_hours": 4,
            "recurrence_rule": None,
            "updated_at": "2026-06-15T09:00:00Z",
            "deleted_at": None,
        }
        put_response = self.client.put("/api/v1/sync/tasks/pending-log-3", json=payload, headers=self.headers)
        self.assertEqual(put_response.status_code, 200)

        delete_response = self.client.delete("/api/v1/sync/tasks/pending-log-3", headers=self.headers)
        self.assertEqual(delete_response.status_code, 200)

        logs = self._reminder_logs_for_client_task("pending-log-3")
        self.assertTrue(len(logs) >= 1)
        self.assertTrue(all(log.status != ReminderStatus.pending for log in logs))

    def test_sync_batch_creates_pending_reminder_log_for_new_task(self) -> None:
        payload = {
            "tasks": [
                {
                    "client_task_id": "pending-log-batch-1",
                    "title": "Batch deadline task",
                    "type": "deadline",
                    "status": "active",
                    "description": None,
                    "deadline_at": "2099-01-01T00:00:00Z",
                    "remind_at": None,
                    "reminder_mode": "every_n_hours",
                    "reminder_time_local": None,
                    "reminder_interval_hours": 4,
                    "recurrence_rule": None,
                    "updated_at": "2026-06-15T09:00:00Z",
                    "deleted_at": None,
                }
            ]
        }

        response = self.client.post("/api/v1/sync/batch", json=payload, headers=self.headers)
        self.assertEqual(response.status_code, 200)

        logs = self._reminder_logs_for_client_task("pending-log-batch-1")
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].status, ReminderStatus.pending)
