import os
import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient


ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

TEST_DB_PATH = ROOT_DIR / ".tmp_cleanup_surface_test.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_PATH.as_posix()}"
os.environ["ENVIRONMENT"] = "local"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["BOT_TOKEN"] = ""

from app.bot.keyboards import reminder_keyboard
from app.main import app


class CleanupSurfaceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.client.close()

    def test_backend_root_redirects_to_telegram_launch(self) -> None:
        response = self.client.get("/", follow_redirects=False)
        self.assertEqual(response.status_code, 303)
        self.assertEqual(response.headers["location"], "/launch?next=%2F")

    def test_launch_renders_telegram_gate(self) -> None:
        response = self.client.get("/launch?next=/tasks/task-uuid-123")
        self.assertEqual(response.status_code, 200)
        self.assertIn("task-uuid-123", response.text)

    def test_legacy_task_api_is_gone(self) -> None:
        response = self.client.get("/api/v1/tasks")
        self.assertEqual(response.status_code, 404)

    def test_internal_cron_api_is_gone(self) -> None:
        response = self.client.get("/api/v1/internal/cron/reminders")
        self.assertEqual(response.status_code, 404)

    def test_settings_api_is_gone(self) -> None:
        # Settings now live entirely in the client's localStorage; the backend
        # exposes no settings surface.
        self.assertEqual(self.client.get("/api/v1/settings/me").status_code, 404)
        self.assertEqual(
            self.client.patch("/api/v1/settings/me", json={}).status_code, 404
        )

    def test_local_cors_allows_frontend_preview_origin(self) -> None:
        response = self.client.options(
            "/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertEqual(
            response.headers.get("access-control-allow-origin"), "http://localhost:5173"
        )

    def test_cors_does_not_reflect_unknown_origin(self) -> None:
        response = self.client.options(
            "/health",
            headers={
                "Origin": "https://evil.example",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertIsNone(response.headers.get("access-control-allow-origin"))

    def test_reminder_open_button_uses_client_task_id(self) -> None:
        keyboard = reminder_keyboard(
            task_id=77,
            open_task_id="task-uuid-123",
            lang="en",
            default_snooze_minutes=15,
        )
        open_row = keyboard.inline_keyboard[-1][0]
        web_app = open_row.web_app
        if web_app is None:
            self.fail("The reminder open button must include a Telegram Web App link")
        self.assertTrue(web_app.url.endswith("/tasks/task-uuid-123"))

    def test_reminder_keyboard_has_no_done_button(self) -> None:
        # Completion now only happens in-app; the Telegram keyboard must never
        # offer a "done" action, for the default, waiting, and recurring variants.
        for kwargs in (
            {"waiting": False, "recurring": False},
            {"waiting": True, "recurring": False},
            {"waiting": False, "recurring": True},
        ):
            keyboard = reminder_keyboard(
                task_id=77,
                open_task_id="task-uuid-123",
                lang="en",
                default_snooze_minutes=15,
                **kwargs,
            )
            buttons = [button for row in keyboard.inline_keyboard for button in row]
            self.assertEqual(len(keyboard.inline_keyboard), 2, kwargs)
            self.assertTrue(
                all(
                    (button.callback_data or "") != "task:77:done" for button in buttons
                ),
                kwargs,
            )
