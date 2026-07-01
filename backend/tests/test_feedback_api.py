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
# Force-disable the notifier regardless of a real BOT_TOKEN in the developer's
# local .env — these tests must never send real messages to the live Telegram
# group, only exercise the "gracefully skip" path.
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
            json={"kind": "rating", "rating": 5, "message": "Loved it"},
            headers=self.headers,
        )

        self.assertEqual(response.status_code, 200)
        feedback_id = response.json()["id"]

        async def fetch() -> Feedback | None:
            async with SessionLocal() as db:
                return await db.scalar(select(Feedback).where(Feedback.id == feedback_id))

        record = asyncio.run(fetch())
        self.assertIsNotNone(record)
        self.assertEqual(record.user_id, self.user_id)
        self.assertEqual(record.kind, FeedbackKind.rating)
        self.assertEqual(record.rating, 5)
        self.assertEqual(record.message, "Loved it")

    def test_submit_bug_report(self) -> None:
        response = self.client.post(
            "/api/v1/feedback",
            json={"kind": "bug", "message": "The delete button does nothing"},
            headers=self.headers,
        )

        self.assertEqual(response.status_code, 200)
        feedback_id = response.json()["id"]

        async def fetch() -> Feedback | None:
            async with SessionLocal() as db:
                return await db.scalar(select(Feedback).where(Feedback.id == feedback_id))

        record = asyncio.run(fetch())
        self.assertIsNotNone(record)
        self.assertEqual(record.kind, FeedbackKind.bug)
        self.assertIsNone(record.rating)
        self.assertEqual(record.message, "The delete button does nothing")

    def test_rating_without_rating_value_is_rejected(self) -> None:
        response = self.client.post(
            "/api/v1/feedback",
            json={"kind": "rating"},
            headers=self.headers,
        )

        self.assertEqual(response.status_code, 422)

    def test_bug_report_without_message_is_rejected(self) -> None:
        response = self.client.post(
            "/api/v1/feedback",
            json={"kind": "bug"},
            headers=self.headers,
        )

        self.assertEqual(response.status_code, 422)

    def test_upload_screenshot_success(self) -> None:
        create_response = self.client.post(
            "/api/v1/feedback",
            json={"kind": "bug", "message": "Broken layout"},
            headers=self.headers,
        )
        feedback_id = create_response.json()["id"]

        response = self.client.post(
            f"/api/v1/feedback/{feedback_id}/screenshot",
            files={"file": ("screenshot.png", FAKE_IMAGE_BYTES, "image/png")},
            headers=self.headers,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])

        async def fetch() -> Feedback | None:
            async with SessionLocal() as db:
                return await db.scalar(select(Feedback).where(Feedback.id == feedback_id))

        record = asyncio.run(fetch())
        self.assertIsNotNone(record.screenshot_path)
        self.assertTrue(Path(record.screenshot_path).exists())
        self.assertEqual(Path(record.screenshot_path).read_bytes(), FAKE_IMAGE_BYTES)

    def test_upload_screenshot_rejects_non_image(self) -> None:
        create_response = self.client.post(
            "/api/v1/feedback",
            json={"kind": "bug", "message": "Broken layout"},
            headers=self.headers,
        )
        feedback_id = create_response.json()["id"]

        response = self.client.post(
            f"/api/v1/feedback/{feedback_id}/screenshot",
            files={"file": ("notes.txt", b"not an image", "text/plain")},
            headers=self.headers,
        )

        self.assertEqual(response.status_code, 400)

    def test_upload_screenshot_missing_feedback_returns_404(self) -> None:
        response = self.client.post(
            "/api/v1/feedback/999999/screenshot",
            files={"file": ("screenshot.png", FAKE_IMAGE_BYTES, "image/png")},
            headers=self.headers,
        )

        self.assertEqual(response.status_code, 404)

    def test_upload_screenshot_rejects_other_users_feedback(self) -> None:
        create_response = self.client.post(
            "/api/v1/feedback",
            json={"kind": "bug", "message": "Broken layout"},
            headers=self.headers,
        )
        feedback_id = create_response.json()["id"]

        async def seed_other_user() -> User:
            async with SessionLocal() as db:
                other = User(telegram_id=20002, username="someone_else", language_code="en")
                db.add(other)
                await db.commit()
                await db.refresh(other)
                return other

        other_user = asyncio.run(seed_other_user())
        other_token = create_access_token(subject=str(other_user.id))

        response = self.client.post(
            f"/api/v1/feedback/{feedback_id}/screenshot",
            files={"file": ("screenshot.png", FAKE_IMAGE_BYTES, "image/png")},
            headers={"Authorization": f"Bearer {other_token}"},
        )

        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
