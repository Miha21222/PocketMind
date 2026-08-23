import asyncio
import os
import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import select


ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

TEST_DB_PATH = ROOT_DIR / ".tmp_feedback_api_test.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_PATH.as_posix()}"
os.environ["ENVIRONMENT"] = "local"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["BOT_TOKEN"] = ""

from app.api.v1.feedback import SCREENSHOT_DIR
from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.main import app
from app.models.feedback import Feedback, FeedbackKind
from app.models.user import User

# The endpoint only checks the declared content-type and size, not that the
# bytes decode as a real image, so a placeholder payload is enough here.
FAKE_IMAGE_BYTES = b"fake-image-bytes-for-tests"


async def reset_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


async def seed_user() -> User:
    async with SessionLocal() as db:
        user = User(
            telegram_id=20001,
            username="feedback_tester",
            first_name="Feedback",
            last_name="Tester",
            language_code="en",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user


class FeedbackApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.client.close()

    def setUp(self) -> None:
        asyncio.run(reset_db())
        user = asyncio.run(seed_user())
        self.user_id = user.id
        self.token = create_access_token(subject=str(user.id))
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def tearDown(self) -> None:
        if SCREENSHOT_DIR.exists():
            for path in SCREENSHOT_DIR.iterdir():
                path.unlink(missing_ok=True)

    def test_submit_rating(self) -> None:
        response = self.client.post(
            "/api/v1/feedback",
            data={"kind": "rating", "rating": "5", "message": "Loved it"},
            headers=self.headers,
        )

        self.assertEqual(response.status_code, 200)
        feedback_id = response.json()["id"]

        async def fetch() -> Feedback | None:
            async with SessionLocal() as db:
                return await db.scalar(
                    select(Feedback).where(Feedback.id == feedback_id)
                )

        record = asyncio.run(fetch())
        self.assertIsNotNone(record)
        assert record is not None
        self.assertEqual(record.user_id, self.user_id)
        self.assertEqual(record.kind, FeedbackKind.rating)
        self.assertEqual(record.rating, 5)
        self.assertEqual(record.message, "Loved it")

    def test_submit_bug_report(self) -> None:
        response = self.client.post(
            "/api/v1/feedback",
            data={"kind": "bug", "message": "The delete button does nothing"},
            headers=self.headers,
        )

        self.assertEqual(response.status_code, 200)
        feedback_id = response.json()["id"]

        async def fetch() -> Feedback | None:
            async with SessionLocal() as db:
                return await db.scalar(
                    select(Feedback).where(Feedback.id == feedback_id)
                )

        record = asyncio.run(fetch())
        self.assertIsNotNone(record)
        assert record is not None
        self.assertEqual(record.kind, FeedbackKind.bug)
        self.assertIsNone(record.rating)
        self.assertEqual(record.message, "The delete button does nothing")
        self.assertIsNone(record.screenshot_path)

    def test_rating_without_rating_value_is_rejected(self) -> None:
        response = self.client.post(
            "/api/v1/feedback",
            data={"kind": "rating"},
            headers=self.headers,
        )

        self.assertEqual(response.status_code, 422)

    def test_bug_report_without_message_is_rejected(self) -> None:
        response = self.client.post(
            "/api/v1/feedback",
            data={"kind": "bug"},
            headers=self.headers,
        )

        self.assertEqual(response.status_code, 422)

    def test_bug_report_with_screenshot(self) -> None:
        response = self.client.post(
            "/api/v1/feedback",
            data={"kind": "bug", "message": "Broken layout"},
            files={"screenshot": ("screenshot.png", FAKE_IMAGE_BYTES, "image/png")},
            headers=self.headers,
        )

        self.assertEqual(response.status_code, 200)
        feedback_id = response.json()["id"]

        async def fetch() -> Feedback | None:
            async with SessionLocal() as db:
                return await db.scalar(
                    select(Feedback).where(Feedback.id == feedback_id)
                )

        record = asyncio.run(fetch())
        self.assertIsNotNone(record)
        assert record is not None
        self.assertIsNotNone(record.screenshot_path)
        assert record.screenshot_path is not None
        self.assertTrue(Path(record.screenshot_path).exists())
        self.assertEqual(Path(record.screenshot_path).read_bytes(), FAKE_IMAGE_BYTES)

    def test_bug_report_screenshot_rejects_non_image(self) -> None:
        response = self.client.post(
            "/api/v1/feedback",
            data={"kind": "bug", "message": "Broken layout"},
            files={"screenshot": ("notes.txt", b"not an image", "text/plain")},
            headers=self.headers,
        )

        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
