# PocketMind

PocketMind is a Telegram Mini App + bot that helps capture tasks quickly and send actionable reminders.

The current default architecture is:

- static frontend on `GitHub Pages`
- local-first task storage in browser `localStorage`
- remote Python backend for Telegram auth, sync, bot delivery, and scheduler
- `SQLite` on the backend host for reminder-oriented synced task data

## Stack

- Backend: FastAPI, SQLAlchemy 2, Alembic, SQLite
- Bot: aiogram 3
- Reminder runner: local APScheduler worker
- Frontend: React + TypeScript + Vite
- Deployment: GitHub Pages (frontend) + remote Python host (backend/worker)

## Repository layout

- `backend/` API, DB models, bot handlers, scheduler worker
- `frontend/` Telegram Mini App UI
- `infra/nginx/` reverse-proxy config
- `docs/archive/` archived plans and old implementation notes

## Production architecture (GitHub Pages + Python host)

- Telegram Mini App frontend is built from `frontend/` and deployed to `GitHub Pages`
- Frontend auth:
  - `POST /api/v1/auth/telegram`
- Frontend sync:
  - `GET /api/v1/sync/bootstrap`
  - `PUT /api/v1/sync/tasks/{client_task_id}`
  - `POST /api/v1/sync/batch`
  - `GET /api/v1/sync/changes`
- Telegram bot runs as a long-polling worker on the backend host
- Reminder dispatch is handled by local APScheduler in the worker process
- Backend task data is reminder-oriented and persisted in `SQLite`

## Deploy backend to a Python host

1. Copy env and set production values:
   - `BOT_TOKEN`
   - `DATABASE_URL` (default SQLite is fine for pet-project VPS use)
   - `JWT_SECRET`
   - `MINI_APP_URL` (GitHub Pages URL)
   - `ENVIRONMENT=production`
2. Run migrations:
```powershell
cd backend
alembic upgrade head
```
3. Run the API process:
```powershell
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
4. Run the worker process in parallel:
```powershell
cd backend
python -m app.scheduler.worker
```
5. Run bot polling as a dedicated process:
```powershell
cd backend
python -m app.bot.main
```

## Deploy frontend to GitHub Pages

1. In GitHub repo settings, enable Pages with GitHub Actions as the source.
2. Add repository variable `VITE_API_BASE_URL=https://<backend-domain>/api/v1`.
3. Push to `main` or run the `Deploy Frontend To GitHub Pages` workflow manually.
4. Set BotFather Mini App URL to your GitHub Pages URL.

## Local development

1. Copy env template:
```powershell
Copy-Item .env.example .env
```
2. Fill required vars in `.env` (`BOT_TOKEN`, `JWT_SECRET`, URLs, secrets).
3. Backend:
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
4. Bot worker:
```powershell
cd backend
python -m app.bot.main
```
5. Scheduler worker:
```powershell
cd backend
python -m app.scheduler.worker
```
6. Frontend:
```powershell
cd frontend
npm.cmd install --cache .npm-cache
npm.cmd run dev
```

## Docker Compose (single VPS)

1. Copy env:
```powershell
Copy-Item .env.example .env
```
2. Put TLS certificates in:
- `infra/nginx/certs/fullchain.pem`
- `infra/nginx/certs/privkey.pem`
3. Start backend + bot + scheduler:
```powershell
docker compose up -d --build
```

The SQLite file is persisted via `pocketmind_data` volume.

## Self-contained single container (all-in-one backend)

The whole backend — API, Telegram bot poller, and reminder scheduler — can run in
one self-contained image. Migrations are applied on start and the three processes
are supervised together; logs stream to `docker logs`. Use this for local testing
and as the hosting shape for the entire backend.

1. Copy env and fill values (`BOT_TOKEN`, `JWT_SECRET`, URLs):
```powershell
Copy-Item .env.example .env
```
2. Build and run with Compose:
```powershell
docker compose -f docker-compose.single.yml up -d --build
docker compose -f docker-compose.single.yml logs -f
docker compose -f docker-compose.single.yml down
```

Or with plain Docker (no Compose):
```powershell
docker build -t pocketmind-backend:latest .
docker run --rm -p 8000:8000 --env-file .env -v pocketmind_data:/app/data pocketmind-backend:latest
```

The API is served on `http://localhost:8000` (`/health` for a readiness check).
SQLite persists in the `pocketmind_data` volume. For hosted use, override
`DATABASE_URL` to point at managed Postgres — migrations run against it the same way.
The bot and scheduler require a valid `BOT_TOKEN`; without one they stop after a few
retries while the API keeps running.

## Current MVP slice

- `/start` sends greeting + Mini App button
- `/app` opens Mini App
- Telegram WebApp auth endpoint: `POST /api/v1/auth/telegram`
- Local-first task CRUD in browser storage with backend sync
- Bot reminder actions merge back into local tasks on next Mini App sync
- Mini App pages: Home, Task list, Create, Detail, Edit
