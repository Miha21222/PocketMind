import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient


ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.bot.keyboards import reminder_keyboard
from app.main import app


class CleanupSurfaceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.client.close()

    def test_backend_root_does_not_serve_spa(self) -> None:
        response = self.client.get("/")
        self.assertEqual(response.status_code, 404)

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
        self.assertEqual(self.client.patch("/api/v1/settings/me", json={}).status_code, 404)

    def test_local_cors_allows_frontend_preview_origin(self) -> None:
        response = self.client.options(
            "/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertEqual(response.headers.get("access-control-allow-origin"), "http://localhost:5173")

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
        keyboard = reminder_keyboard(task_id=77, open_task_id="task-uuid-123", lang="en", default_snooze_minutes=15)
        open_row = keyboard.inline_keyboard[-1][0]
        self.assertTrue(open_row.web_app.url.endswith("/tasks/task-uuid-123"))
