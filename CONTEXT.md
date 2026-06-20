# PocketMind Project Context

This file is a handoff note for agents collaborating on this repository. Treat it as the current project map, not as an archive of older plans.

## Current Goal

PocketMind is a Telegram Mini App plus Telegram bot for quickly capturing tasks and receiving actionable reminders.

The current architecture is intentionally small and local-first:

- Static frontend hosted on GitHub Pages.
- Telegram-only access through Telegram WebApp `initData`.
- Full task data is owned by the frontend and stored in browser `localStorage`.
- Backend stores only the reminder-oriented subset needed for sync, bot actions, and scheduler execution.
- Backend runtime is split into separate processes for API, bot polling, and scheduler.
- SQLite is the default backend storage for the current pet-project scope.

Do not reintroduce the old backend-owned task CRUD flow or Vercel/serverless deployment shape unless the user explicitly asks for a new architecture.

## Repository Layout

- `frontend/`: React + TypeScript + Vite Telegram Mini App.
- `backend/`: FastAPI API, SQLAlchemy models, Alembic migrations, aiogram bot, APScheduler worker.
- `infra/nginx/`: nginx configs for local/prod reverse proxy.
- `docs/archive/`: old plans and deployment notes kept for reference only.
- `.github/workflows/github-pages.yml`: GitHub Pages deployment workflow for the frontend.
- `Dockerfile`, `docker-compose.yml`, `docker-compose.local.yml`: backend/bot/scheduler/proxy deployment support.
- `README.md`: concise user-facing run/deploy instructions.

## Active Architecture

Frontend is the primary source of truth for full task content.

Backend is a sync and reminder service. It validates Telegram identity, maps Telegram users to internal users, stores reminder-relevant task data, sends reminders, and records bot-originated changes that the frontend can merge later.

Runtime processes:

- API process: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Bot process: `python -m app.bot.main`
- Scheduler process: `python -m app.scheduler.worker`

These processes share the same SQLite database file through `DATABASE_URL`.

## Frontend

Frontend stack:

- React 18
- TypeScript
- Vite
- React Router
- TanStack Query
- Tailwind CSS

Important frontend files:

- `frontend/src/api/client.ts`: API base URL and bearer-token request wrapper.
- `frontend/src/api/auth.ts`: Telegram auth API call.
- `frontend/src/api/settings.ts`: user settings API calls.
- `frontend/src/api/sync.ts`: sync API calls.
- `frontend/src/api/tasks.ts`: compatibility facade used by pages; it now delegates to local storage, not backend CRUD.
- `frontend/src/features/tasks/localTaskRepository.ts`: localStorage repository plus push/bootstrap sync behavior.
- `frontend/src/features/tasks/localTasks.ts`: local task creation, timing, recurrence-lite behavior, and remote merge logic.
- `frontend/src/features/tasks/cache.ts`: task cache/bootstrap integration.
- `frontend/src/types/task.ts`: local task and sync record contracts.
- `frontend/src/hooks/useTelegramAuth.ts`: Telegram WebApp auth bootstrap.

Local storage key:

- `pocketmind.tasks.v2`

Frontend auth flow:

1. `useTelegramAuth` reads `window.Telegram.WebApp.initData`.
2. It falls back to `tgWebAppData` in URL search/hash.
3. In dev only, it may use `VITE_DEV_INIT_DATA`.
4. It calls `POST /api/v1/auth/telegram`.
5. It stores the returned JWT in memory through `setAuthToken`.

Frontend task flow:

1. User creates/edits/deletes a task locally.
2. Full task state is written to `localStorage`.
3. Reminder-relevant fields are pushed to backend sync endpoints.
4. If backend is unavailable, local editing still works.
5. On app start, frontend bootstraps from backend and merges remote bot/scheduler changes into local state.

Task ids are strings on the frontend. `LocalTask.id` is the stable `client_task_id` used for cross-surface sync and Mini App task URLs.

## Backend

Backend stack:

- FastAPI
- SQLAlchemy 2 async
- Alembic
- SQLite via `sqlite+aiosqlite`
- aiogram 3
- APScheduler
- Pydantic settings

Active public API routers are mounted under `/api/v1`:

- `POST /api/v1/auth/telegram`
- `GET /api/v1/settings/me`
- `PATCH /api/v1/settings/me`
- `GET /api/v1/sync/bootstrap`
- `GET /api/v1/sync/changes?since=...`
- `PUT /api/v1/sync/tasks/{client_task_id}`
- `DELETE /api/v1/sync/tasks/{client_task_id}`
- `POST /api/v1/sync/batch`

The backend root no longer serves the frontend. `/health` is the health endpoint. Old `/api/v1/tasks` and old internal cron/webhook surfaces are not part of the active architecture.

Important backend files:

- `backend/app/main.py`: FastAPI app, CORS, router mounting, local metadata bootstrap.
- `backend/app/api/v1/__init__.py`: active API router registration.
- `backend/app/api/v1/auth.py`: Telegram initData validation and JWT issuing.
- `backend/app/api/v1/settings.py`: persisted per-user app/bot defaults.
- `backend/app/api/v1/sync.py`: sync endpoints.
- `backend/app/schemas/sync.py`: sync request/response contracts.
- `backend/app/services/task_sync_service.py`: sync payload application, UTC normalization, sync record serialization.
- `backend/app/models/task.py`: task model, including `client_task_id` and `deleted_at`.
- `backend/app/models/user.py`: Telegram user and settings fields.
- `backend/app/services/task_service.py`: due-task selection for scheduler.
- `backend/app/services/reminder_runner.py`: one scheduler cycle.
- `backend/app/services/reminder_service.py`: reminder message creation/sending.
- `backend/app/services/task_actions.py`: bot actions such as done and snooze.
- `backend/app/bot/main.py`: long-polling bot entrypoint.
- `backend/app/bot/handlers/callbacks.py`: inline reminder button callbacks.
- `backend/app/scheduler/worker.py`: APScheduler worker entrypoint.

## Data And Sync Model

Frontend local task fields include UI/full-task data:

- `id`
- `title`
- `description`
- `type`
- `status`
- `deadline_at`
- `remind_at`
- `reminder_mode`
- `reminder_time_local`
- `reminder_interval_hours`
- `snoozed_until`
- `recurrence_rule`
- `created_at`
- `updated_at`
- `completed_at`
- `cancelled_at`
- `last_reminded_at`
- `deleted_at`

Backend synced task data is stored in the existing `tasks` table, but only the reminder-relevant subset should be treated as backend-owned. `client_task_id` is unique per user and is the bridge between local tasks and backend rows.

Merge rule:

- `client_task_id` identifies the same task across frontend and backend.
- Newer `updated_at` wins for reminder-relevant fields.
- Backend-originated bot changes should update status/reminder fields, not arbitrary local-only UI state.
- Deleted tasks use soft delete through `deleted_at`.
- Be careful with SQLite datetime behavior; sync code normalizes datetimes to UTC before comparisons.

Current implementation nuance:

- Mini App task open URLs use `client_task_id`.
- Bot callback payloads still use internal numeric `Task.id` for done/snooze callbacks.
- Do not assume callback ids and frontend route ids are the same.

## Bot And Scheduler

Bot behavior:

- `backend/app/bot/main.py` runs long polling.
- `/start` and `/app` expose the Mini App button when `MINI_APP_URL` is a valid HTTPS URL.
- Reminder messages include inline buttons for done/snooze and optionally opening the Mini App task route.
- Callback actions mutate backend synced task rows, then the frontend sees those changes on the next sync/bootstrap.

Scheduler behavior:

- `backend/app/scheduler/worker.py` runs APScheduler.
- It calls `process_due_tasks_once` on an interval from `SCHEDULER_POLL_INTERVAL_SECONDS`.
- It also runs one immediate cycle at startup.
- Reminder data survives worker restarts because it is stored in SQLite.

## Settings And Environment

Environment variables are documented in `.env.example`:

- `BOT_TOKEN`
- `DATABASE_URL`
- `MINI_APP_URL`
- `TUNNEL_PUBLIC_URL`
- `JWT_SECRET`
- `JWT_EXPIRE_MINUTES`
- `ENVIRONMENT`
- `DEFAULT_TIMEZONE`
- `SCHEDULER_POLL_INTERVAL_SECONDS`

Config is loaded by `backend/app/core/config.py` from either root `.env` or `backend/.env`.

Production expectations:

- `MINI_APP_URL` should be the GitHub Pages URL.
- `VITE_API_BASE_URL` should point to the backend API prefix, for example `https://backend.example.com/api/v1`.
- Telegram Mini App URL must be HTTPS.
- For local development, `MINI_APP_URL=http://localhost:5173` is acceptable for non-Telegram browser work, but Telegram Mini App launch requires a real HTTPS URL or tunnel.

## Deployment

Frontend deployment:

- Workflow: `.github/workflows/github-pages.yml`
- Trigger: push to `main` affecting `frontend/**` or the workflow file, plus manual `workflow_dispatch`.
- Node version: 22
- Build command: `npm run build`
- Output: `frontend/dist`
- Pages base path is currently `VITE_BASE_PATH=/PocketMind/`.
- GitHub repository variable required: `VITE_API_BASE_URL`.

If the GitHub repository name changes, update `VITE_BASE_PATH` in the workflow. A stale base path will break static asset routing on Pages.

Backend deployment:

- `docker-compose.yml` runs `backend`, `bot`, `scheduler`, and `proxy`.
- All Python service containers use the same image and SQLite volume.
- nginx production config lives in `infra/nginx/default.conf`.
- Local compose uses `docker-compose.local.yml` and `infra/nginx/local.conf`.

## Local Development Commands

Backend API:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Bot:

```powershell
cd backend
python -m app.bot.main
```

Scheduler:

```powershell
cd backend
python -m app.scheduler.worker
```

Frontend:

```powershell
cd frontend
npm.cmd install --cache .npm-cache
npm.cmd run dev
```

Docker:

```powershell
docker compose up -d --build
```

## Verification Commands

Backend tests:

```powershell
python -m unittest backend.tests.test_sync_api backend.tests.test_cleanup_surface -v
```

Frontend local task tests:

```powershell
npm.cmd --prefix frontend run test:local
```

Frontend build:

```powershell
npm.cmd --prefix frontend run build
```

## Known Cleanup Decisions

The old Vercel/serverless shape has been intentionally removed:

- No `vercel.json`.
- No root `api/index.py`.
- No old Vercel cron workflow.
- Backend no longer mounts the frontend bundle.
- Full backend task CRUD is no longer the primary UI path.

Keep obsolete plans and runbooks in `docs/archive/` if they are useful for history. Do not treat archived files as current instructions when they conflict with this context, `README.md`, or active source code.

## Agent Guardrails

- Read `AGENTS.md` before non-trivial changes.
- Preserve the local-first architecture unless the user explicitly changes direction.
- Use existing modules before adding new abstractions.
- Keep task ids string-based in frontend and sync contracts.
- Do not store secrets in source files.
- Do not reintroduce backend-owned full task state for UI convenience.
- Do not rely on Vercel-specific deployment assumptions.
- Use Alembic for schema changes.
- Use focused tests when changing sync, auth, reminder scheduling, bot callbacks, or repository cleanup boundaries.
- If `git status` fails with dubious ownership under the Codex sandbox user, do not treat that as project corruption; it is a local Git safety check. Ask before changing global Git config.
