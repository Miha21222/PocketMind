"""Shared isolated database lifecycle for backend tests."""

import asyncio
import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
TEST_DB_PATH = ROOT_DIR / ".tmp_pocketmind_test.db"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_PATH.as_posix()}"
os.environ["ENVIRONMENT"] = "local"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["BOT_TOKEN"] = ""


def pytest_sessionfinish(session, exitstatus) -> None:
    """Dispose the async engine before removing its SQLite files."""
    from app.db.session import close_db

    asyncio.run(close_db())
    for path in (
        TEST_DB_PATH,
        Path(f"{TEST_DB_PATH}-wal"),
        Path(f"{TEST_DB_PATH}-shm"),
    ):
        path.unlink(missing_ok=True)
