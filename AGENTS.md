# Repository Guidelines

## CodeGraph

This repo has a live `.codegraph/` index at the root. Use `codegraph_explore` or `codegraph explore` before `rg`, `grep`, or manual source reads for repo code questions, symbol lookup, flow tracing, and pre-edit inspection. Fall back only when CodeGraph is unavailable, stale after edits, or the target is a poor fit such as docs, env files, lockfiles, logs, or exact free-text matching.

## Current Architecture

PocketMind is currently a Telegram Mini App frontend plus a FastAPI backend, Telegram bot, and reminder worker. The frontend is a static Vite build deployed by [`.github/workflows/github-pages.yml`](./.github/workflows/github-pages.yml), and the backend is the API, bot, and scheduler surface used for auth, sync, voice transcription, and reminder delivery.

- Frontend bootstraps from `frontend/src/main.tsx` into `App.tsx`, uses React Router, and currently serves `/`, `/tasks`, `/tasks/new`, `/tasks/:taskId`, `/tasks/:taskId/edit`, and `/settings`.
- Telegram auth runs through `frontend/src/hooks/useTelegramAuth.ts`; `npm.cmd run dev:local` uses Vite mode `preview` to bypass Telegram and the backend for UI-only work, while all env values still come from the single repo-root `.env`.
- Tasks are local-first in browser storage, centered on `frontend/src/features/tasks/`. User preferences are server-owned in `UserPreferences`; synced tasks retain reminder-related snapshots for reminder processing.
- Backend routes currently live under `/api/v1` and include `/auth/telegram`, `/sync/bootstrap`, `/sync/changes`, `/sync/tasks/{client_task_id}`, `/sync/batch`, `/voice/transcribe`, and `/feedback`, plus `/health`.
- In `backend/app/main.py`, local startup auto-creates tables only when `environment == "local"`; production should rely on Alembic migrations.
- Telegram snooze callbacks are handled in `backend/app/bot/handlers/callbacks.py`; reminder messages also link to the Mini App task. Task completion remains frontend-owned, while snoozing updates synced reminder state and cleans up reminder messages.
- `docker-compose.yml` is the current VPS-style deployment shape: one backend image plus `cloudflared`, with SQLite persisted in the `pocketmind_data` volume unless `DATABASE_URL` is overridden.

## Project Structure & Module Organization

`frontend/` contains the Telegram Mini App built with React, TypeScript, and Vite. Main UI code lives in `src/`, with shared UI in `src/components/`, route pages in `src/pages/`, contexts in `src/contexts/`, hooks in `src/hooks/`, API helpers in `src/api/`, and local-first task logic in `src/features/tasks/`. `frontend/public/` holds static assets, and `frontend/tests/` contains small TypeScript regression entrypoints that compile into `.test-dist/`.

`backend/` contains the FastAPI API, aiogram bot, scheduler worker, SQLAlchemy models, and Alembic migrations. Important surfaces are `backend/app/api/v1/` for HTTP routes, `backend/app/services/` for sync/reminder/transcription logic, `backend/app/bot/handlers/` for bot commands and callback actions, and `backend/app/scheduler/` for reminder polling. Repo-level scripts in `scripts/` currently focus on frontend-only local preview.

## Build, Test, and Development Commands

- fill the single repo-root `.env`: backend, Docker Compose, and frontend Vite all read from that same file.
- `cd frontend; npm.cmd install --cache .npm-cache`: install frontend deps.
- `cd frontend; npm.cmd run dev`: run the Mini App locally.
- `cd frontend; npm.cmd run dev:local`: run frontend-only preview with local storage and stub auth.
- `cd frontend; npm.cmd run build`: type-check and build the production frontend bundle.
- `cd frontend; npm.cmd run preview`: serve the built frontend bundle locally.
- `cd frontend; npm.cmd run test:local`: run the TypeScript-based frontend regression tests.
- `./scripts/preview-frontend.ps1`: Windows helper for frontend-only preview from the repo root.
- `cd backend; pip install -r requirements.txt`: install backend deps.
- `cd backend; alembic upgrade head`: apply database migrations.
- `cd backend; uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`: start the API.
- `cd backend; python -m app.bot.main` and `python -m app.scheduler.worker`: run the bot and reminder worker.

## Coding Style & Naming Conventions

Use 4 spaces in Python and 2 spaces in TypeScript/TSX, matching the existing files. Prefer explicit, descriptive names such as `task_sync_service.py`, `TaskListPage.tsx`, and `useTelegramAuth.ts`. Keep React components in PascalCase, hooks in `useX` form, and backend modules snake_case.

Follow the repo's current data ownership rules instead of inventing parallel state models:

- Keep task behavior local-first and sync-oriented; use the existing `UserPreferences` model for server-owned preference changes rather than creating parallel settings state.
- Preserve the task-level reminder snapshot pattern when changing sync payloads, task models, or reminder behavior.

## Testing Guidelines

Backend tests use `unittest` with `fastapi.testclient`; add new files under `backend/tests/` as `test_*.py`. The current backend suite is centered on `test_sync_api.py` and `test_cleanup_surface.py`.

Frontend tests are small TypeScript entrypoints under `frontend/tests/` and are executed by `npm.cmd run test:local`. The current suite covers auth gating, Telegram WebApp helpers, local task behavior, task-create draft persistence, textarea sizing, task navigation, enum state persistence, and recurring dashboard behavior. Add focused regression coverage for sync conflict rules, reminder timing, auth guards, voice upload handling, and task navigation flows when changing those areas.

## Commit & Pull Request Guidelines

Recent commits use short imperative subjects like `Polish PocketMind frontend task UX`. Keep commits scoped and readable. Work on `stage`, not `main`, and verify changes with local preview before calling them ready.

Remember the current release split:

- day-to-day work happens on `stage`
- frontend Pages deployment is wired from `main` in `.github/workflows/github-pages.yml`
- the production-ready point is after the user reviews and merges `stage -> main`

PRs should explain user-visible changes, list commands run, link issues when relevant, and include screenshots for frontend UI changes.
