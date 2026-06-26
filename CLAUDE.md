# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Orientation

`CONTEXT.md` is the authoritative project map (architecture, key files, data/sync model, guardrails). Read it before any non-trivial change. `README.md` covers run/deploy. This file is the quick command + mental-model reference; when it conflicts with `CONTEXT.md` or live source, those win.

Shell is PowerShell on Windows. Use `npm.cmd` (not `npm`) for frontend commands.

This repo has a CodeGraph index (`.codegraph/`, gitignored). Reach for `codegraph_explore` (MCP) or `codegraph explore "<symbols or question>"` (shell) before grep/find/Read when locating or understanding code — one call returns verbatim source + call paths + a blast-radius of dependents. The index is a snapshot: after non-trivial edits run `codegraph sync` (incremental) or `codegraph index` (full rebuild) to keep it accurate.

## Commands

Backend (from `backend/`, Python 3.12, venv at `backend/.venv`):

```powershell
pip install -r requirements.txt
alembic upgrade head                                   # apply migrations
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000   # API
python -m app.bot.main                                 # Telegram bot (long-polling)
python -m app.scheduler.worker                         # reminder scheduler
```

Frontend (from `frontend/`):

```powershell
npm.cmd install --cache .npm-cache
npm.cmd run dev        # Vite dev server (expects backend/Telegram for auth)
npm.cmd run dev:local  # backend-free preview on localStorage (VITE_LOCAL_PREVIEW)
npm.cmd run build      # tsc typecheck + vite build -> frontend/dist
```

`dev:local` (or `scripts/preview-frontend.ps1` from the repo root) runs the Mini App
fully on localStorage with no backend and no Telegram — for UI work. It loads
`frontend/.env.preview` (`--mode preview`), which sets `VITE_LOCAL_PREVIEW=true`; the
`useTelegramAuth` hook short-circuits on that flag with a stub user. The production
(GitHub Pages) build uses mode `production` and never sets the flag, so the bypass is
dead in prod. Reminder delivery still needs the backend bot/scheduler.

Tests / verification (from repo root):

```powershell
python -m unittest backend.tests.test_sync_api backend.tests.test_cleanup_surface -v
npm.cmd --prefix frontend run test:local   # compiles tests/*.test.ts then runs with node
npm.cmd --prefix frontend run build        # typecheck must pass
```

There is no single test runner — backend tests are stdlib `unittest`; frontend tests are compiled by `tsconfig.tests.json` and executed individually as node scripts (see the `test:local` script in `frontend/package.json` for the exact list). Run a single backend test with e.g. `python -m unittest backend.tests.test_sync_api -v`.

Docker (whole backend in one container + Cloudflare Tunnel — the VPS deploy shape):

```powershell
docker compose up -d --build
```

## Architecture (the part that needs multiple files to grasp)

PocketMind is a Telegram Mini App + bot, intentionally **local-first**:

- **Frontend owns full task state.** The React app stores complete tasks in browser `localStorage` (key `pocketmind.tasks.v2`). `frontend/src/api/tasks.ts` is a compatibility facade that delegates to `localTaskRepository.ts` / `localTasks.ts`, **not** to backend CRUD. Do not reintroduce backend-owned task CRUD for UI convenience.
- **Backend is a sync + reminder service, not the source of truth.** It validates Telegram identity, stores only the *reminder-relevant subset* of each task, sends reminders, and records bot-originated changes for the frontend to merge later. Active routers live under `/api/v1`: `auth`, `sync`, `voice` (`backend/app/api/v1/__init__.py`). `/health` is the readiness probe.
- **Settings are client-only.** App language, timezone, reminder defaults, and snooze live in `localStorage` (`pocketmind.settings.v1`, via `features/settings/localSettings.ts`) and never sync — there is no settings endpoint. The three reminder-shaping values (timezone, language, snooze) ride along with each task's sync payload as a snapshot (`reminder_timezone`/`reminder_language`/`snooze_minutes`), so the backend computes/fires reminders without holding any user settings. Changing a setting is a pure local write (no failure path) and triggers a task re-sync to propagate the new snapshot.
- **Backend runs as three separate processes** sharing one SQLite file via `DATABASE_URL`: API (`uvicorn app.main:app`), bot (`python -m app.bot.main`), scheduler (`python -m app.scheduler.worker`). They are independent; a change touching reminders/sync usually affects more than one.

Sync flow: user edits locally → written to `localStorage` → reminder fields pushed to `/api/v1/sync/*` → on app start frontend bootstraps from backend and merges bot/scheduler changes back. Backend unavailability must not block local editing.

### Identity / id rules (easy to get wrong)

- `client_task_id` is a **string**, unique per user, and is the bridge between a local task and its backend row. Mini App task URLs use it. Keep task ids string-based across frontend and sync contracts.
- Bot callback payloads (done/snooze) still use the internal **numeric** `Task.id`. Callback ids and frontend route ids are **not** interchangeable.
- Merge rule: newer `updated_at` wins for reminder fields; deletes are soft (`deleted_at`). Sync code normalizes datetimes to UTC before comparing — SQLite datetime handling is a known footgun, preserve that normalization (`backend/app/services/task_sync_service.py`).

## Deployment notes

- Frontend deploys to **GitHub Pages** via `.github/workflows/github-pages.yml` on push to `main` touching `frontend/**`. Pages base path is `VITE_BASE_PATH=/PocketMind/`; if the repo name changes, update it or static assets 404. Repo variable `VITE_API_BASE_URL` (e.g. `https://<backend>/api/v1`) is required at build time.
- Backend deploys to a Python host / Docker. The old Vercel/serverless shape was intentionally removed — do not reintroduce `vercel.json`, `api/index.py`, serverless cron, or backend-mounted frontend.

## Guardrails

- Use Alembic for all schema changes.
- Reuse existing modules before adding abstractions; preserve sync/auth/reminder/bot-callback contracts unless the task explicitly changes them.
- Add focused tests when touching sync, auth, reminder scheduling, bot callbacks, or repository cleanup boundaries.
- `docs/archive/` is history only — don't treat it as current instruction when it conflicts with `CONTEXT.md` or source.

## Git workflow

Work directly on `stage`; `main` is the production/deploy branch. After a session, a `stage` → `main` PR is opened for review.
