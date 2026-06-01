# PocketMind

PocketMind is a Telegram Mini App + bot that helps capture tasks quickly and send actionable reminders.

## Stack

- Backend: FastAPI, SQLAlchemy 2, Alembic, Neon Postgres
- Bot: aiogram 3
- Reminder runner: Vercel Cron -> `/api/v1/internal/cron/reminders`
- Frontend: React + TypeScript + Vite
- Deployment: Vercel (frontend + backend)

## Repository layout

- `backend/` API, DB models, bot handlers, cron/webhook endpoints
- `frontend/` Telegram Mini App UI
- `deploy/nginx/` reverse-proxy config

## Production architecture (Vercel + Neon)

- Telegram updates are delivered via webhook endpoint:
  - `POST /api/v1/internal/telegram/webhook/{TELEGRAM_WEBHOOK_SECRET}`
- Reminder dispatch is triggered by Vercel Cron:
  - `GET /api/v1/internal/cron/reminders`
- Both webhook and cron are protected by secrets:
  - `TELEGRAM_WEBHOOK_SECRET`
  - `CRON_SECRET`
- `DATABASE_URL` must point to Neon via async driver:
  - `postgresql+asyncpg://...?ssl=require`
- On Vercel Hobby plan, cron can run only once per day.

## Deploy backend to Vercel

1. Create a Vercel project with root directory `backend/`.
2. Set environment variables in that backend project:
   - `BOT_TOKEN`
   - `DATABASE_URL` (Neon, `postgresql+asyncpg://...`)
   - `JWT_SECRET`
   - `APP_BASE_URL` (backend Vercel URL)
   - `MINI_APP_URL` (frontend Vercel URL)
   - `TELEGRAM_WEBHOOK_SECRET`
   - `CRON_SECRET`
   - `ENVIRONMENT=production`
3. Deploy backend project.
4. Run migrations against Neon:
```powershell
cd backend
alembic upgrade head
```
5. Set Telegram webhook:
```powershell
$url = "https://<backend-domain>/api/v1/internal/telegram/webhook/<TELEGRAM_WEBHOOK_SECRET>"
Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$env:BOT_TOKEN/setWebhook" -Body @{
  url = $url
  secret_token = "<TELEGRAM_WEBHOOK_SECRET>"
}
```

## Deploy frontend to Vercel

1. Create a Vercel project with root directory `frontend/`.
2. Set `VITE_API_BASE_URL=https://<backend-domain>/api/v1`.
3. Deploy frontend project.
4. Set BotFather Mini App URL to `https://<frontend-domain>`.

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
4. Bot worker (long polling for local only):
```powershell
cd backend
python -m app.bot.main
```
5. Scheduler worker (local only):
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
- `deploy/nginx/certs/fullchain.pem`
- `deploy/nginx/certs/privkey.pem`
3. Start:
```powershell
docker compose up -d --build
```

The SQLite file is persisted via `pocketmind_data` volume.

Detailed runbook:

- `DEPLOYMENT_AND_LOCAL_RUN_PLAN.md` (full local run + VPS deployment + smoke checklists)

## Local Docker (all services + tunnel)

Run everything in containers locally (backend + bot + scheduler + proxy + tunnel):

```powershell
docker compose -f docker-compose.local.yml up -d --build
docker compose -f docker-compose.local.yml logs tunnel --tail=50
```

Take the printed HTTPS tunnel URL and set:

- `.env`: `APP_BASE_URL` and `MINI_APP_URL`
- BotFather Mini App URL

Then restart:

```powershell
docker compose -f docker-compose.local.yml up -d
```

## Current MVP slice

- `/start` sends greeting + Mini App button
- `/app` opens Mini App
- Telegram WebApp auth endpoint: `POST /api/v1/auth/telegram`
- Task CRUD + actions (`done`, `cancel`, `snooze`, `reschedule`)
- Reminder runner sends reminders with inline actions
- Mini App pages: Home, Task list, Create, Detail, Edit
