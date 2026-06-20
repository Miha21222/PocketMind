#!/usr/bin/env sh
# Entrypoint for the self-contained PocketMind backend image.
#
# Default (no args / "all-in-one"): apply DB migrations once, then run the API,
# bot poller, and scheduler together under supervisord.
#
# Any explicit command (e.g. the multi-service docker-compose overrides, or a
# one-off like `alembic ...`) is executed as-is for backward compatibility.
set -e

# SQLite lives here by default; harmless to create even when using Postgres.
mkdir -p /app/data

if [ "$#" -eq 0 ] || [ "$1" = "all-in-one" ]; then
  echo "[entrypoint] Applying database migrations (alembic upgrade head)..."
  alembic upgrade head
  echo "[entrypoint] Starting API + bot + scheduler under supervisord..."
  exec supervisord -c /app/backend/docker/supervisord.conf
fi

exec "$@"
