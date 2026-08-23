import asyncio
import os
import re
import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import select

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))
TEST_DB_PATH = ROOT / ".tmp_web_rebuild_test.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_PATH.as_posix()}"
os.environ["ENVIRONMENT"] = "local"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["BOT_TOKEN"] = ""

from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import SessionLocal, close_db, engine
from app.main import app
from app.models.task import Task, TaskStatus
from app.models.user import User


async def reset_db() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)


async def create_user(telegram_id: int) -> User:
    async with SessionLocal() as db:
        user = User(telegram_id=telegram_id, first_name="Web")
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user


async def create_task(user_id: int, client_task_id: str) -> Task:
    async with SessionLocal() as db:
        task = Task(user_id=user_id, client_task_id=client_task_id, title="Web task")
        db.add(task)
        await db.commit()
        await db.refresh(task)
        return task


async def fetch_task(client_task_id: str) -> Task | None:
    async with SessionLocal() as db:
        return await db.scalar(
            select(Task).where(Task.client_task_id == client_task_id)
        )


class WebRebuildTests(unittest.TestCase):
    def setUp(self):
        asyncio.run(reset_db())
        self.user = asyncio.run(create_user(100))
        self.client = TestClient(app, base_url="https://testserver")

    def tearDown(self):
        self.client.close()

    @classmethod
    def tearDownClass(cls) -> None:
        asyncio.run(close_db())

    def test_unauthenticated_web_root_redirects_to_launch(self):
        response = self.client.get("/", follow_redirects=False)
        self.assertEqual(response.status_code, 303)
        self.assertEqual(response.headers["location"], "/launch?next=%2F")

    def test_launch_rejects_external_next(self):
        response = self.client.get("/launch?next=https://evil.example")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("evil.example", response.text)

    def test_cookie_protected_api_remains_unauthorized(self):
        response = self.client.post("/api/v1/voice/transcribe")
        self.assertEqual(response.status_code, 401)

    def test_ready_is_available(self):
        response = self.client.get("/ready")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ready")

    def authenticate_web_user(self, user: User | None = None) -> str:
        current_user = user or self.user
        self.client.cookies.set(
            "pocketmind_session", create_access_token(subject=str(current_user.id))
        )
        response = self.client.get("/tasks/new", follow_redirects=False)
        self.assertEqual(response.status_code, 200)
        match = re.search(r'name="csrf" value="([^"]+)"', response.text)
        self.assertIsNotNone(match)
        assert match is not None
        return match.group(1)

    def test_cancel_and_delete_actions_require_csrf_and_mutate_separately(self):
        csrf = self.authenticate_web_user()
        assert csrf
        asyncio.run(create_task(self.user.id, "cancel-me"))
        asyncio.run(create_task(self.user.id, "delete-me"))
        missing = self.client.post("/tasks/cancel-me/cancel", data={})
        self.assertEqual(missing.status_code, 403)
        invalid = self.client.post("/tasks/cancel-me/cancel", data={"csrf": "invalid"})
        self.assertEqual(invalid.status_code, 403)
        cancelled = self.client.post(
            "/tasks/cancel-me/cancel", data={"csrf": csrf}, follow_redirects=False
        )
        self.assertEqual(cancelled.status_code, 303)
        deleted = self.client.post(
            "/tasks/delete-me/delete", data={"csrf": csrf}, follow_redirects=False
        )
        self.assertEqual(deleted.status_code, 303)
        cancelled_task = asyncio.run(fetch_task("cancel-me"))
        deleted_task = asyncio.run(fetch_task("delete-me"))
        assert cancelled_task is not None and deleted_task is not None
        self.assertEqual(cancelled_task.status, TaskStatus.cancelled)
        self.assertIsNotNone(cancelled_task.cancelled_at)
        self.assertIsNone(cancelled_task.deleted_at)
        self.assertIsNotNone(deleted_task.deleted_at)

    def test_task_form_csrf_precedes_validation(self):
        csrf = self.authenticate_web_user()
        missing = self.client.post("/tasks/new", data={"title": ""})
        self.assertEqual(missing.status_code, 403)
        invalid = self.client.post("/tasks/new", data={"csrf": "invalid", "title": ""})
        self.assertEqual(invalid.status_code, 403)
        asyncio.run(create_task(self.user.id, "csrf-edit"))
        missing_edit = self.client.post("/tasks/csrf-edit/edit", data={"title": ""})
        self.assertEqual(missing_edit.status_code, 403)
        valid = self.client.post(
            "/tasks/csrf-edit/edit", data={"csrf": csrf, "title": ""}
        )
        self.assertEqual(valid.status_code, 200)

    def test_invalid_task_forms_rerender_with_validation_errors(self):
        csrf = self.authenticate_web_user()
        invalid_create = self.client.post(
            "/tasks/new", data={"csrf": csrf, "title": ""}
        )
        self.assertEqual(invalid_create.status_code, 200)
        self.assertIn("String should have at least 1 character", invalid_create.text)
        asyncio.run(create_task(self.user.id, "edit-invalid"))
        invalid_edit = self.client.post(
            "/tasks/edit-invalid/edit", data={"csrf": csrf, "title": ""}
        )
        self.assertEqual(invalid_edit.status_code, 200)
        self.assertIn("String should have at least 1 character", invalid_edit.text)

    def test_task_actions_enforce_ownership_and_known_actions(self):
        other = asyncio.run(create_user(101))
        csrf = self.authenticate_web_user(other)
        assert csrf
        asyncio.run(create_task(self.user.id, "private"))
        response = self.client.post("/tasks/private/delete", data={"csrf": csrf})
        self.assertEqual(response.status_code, 404)
        owned = asyncio.run(create_task(other.id, "owned"))
        response = self.client.post(
            f"/tasks/{owned.client_task_id}/unknown", data={"csrf": csrf}
        )
        self.assertEqual(response.status_code, 404)
        task = asyncio.run(fetch_task("private"))
        assert task is not None
        self.assertIsNone(task.deleted_at)
