# PocketMind: Local Run And Vercel Deployment Plan

## 1. Goal

Bring PocketMind to a stable state in two environments:

- local development (Windows PowerShell);
- Vercel + Neon production deployment.

The expected final flow is:

`/start` -> `/app` -> Mini App opens -> create task -> reminder fires -> `Done/+15 min/Cancel/Reschedule` works.

## 1.1 Production architecture (Vercel + Neon)

- Backend is deployed as a FastAPI Vercel Function.
- Telegram updates are delivered to:
  - `/api/v1/internal/telegram/webhook/{TELEGRAM_WEBHOOK_SECRET}`
- Reminder processing is triggered by Vercel Cron:
  - `/api/v1/internal/cron/reminders`
- DB is Neon Postgres (`postgresql+asyncpg://...`).
- Local polling/scheduler processes are kept only for local run mode.

## 2. Prerequisites

## 2.1 Local

- Python 3.12+
- Node.js 20+ (or 22+)
- Telegram bot token from BotFather

## 2.2 Vercel + Neon

- Vercel account and project access
- Neon Postgres project
- Telegram bot token from BotFather

## 3. Environment Variables

Copy template first:

```powershell
Copy-Item .env.example .env
```

Required fields:

- `BOT_TOKEN`
- `DATABASE_URL`
- `APP_BASE_URL`
- `MINI_APP_URL`
- `JWT_SECRET`
- `TELEGRAM_WEBHOOK_SECRET`
- `CRON_SECRET`

Recommended values:

## 3.1 Local development

- `DATABASE_URL=sqlite+aiosqlite:///./data/pocketmind.db`
- `APP_BASE_URL=http://localhost:8000`
- `MINI_APP_URL=http://localhost:5173`
- `ENVIRONMENT=local`

## 3.2 Vercel + Neon deployment

- `DATABASE_URL=postgresql+asyncpg://<user>:<password>@<neon-host>/<db>?ssl=require`
- `APP_BASE_URL=https://<backend-domain>.vercel.app`
- `MINI_APP_URL=https://<frontend-domain>.vercel.app`
- `TELEGRAM_WEBHOOK_SECRET=<strong-random-token>`
- `CRON_SECRET=<strong-random-token>`
- `ENVIRONMENT=production`

## 4. Local Run Plan

## 4.0 Local Docker Run (Single Command + Tunnel)

Use this mode when you want to avoid running backend/bot/scheduler/frontend manually.

1. Copy env and set required values:

```powershell
Copy-Item .env.example .env
```

Required in `.env`:

- `BOT_TOKEN`
- `JWT_SECRET`

Then start stack (backend + bot + scheduler + proxy + tunnel):

```powershell
docker compose -f docker-compose.local.yml up -d --build
```
2. Get public HTTPS tunnel URL:

```powershell
docker compose -f docker-compose.local.yml logs tunnel --tail=50
```

Find line like:

`your url is: https://xxxx.loca.lt`

3. Put this HTTPS URL into:

- `.env` -> `APP_BASE_URL=https://xxxx.loca.lt`
- `.env` -> `MINI_APP_URL=https://xxxx.loca.lt`
- BotFather Mini App URL

4. Restart services after `.env` update:

```powershell
docker compose -f docker-compose.local.yml up -d
```

5. Smoke checks:

```powershell
docker compose -f docker-compose.local.yml ps
docker compose -f docker-compose.local.yml logs backend --tail=100
docker compose -f docker-compose.local.yml logs bot --tail=100
docker compose -f docker-compose.local.yml logs scheduler --tail=100
```

Notes:

- local mode uses `deploy/nginx/local.conf` (HTTP inside Docker only);
- Telegram sees HTTPS because tunnel URL is HTTPS;
- tunnel URL may change after restart, so update `.env` + BotFather when it changes.

## 4.1 Backend API

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

Expected:

```json
{"status":"ok"}
```

## 4.2 Bot Worker

In a new terminal:

```powershell
cd backend
.venv\Scripts\Activate.ps1
python -m app.bot.main
```

## 4.3 Scheduler Worker (APScheduler)

In a third terminal:

```powershell
cd backend
.venv\Scripts\Activate.ps1
python -m app.scheduler.worker
```

## 4.4 Frontend Mini App

```powershell
cd frontend
npm.cmd install --cache .npm-cache
npm.cmd run dev
```

## 4.5 Local Smoke Checklist

1. Open bot chat and run `/start`.
2. Run `/app` and verify Mini App button.
3. Open Mini App and authenticate via Telegram initData.
4. Create task with `remind_at` in near future.
5. Wait for reminder.
6. Verify buttons:
   - `Done` updates status;
   - `+15 min` moves reminder;
   - `Cancel` blocks future reminders;
   - `Reschedule` updates reminder time.

## 5. Vercel + Neon Deployment Plan

## 5.1 Neon setup

1. Create or open Neon project.
2. Get connection string for production branch.
3. Set backend `DATABASE_URL` as:
   - `postgresql+asyncpg://...?ssl=require`
4. Run migrations:

```powershell
cd backend
alembic upgrade head
```

## 5.2 Backend deployment (Vercel project, root `backend/`)

1. Create Vercel project with root directory `backend`.
2. Set environment variables:
   - `BOT_TOKEN`
   - `DATABASE_URL`
   - `APP_BASE_URL`
   - `MINI_APP_URL`
   - `JWT_SECRET`
   - `TELEGRAM_WEBHOOK_SECRET`
   - `CRON_SECRET`
   - `ENVIRONMENT=production`
3. Deploy.
4. Verify:
   - `GET https://<backend-domain>/health` -> `{"status":"ok"}`
   - `GET https://<backend-domain>/api/v1/internal/cron/reminders` returns 401 without auth header.

## 5.3 Frontend deployment (Vercel project, root `frontend/`)

1. Create Vercel project with root directory `frontend`.
2. Set:
   - `VITE_API_BASE_URL=https://<backend-domain>/api/v1`
3. Deploy and verify app loads.

## 5.4 Telegram webhook setup

Set webhook after backend deploy:

```powershell
$secret = "<TELEGRAM_WEBHOOK_SECRET>"
$url = "https://<backend-domain>/api/v1/internal/telegram/webhook/$secret"
Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$env:BOT_TOKEN/setWebhook" -Body @{
  url = $url
  secret_token = $secret
}
```

## 5.5 Production smoke checklist

1. `/start` returns greeting + Mini App button.
2. `/app` opens Mini App.
3. Mini App auth works (`POST /api/v1/auth/telegram`).
4. Task create/edit/list/detail works.
5. Cron endpoint executes and due reminders are delivered.
6. Callback actions (`Done/+15 min/Cancel/Reschedule`) update DB state.
7. Done/cancelled tasks do not re-trigger reminders.

## 6. Rollback plan

1. Redeploy previous Vercel deployment from dashboard.
2. Keep Neon production branch unchanged.
3. If required, point `DATABASE_URL` back to previous Neon branch and redeploy.

## 7. Common failure cases

1. Mini App auth fails:
   - verify `BOT_TOKEN` and `MINI_APP_URL`.
2. Telegram webhook 401/404:
   - verify URL path secret and `secret_token` header value.
3. Cron does not trigger reminders:
   - verify `CRON_SECRET` exists in Vercel and cron path matches `backend/vercel.json`.
4. DB connection errors:
   - verify Neon connection string uses `postgresql+asyncpg` and `ssl=require`.
