"""Regression tests for Alembic upgrade paths."""

import os
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
HEAD_REVISION = "20260813_0012"
BASELINE_REVISION = "20260601_0004"


class AlembicMigrationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "migration.db"

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def upgrade(self, revision: str) -> None:
        environment = os.environ.copy()
        environment.update(
            {
                "DATABASE_URL": f"sqlite+aiosqlite:///{self.db_path.as_posix()}",
                "ENVIRONMENT": "production",
                "JWT_SECRET": "migration-test-secret",
                "BOT_TOKEN": "migration-test-token",
            }
        )
        subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", revision],
            cwd=BACKEND_DIR,
            env=environment,
            check=True,
            capture_output=True,
            text=True,
        )

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.db_path)
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def assert_at_head(self) -> None:
        with self.connection() as connection:
            revision = connection.execute(
                "SELECT version_num FROM alembic_version"
            ).fetchone()
            tables = {
                row[0]
                for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table'"
                )
            }
        self.assertEqual(revision, (HEAD_REVISION,))
        self.assertIn("user_preferences", tables)

    def test_empty_database_upgrades_to_head(self) -> None:
        self.upgrade("head")
        self.assert_at_head()

    def test_baseline_database_upgrades_and_backfills_preferences(self) -> None:
        self.upgrade(BASELINE_REVISION)
        with self.connection() as connection:
            connection.execute(
                """
                INSERT INTO users (
                    telegram_id, language_code, created_at, updated_at, last_seen_at
                ) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                (123456789, "uk-UA"),
            )

        self.upgrade("head")
        self.assert_at_head()
        with self.connection() as connection:
            preferences = connection.execute(
                "SELECT language, timezone, haptics_enabled FROM user_preferences"
            ).fetchone()
        self.assertEqual(preferences, ("uk", "Europe/Kyiv", 1))
