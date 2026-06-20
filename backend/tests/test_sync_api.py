import asyncio
import os
import sys
import unittest
from datetime import UTC, datetime
from pathlib import Path

from fastapi.testclient import TestClient


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
from app.models.user import User


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
            preferred_language="en",
            preferred_timezone="UTC",
            default_snooze_minutes=15,
            default_quick_delay_minutes=10,
            default_deadline_reminder_mode="daily_at_time",
            default_deadline_reminder_time_local="09:00",
            default_deadline_reminder_interval_hours=4,
            default_waiting_reminder_mode="daily_at_time",
            default_waiting_reminder_time_local="10:00",
            default_waiting_reminder_interval_hours=4,
            default_recurring_reminder_time_local="09:00",
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
            "status": "new",
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

    def test_stale_sync_update_is_ignored(self) -> None:
        current_payload = {
            "title": "Newest title",
            "type": "quick",
            "status": "planned",
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
