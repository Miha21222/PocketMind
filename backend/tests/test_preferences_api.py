import asyncio
import os
import sys
import unittest
from datetime import UTC, datetime, timedelta
from io import BytesIO
from pathlib import Path
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from sqlalchemy import select

ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

TEST_DB_PATH = ROOT_DIR / ".tmp_preferences_api_test.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_PATH.as_posix()}"
os.environ["ENVIRONMENT"] = "local"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["BOT_TOKEN"] = ""

from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.task import Task
from app.models.user import User
from app.models.user_preferences import UserPreferences
from app.bot.handlers.voice import on_voice_message
from aiogram.types import Chat, Message, User as TelegramUser, Voice


async def reset_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


async def seed_user(telegram_id: int, username: str) -> User:
    async with SessionLocal() as db:
        user = User(telegram_id=telegram_id, username=username, first_name="T")
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user


def make_voice_message(telegram_id: int) -> Message:
    telegram_user = TelegramUser(id=telegram_id, is_bot=False, first_name="Test")
    message = Message(
        message_id=1,
        date=1660000000,
        chat=Chat(id=telegram_id, type="private"),
        from_user=telegram_user,
        voice=Voice(
            file_id="voice-1",
            file_unique_id="voice-u1",
            duration=3,
            mime_type="audio/ogg",
            file_size=1000,
        ),
    )
    message._bot = AsyncMock()
    message._bot.download = AsyncMock(return_value=BytesIO(b"audio-data"))
    return message


class PreferencesApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.client.close()

    def setUp(self) -> None:
        asyncio.run(reset_db())
        self.user = asyncio.run(seed_user(30001, "pref-tester"))
        self.token = create_access_token(subject=str(self.user.id))
        self.headers = {"Authorization": f"Bearer {self.token}"}

    async def _preferences_for(self, user_id: int) -> UserPreferences | None:
        async with SessionLocal() as db:
            return await db.scalar(
                select(UserPreferences).where(UserPreferences.user_id == user_id)
            )

    def test_sync_preferences_stores_quick_delay(self) -> None:
        response = self.client.put(
            "/api/v1/preferences/me",
            json={"default_quick_delay_minutes": 5},
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["synced"])
        preferences = asyncio.run(self._preferences_for(self.user.id))
        self.assertIsNotNone(preferences)
        assert preferences is not None
        self.assertEqual(preferences.quick_delay_minutes, 5)

    def test_sync_preferences_rejects_out_of_range(self) -> None:
        response = self.client.put(
            "/api/v1/preferences/me",
            json={"default_quick_delay_minutes": 1},
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 422)
        preferences = asyncio.run(self._preferences_for(self.user.id))
        self.assertIsNone(preferences)

    def test_sync_preferences_requires_auth(self) -> None:
        response = self.client.put(
            "/api/v1/preferences/me", json={"default_quick_delay_minutes": 5}
        )
        self.assertEqual(response.status_code, 401)

    def test_sync_preferences_is_scoped_to_user(self) -> None:
        other = asyncio.run(seed_user(30002, "other-tester"))
        other_token = create_access_token(subject=str(other.id))
        other_headers = {"Authorization": f"Bearer {other_token}"}
        self.client.put(
            "/api/v1/preferences/me",
            json={"default_quick_delay_minutes": 45},
            headers=other_headers,
        )
        response = self.client.put(
            "/api/v1/preferences/me",
            json={"default_quick_delay_minutes": 5},
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 200)
        other_preferences = asyncio.run(self._preferences_for(other.id))
        assert other_preferences is not None
        self.assertEqual(other_preferences.quick_delay_minutes, 45)
        own_preferences = asyncio.run(self._preferences_for(self.user.id))
        assert own_preferences is not None
        self.assertEqual(own_preferences.quick_delay_minutes, 5)

    def test_voice_task_uses_synced_quick_delay(self) -> None:
        response = self.client.put(
            "/api/v1/preferences/me",
            json={"default_quick_delay_minutes": 5},
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 200)
        message = make_voice_message(30001)

        async def exercise() -> tuple[Task, datetime, datetime]:
            before = datetime.now(UTC)
            with patch(
                "app.bot.handlers.voice.transcribe_audio",
                return_value="Synced delay task",
            ):
                await on_voice_message(message)
            after = datetime.now(UTC)
            async with SessionLocal() as db:
                task = (
                    await db.scalars(
                        select(Task).where(Task.user_id == self.user.id)
                    )
                ).one()
                return task, before, after

        task, before, after = asyncio.run(exercise())
        assert task.remind_at is not None
        remind_at = task.remind_at.replace(tzinfo=UTC)
        self.assertGreaterEqual(remind_at, before + timedelta(minutes=5))
        self.assertLessEqual(remind_at, after + timedelta(minutes=5, seconds=1))


if __name__ == "__main__":
    unittest.main()