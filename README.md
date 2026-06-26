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
- `Dockerfile` + `docker-compose.yml` single-container backend + Cloudflare Tunnel

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

## Frontend-only local preview (no backend, no Telegram)

For finetuning the UI, run the Mini App entirely on browser `localStorage` — no
backend, no bot, no Telegram auth. Task create/edit/done all work; only reminder
delivery (which needs the backend bot/scheduler) is out of scope.

From the repo root:
```powershell
./scripts/preview-frontend.ps1
```
Or directly:
```powershell
cd frontend
npm.cmd run dev:local
```

Then open `http://localhost:5173`. This uses Vite `--mode preview`, which loads
`frontend/.env.preview` (`VITE_LOCAL_PREVIEW=true`); `useTelegramAuth` short-circuits
on that flag with a local stub user. The GitHub Pages production build (mode
`production`) never sets the flag, so the bypass cannot reach prod.

## Deploy backend (Docker + Cloudflare Tunnel on a VPS)

`docker-compose.yml` runs the whole backend — API, Telegram bot poller, and reminder
scheduler — in one self-contained image (migrations applied on start, the three
processes supervised together, logs streamed to `docker logs`). A `cloudflared`
service publishes it at your stable `https://api.<your-domain>` with TLS terminated
at Cloudflare's edge, so no host ports are exposed. This is the shape to deploy on a
VPS such as Hostinger.

1. In the Cloudflare Zero Trust dashboard, create a Tunnel with a public hostname
   (`api.<your-domain>`) whose Service points at `http://backend:8000`, and copy the
   connector token.
2. Copy env and fill values (`BOT_TOKEN`, `JWT_SECRET`, `MINI_APP_URL`, and
   `TUNNEL_TOKEN` = the connector token):
```powershell
Copy-Item .env.example .env
```
3. Build and run:
```powershell
docker compose up -d --build   # build + start
docker compose logs -f         # watch API + bot + scheduler + tunnel
docker compose down            # stop (data persists)
```

SQLite persists in the `pocketmind_data` volume. For hosted use you can override
`DATABASE_URL` to point at managed Postgres — migrations run against it the same way.
The bot and scheduler require a valid `BOT_TOKEN`; without one they stop after a few
retries while the API keeps running.

To run the image directly without the tunnel (e.g. a local smoke test), publish the
port instead:
```powershell
docker build -t pocketmind-backend:latest .
docker run --rm -p 8000:8000 --env-file .env -v pocketmind_data:/app/data pocketmind-backend:latest
```
The API then answers on `http://localhost:8000` (`/health` for a readiness check).

## Current MVP slice

- `/start` sends greeting + Mini App button
- `/app` opens Mini App
- Telegram WebApp auth endpoint: `POST /api/v1/auth/telegram`
- Local-first task CRUD in browser storage with backend sync
- Bot reminder actions merge back into local tasks on next Mini App sync
- Mini App pages: Home, Task list, Create, Detail, Edit
