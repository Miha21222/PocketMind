# Fire up a local, backend-free preview of the PocketMind frontend.
#
# Runs the Telegram Mini App entirely on browser localStorage — no backend, no
# Telegram auth — so the UI can be finetuned at http://localhost:5173.
# Reminder delivery (which needs the backend bot/scheduler) is intentionally
# out of scope here; everything else works offline.
$ErrorActionPreference = "Stop"
$frontend = Join-Path $PSScriptRoot "..\frontend"

Push-Location $frontend
try {
  if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies (first run)..."
    npm.cmd install --cache .npm-cache
  }
  Write-Host "Starting local preview on http://localhost:5173 (Ctrl+C to stop)..."
  npm.cmd run dev:local
} finally {
  Pop-Location
}
