#!/usr/bin/env sh
# Fire up a local, backend-free preview of the PocketMind frontend.
#
# Runs the Telegram Mini App entirely on browser localStorage — no backend, no
# Telegram auth — so the UI can be finetuned at http://localhost:5173.
# Reminder delivery (which needs the backend bot/scheduler) is intentionally
# out of scope here; everything else works offline.
set -e
cd "$(dirname "$0")/../frontend"

if [ ! -d node_modules ]; then
  echo "Installing frontend dependencies (first run)..."
  npm install --cache .npm-cache
fi

echo "Starting local preview on http://localhost:5173 (Ctrl+C to stop)..."
npm run dev:local
