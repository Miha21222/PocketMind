# PocketMind

PocketMind is a Telegram Mini App plus backend services for capturing tasks quickly and delivering actionable reminders.

The current repo shape is:

- a static React + TypeScript + Vite frontend in `frontend/`
- a FastAPI backend in `backend/`
- an aiogram bot worker for Telegram delivery
- an APScheduler worker for reminder polling
- a local-first task model where the browser is the primary task editor and the backend stores synced reminder-oriented state

## Architecture

The current production split is:

- frontend deployed as a static site through GitHub Pages
- backend API exposed separately and used for Telegram auth, task sync, health checks, and voice transcription
- Telegram bot running as a long-polling worker
- reminder scheduler running as a separate worker process
- SQLite as the default backend store, with `DATABASE_URL` override support for other databases

Important current behavior:

- frontend tasks live locally first and sync through `/api/v1/sync/*`
- frontend settings stay client-side in `localStorage`
- reminder-related settings travel with each synced task as a snapshot instead of being stored as backend user settings
- `LocalTask.id` is the stable frontend `client_task_id` used by sync routes, while bot callback actions use the backend's numeric `Task.id`

## Current API Surface

Active backend routes currently include:

- `GET /health`
- `POST /api/v1/auth/telegram`
- `GET /api/v1/sync/bootstrap`
- `GET /api/v1/sync/changes`
- `PUT /api/v1/sync/tasks/{client_task_id}`
- `DELETE /api/v1/sync/tasks/{client_task_id}`
- `POST /api/v1/sync/batch`
- `POST /api/v1/voice/transcribe`

## Repository Layout

- `frontend/`: Telegram Mini App UI, React Router pages, local task logic, client sync helpers, and frontend regression tests
- `backend/`: FastAPI app, SQLAlchemy models, sync/reminder services, bot handlers, scheduler worker, Alembic migrations, and backend tests
- `scripts/`: local preview helpers, currently including `preview-frontend.ps1` and `preview-frontend.sh`
- `.github/workflows/github-pages.yml`: frontend Pages build and deploy workflow
- `docker-compose.yml`: VPS-oriented backend deployment using one backend image plus `cloudflared`

## Stack

- Frontend: React 18, TypeScript, Vite, React Router, TanStack Query
- Backend: FastAPI, SQLAlchemy 2, Alembic
- Bot: aiogram 3
- Scheduler: APScheduler
- Speech-to-text: faster-whisper
- Default database: SQLite

## Environment

The repo now uses one root `.env` file as the single env source for local work and VPS deployment.

- `docker compose` reads the root `.env` for variable substitution
- the backend imports the same root `.env`
- the frontend Vite config reads that same root `.env` from `frontend/` via `envDir`

Important backend/runtime variables in the root `.env`:

- `BOT_TOKEN`
- `DATABASE_URL`
- `MINI_APP_URL`
- `CORS_ALLOWED_ORIGINS`
- `TUNNEL_PUBLIC_URL`
- `TUNNEL_TOKEN`
- `JWT_SECRET`
- `JWT_EXPIRE_MINUTES`
- `ENVIRONMENT`
- `DEFAULT_TIMEZONE`
- `SCHEDULER_POLL_INTERVAL_SECONDS`

Important frontend-facing variables in the same root `.env`:

- `VITE_API_BASE_URL`: backend base URL including `/api/v1`
- `VITE_BASE_PATH`: deploy sub-path; keep `/` locally and let CI or production override if needed
- `VITE_DEV_INIT_DATA`: optional browser-only Telegram init data for development outside Telegram
- `VITE_LOCAL_PREVIEW`: optional manual override for local-only mode

## Local Development

1. Fill the required values in the root `.env`.

2. Start the backend API:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

3. In separate terminals, start the bot and scheduler:

```powershell
cd backend
python -m app.bot.main
```

```powershell
cd backend
python -m app.scheduler.worker
```

4. Start the frontend:

```powershell
cd frontend
npm.cmd install --cache .npm-cache
npm.cmd run dev
```

The frontend boots from `frontend/src/main.tsx`, initializes the Telegram WebApp bridge with `ready()` and `expand()`, and mounts React Router with a basename derived from `import.meta.env.BASE_URL`.

## Frontend-Only Preview

For UI work that does not need Telegram auth, the backend, or live reminder delivery:

```powershell
./scripts/preview-frontend.ps1
```

Or:

```powershell
cd frontend
npm.cmd run dev:local
```

This mode:

- runs fully on browser `localStorage`
- uses the stub auth branch in `useTelegramAuth`
- is triggered by the Vite mode used by `npm run dev:local`
- is safe for UI polishing because the production Pages build does not load that preview mode

## Tests

Frontend regression suite:

```powershell
cd frontend
npm.cmd run test:local
```

Frontend build check:

```powershell
cd frontend
npm.cmd run build
```

Backend tests:

```powershell
cd backend
python -m unittest discover -s tests -p "test_*.py"
```

Current frontend tests cover local task logic, auth gating, Telegram WebApp helpers, task-create draft behavior, textarea sizing, task navigation, persistent enum state, and recurring dashboard behavior. Current backend tests are centered on sync API behavior and cleanup surfaces.

## Deployment

### Frontend

The frontend deploys through GitHub Pages using `.github/workflows/github-pages.yml`.

- the workflow builds on pushes to `main` that touch `frontend/**` or the Pages workflow itself
- it injects `VITE_BASE_PATH=/PocketMind/`
- it expects the repository variable `VITE_API_BASE_URL`

After deployment, the BotFather Mini App URL should point at the published Pages URL.

### Backend on a VPS

`docker-compose.yml` is the current hosted deployment shape:

- `backend` service builds the image from this repo
- `cloudflared` publishes it through a Cloudflare Tunnel
- SQLite persists in the `pocketmind_data` volume by default

Typical flow:

```powershell
docker compose up -d --build
docker compose logs -f
```

The API is exposed internally on port `8000`, and `/health` is the basic readiness endpoint.

For non-Docker hosting, you can still run the API, bot, and scheduler as separate processes with the commands from the local development section, but production should use Alembic migrations rather than relying on local startup table creation.

## Git Workflow

Current repo workflow for ongoing work:

- make changes on `stage`
- verify locally before calling changes ready
- keep using the existing `stage -> main` integration flow
- treat production readiness as after the user reviews and merges `stage` into `main`

The GitHub Pages deploy workflow listens to `main`, so merge timing controls when frontend changes are eligible for production deployment.

## Current User-Facing Scope

The current app includes:

- dashboard and task list views
- task create, detail, and edit flows
- multiple task types including quick, deadline, recurring, waiting, and no-deadline tasks
- Telegram-authenticated sync with backend conflict checks based on `updated_at`
- reminder actions from Telegram for done and snooze flows
- voice transcription endpoint support on the backend
