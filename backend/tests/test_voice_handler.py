import asyncio
import os
import sys
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import AsyncMock, patch

from sqlalchemy import select

ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

TEST_DB_PATH = ROOT_DIR / ".tmp_voice_handler_test.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_PATH.as_posix()}"
os.environ["ENVIRONMENT"] = "local"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["BOT_TOKEN"] = ""

from app.db.base import Base
from app.db.session import SessionLocal, close_db, engine
from app.models.task import Task, TaskType
from app.models.user import User
from app.bot.handlers.voice import on_voice_message
from aiogram.types import Chat, Message, User as TelegramUser, Voice


async def reset_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


def make_message(telegram_id: int, file_size: int = 1000) -> Message:
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
            file_size=file_size,
        ),
    )
    message._bot = AsyncMock()
    return message


def replied_text(message: Message) -> str:
    from aiogram.methods.send_message import SendMessage

    call = message.bot.await_args
    assert call is not None
    method = call.args[0]
    assert isinstance(method, SendMessage)
    return method.text


class VoiceHandlerTests(unittest.TestCase):
    def setUp(self) -> None:
        asyncio.run(reset_db())

    @classmethod
    def tearDownClass(cls) -> None:
        asyncio.run(close_db())

    async def _fetch_tasks(self) -> list[Task]:
        async with SessionLocal() as db:
            return list((await db.scalars(select(Task))).all())

    def test_voice_message_creates_quick_task(self) -> None:
        message = make_message(telegram_id=70001)
        message.bot.download = AsyncMock(return_value=BytesIO(b"audio-data"))

        async def exercise() -> list[Task]:
            with patch(
                "app.bot.handlers.voice.transcribe_audio",
                return_value="Buy milk and eggs",
            ):
                await on_voice_message(message)
            return await self._fetch_tasks()

        tasks = asyncio.run(exercise())
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].title, "Buy milk and eggs")
        self.assertEqual(tasks[0].type, TaskType.quick)
        message.bot.download.assert_awaited_once()
        self.assertIn("Task created", replied_text(message))

    def test_voice_message_truncates_long_title(self) -> None:
        message = make_message(telegram_id=70002)
        message.bot.download = AsyncMock(return_value=BytesIO(b"audio-data"))
        long_title = "word " * 200

        async def exercise() -> list[Task]:
            with patch(
                "app.bot.handlers.voice.transcribe_audio",
                return_value=long_title,
            ):
                await on_voice_message(message)
            return await self._fetch_tasks()

        tasks = asyncio.run(exercise())
        self.assertEqual(len(tasks), 1)
        self.assertLessEqual(len(tasks[0].title), 255)
        self.assertTrue(tasks[0].title.startswith("word word"))

    def test_voice_message_rejects_oversized_audio(self) -> None:
        message = make_message(telegram_id=70003, file_size=11 * 1024 * 1024)

        async def exercise() -> list[Task]:
            with patch("app.bot.handlers.voice.transcribe_audio") as transcribe:
                await on_voice_message(message)
                transcribe.assert_not_called()
            return await self._fetch_tasks()

        tasks = asyncio.run(exercise())
        self.assertEqual(tasks, [])
        message.bot.assert_awaited_once()

    def test_voice_message_rejects_oversized_downloaded_bytes(self) -> None:
        message = make_message(telegram_id=70007)
        message.bot.download = AsyncMock(
            return_value=BytesIO(b"x" * (11 * 1024 * 1024))
        )

        async def exercise() -> list[Task]:
            with patch("app.bot.handlers.voice.transcribe_audio") as transcribe:
                await on_voice_message(message)
                transcribe.assert_not_called()
            return await self._fetch_tasks()

        tasks = asyncio.run(exercise())
        self.assertEqual(tasks, [])
        message.bot.assert_awaited_once()

    def test_voice_message_rejects_empty_downloaded_bytes(self) -> None:
        message = make_message(telegram_id=70008)
        message.bot.download = AsyncMock(return_value=BytesIO(b""))

        async def exercise() -> list[Task]:
            with patch("app.bot.handlers.voice.transcribe_audio") as transcribe:
                await on_voice_message(message)
                transcribe.assert_not_called()
            return await self._fetch_tasks()

        tasks = asyncio.run(exercise())
        self.assertEqual(tasks, [])
        message.bot.assert_awaited_once()

    def test_voice_message_task_creation_failure(self) -> None:
        message = make_message(telegram_id=70009)
        message.bot.download = AsyncMock(return_value=BytesIO(b"audio-data"))

        async def exercise() -> list[Task]:
            with (
                patch(
                    "app.bot.handlers.voice.transcribe_audio",
                    return_value="Will not persist",
                ),
                patch(
                    "app.bot.handlers.voice.create_task",
                    side_effect=RuntimeError("db boom"),
                ),
            ):
                await on_voice_message(message)
            return await self._fetch_tasks()

        tasks = asyncio.run(exercise())
        self.assertEqual(tasks, [])
        message.bot.assert_awaited_once()

    def test_voice_message_with_empty_transcription(self) -> None:
        message = make_message(telegram_id=70004)
        message.bot.download = AsyncMock(return_value=BytesIO(b"audio-data"))

        async def exercise() -> list[Task]:
            with patch(
                "app.bot.handlers.voice.transcribe_audio",
                return_value="   ",
            ):
                await on_voice_message(message)
            return await self._fetch_tasks()

        tasks = asyncio.run(exercise())
        self.assertEqual(tasks, [])
        message.bot.assert_awaited_once()

    def test_voice_message_transcription_failure(self) -> None:
        message = make_message(telegram_id=70005)
        message.bot.download = AsyncMock(return_value=BytesIO(b"audio-data"))

        async def exercise() -> list[Task]:
            with patch(
                "app.bot.handlers.voice.transcribe_audio",
                side_effect=RuntimeError("boom"),
            ):
                await on_voice_message(message)
            return await self._fetch_tasks()

        tasks = asyncio.run(exercise())
        self.assertEqual(tasks, [])
        message.bot.assert_awaited_once()

    def test_voice_message_provisions_new_user(self) -> None:
        message = make_message(telegram_id=70006)
        message.bot.download = AsyncMock(return_value=BytesIO(b"audio-data"))

        async def exercise() -> User | None:
            with patch(
                "app.bot.handlers.voice.transcribe_audio",
                return_value="New user task",
            ):
                await on_voice_message(message)
            async with SessionLocal() as db:
                return await db.scalar(
                    select(User).where(User.telegram_id == 70006)
                )

        user = asyncio.run(exercise())
        self.assertIsNotNone(user)
        assert user is not None
        self.assertEqual(user.first_name, "Test")

    def test_dispatcher_registers_voice_router(self) -> None:
        from app.bot.dispatcher import create_dispatcher

        dp = create_dispatcher()
        callbacks = {
            handler.callback
            for router in dp.sub_routers
            for handler in router.message.handlers
        }
        self.assertIn(on_voice_message, callbacks)

    def test_voice_task_reminder_time_comes_from_settings(self) -> None:
        from datetime import UTC, datetime, timedelta

        from app.services.task_application_service import (
            PreferenceUpdateCommand,
            update_preferences,
        )

        async def seed() -> None:
            async with SessionLocal() as db:
                user = User(telegram_id=70010, first_name="Settings")
                db.add(user)
                await db.commit()
                await db.refresh(user)
                await update_preferences(
                    db, user, PreferenceUpdateCommand(quick_delay_minutes=35)
                )
                await db.commit()

        asyncio.run(seed())
        message = make_message(telegram_id=70010)
        message.bot.download = AsyncMock(return_value=BytesIO(b"audio-data"))

        async def exercise() -> tuple[Task, datetime, datetime]:
            before = datetime.now(UTC)
            with patch(
                "app.bot.handlers.voice.transcribe_audio",
                return_value="From settings",
            ):
                await on_voice_message(message)
            after = datetime.now(UTC)
            tasks = await self._fetch_tasks()
            self.assertEqual(len(tasks), 1)
            return tasks[0], before, after

        task, before, after = asyncio.run(exercise())
        assert task.remind_at is not None
        remind_at = task.remind_at.replace(tzinfo=UTC)
        self.assertGreaterEqual(remind_at, before + timedelta(minutes=35))
        self.assertLessEqual(remind_at, after + timedelta(minutes=35, seconds=1))


if __name__ == "__main__":
    unittest.main()