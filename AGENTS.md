# Repository Guidelines

## Project Structure & Module Organization
`frontend/` contains the Telegram Mini App built with React, TypeScript, and Vite. Main UI code lives in `src/`, with shared components in `src/components/`, route pages in `src/pages/`, API helpers in `src/api/`, and local-first task logic in `src/features/tasks/`. `backend/` contains the FastAPI API, aiogram bot, scheduler worker, SQLAlchemy models, and Alembic migrations. Tests live in `frontend/tests/` and `backend/tests/`. Repo-level scripts for local preview live in `scripts/`.

## Build, Test, and Development Commands
- `Copy-Item .env.example .env`: create local environment config.
- `cd frontend; npm.cmd install --cache .npm-cache`: install frontend deps.
- `cd frontend; npm.cmd run dev`: run the Mini App locally.
- `cd frontend; npm.cmd run dev:local`: run frontend-only preview with local storage and stub auth.
- `cd frontend; npm.cmd run build`: type-check and build the production frontend bundle.
- `cd frontend; npm.cmd run test:local`: run the TypeScript-based frontend regression tests.
- `cd backend; pip install -r requirements.txt`: install backend deps.
- `cd backend; alembic upgrade head`: apply database migrations.
- `cd backend; uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`: start the API.
- `cd backend; python -m app.bot.main` and `python -m app.scheduler.worker`: run the bot and reminder worker.

## Coding Style & Naming Conventions
Use 4 spaces in Python and 2 spaces in TypeScript/TSX, matching the existing files. Prefer explicit, descriptive names such as `task_sync_service.py`, `TaskListPage.tsx`, and `useTelegramAuth.ts`. Keep React components in PascalCase, hooks in `useX` form, and backend modules snake_case. Follow the existing local-first and sync-oriented structure instead of adding parallel abstractions.

## Testing Guidelines
Backend tests use `unittest` with `fastapi.testclient`; add new files under `backend/tests/` as `test_*.py`. Frontend tests are small TypeScript entrypoints under `frontend/tests/` and are executed by `npm.cmd run test:local`. Add focused regression coverage for task timing, sync behavior, auth guards, and reminder-related flows when changing those areas.

## Commit & Pull Request Guidelines
Recent commits use short imperative subjects like `Polish PocketMind frontend task UX`. Keep commits scoped and readable. Work on `stage`, not `main`, and verify changes with local preview before calling them ready. PRs should explain user-visible changes, list commands run, link issues when relevant, and include screenshots for frontend UI changes.
