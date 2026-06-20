# PLAN.md — PocketMind Telegram Bot + Mini App

## 1. Product goal

Build a Telegram Mini App with a companion Telegram bot for fast task capture, task management, and reminders.

The core purpose is not to create a generic productivity system, but to reduce short-term memory load. The user should be able to quickly store tasks, assign reminder logic, and receive actionable Telegram reminders.

The Mini App is the main interface for task management. The bot is a launcher, notification channel, and lightweight helper.

## 2. Key product decisions

### Mini App is the main interface

All primary task-management functionality must live in the Telegram Mini App:

- create task;
- edit task;
- view task lists;
- filter tasks;
- set deadline;
- set reminder time;
- snooze task;
- mark task as done;
- cancel task;
- manage task type;
- open task details.

Do not duplicate the full task-management interface inside the bot.

### Bot is not the main UI

The Telegram bot should only provide:

- `/start` — short welcome message with a small “get started” explanation;
- `/app` — directly opens the Telegram Mini App;
- reminder messages;
- inline buttons under reminders;
- optional short help command.

Important: `/app` must open the Mini App. `/start` must not directly behave as the main task interface. It should greet the user and explain how to begin.

### No categories in MVP

Do not implement task categories yet.

### No urgency levels in MVP

Do not implement urgency/priority levels yet.

Task type, reminder time, deadline, and status are enough for MVP.

## 3. Project name

Use the product name:

```text
PocketMind
```

Meaning:

```text
A pocket-sized external memory for tasks, reminders, and things the user should not have to keep in their head.
```

Use the codebase/package name:

```text
pocketmind
```

Do not use `MedAlarm` for this project. MedAlarm is a separate idea and is not related to the current task/reminder Mini App.

## 4. Tech stack

### Backend

Use:

- Python 3.12+
- FastAPI
- SQLAlchemy 2.x
- Alembic
- SQLite as the main database
- Pydantic v2
- Uvicorn
- python-dotenv or Pydantic Settings
- APScheduler for reminder scheduling in MVP

### Telegram bot

Use:

- aiogram 3.x

Bot responsibilities:

- command handling;
- Telegram Mini App launch button;
- reminder delivery;
- inline callback handling for reminder actions.

### Mini App frontend

Use:

- React
- TypeScript
- Vite
- Telegram Mini Apps SDK or direct Telegram WebApp API
- TanStack Query for API state
- React Hook Form for forms
- Zod for frontend validation
- Tailwind CSS

Optional but recommended:

- shadcn/ui for clean UI components;
- dayjs for date/time formatting.

### Database

Use SQLite as the main database.

This project is intended as a personal Telegram Mini App, not a commercial multi-user SaaS product. SQLite is enough for the MVP and expected personal usage.

Use Alembic from the beginning. Even with SQLite, migrations should be created properly instead of relying on `metadata.create_all()`.

### Deployment

Recommended simple deployment setup:

- Docker or direct process/service deployment
- persistent SQLite database file/volume
- Backend process/container
- Bot worker process/container
- Scheduler process/container
- Frontend built as static assets and served by backend or separate Nginx container

For the first local MVP, running backend, bot, and frontend separately is acceptable.

## 4.1. Deployment target

The project must support self-contained deployment on a single VPS using Docker Compose.

The MVP must not require external infrastructure services such as:

- external PostgreSQL;
- Redis;
- RabbitMQ;
- Celery workers with a broker;
- Kubernetes;
- cloud-managed databases;
- cloud queues;
- third-party scheduler services.

The only external dependency is Telegram itself, because the bot and Mini App communicate through Telegram APIs.

Required Docker Compose services:

```text
backend      FastAPI API and optional static frontend serving
bot          aiogram Telegram bot worker
scheduler    reminder polling worker
proxy        Caddy or Nginx HTTPS reverse proxy
```

SQLite must be stored in a persistent mounted volume or bind mount, not inside an ephemeral container filesystem.

Recommended SQLite path inside containers:

```text
/app/data/pocketmind.db
```

Recommended database URL:

```text
sqlite+aiosqlite:////app/data/pocketmind.db
```

The whole MVP should be startable with:

```bash
docker compose up -d
```

The Docker setup must include:

- `Dockerfile` for backend/bot/scheduler image;
- `docker-compose.yml`;
- persistent volume or bind mount for SQLite database file;
- Caddy or Nginx config for HTTPS;
- environment variables via `.env`;
- clear README instructions for VPS deployment.


## 5. High-level architecture

Components:

```text
Telegram User
    |
    | opens
    v
Telegram Bot ---- sends reminders / handles inline buttons
    |
    | launches
    v
Telegram Mini App Frontend
    |
    | HTTPS API
    v
FastAPI Backend
    |
    | SQLAlchemy
    v
SQLite
    |
    ^
    |
Reminder Scheduler
```

Backend owns task state. Bot and Mini App must use the same backend logic and database.

Avoid duplicating business logic between bot handlers and API endpoints.

## 6. Authentication

Use Telegram Mini App init data validation.

Backend must validate `initData` received from the Telegram WebApp.

Required behavior:

- Mini App sends Telegram `initData` to backend.
- Backend validates hash using bot token.
- Backend extracts Telegram user ID.
- Backend creates or updates local user record.
- Backend issues internal session/JWT or uses validated init data per request.

For MVP, a simple backend-issued JWT after Telegram init data validation is recommended.

Do not trust user ID sent directly from frontend without Telegram init data validation.

## 7. Core entities

### User

Fields:

```text
id
telegram_id
username
first_name
last_name
language_code
created_at
updated_at
last_seen_at
```

### Task

Fields:

```text
id
user_id
title
description
type
status
deadline_at
remind_at
snoozed_until
recurrence_rule
created_at
updated_at
completed_at
cancelled_at
last_reminded_at
```

Recommended enum values:

Task type:

```text
quick
deadline
no_deadline
recurring
waiting
```

Task status:

```text
new
planned
reminded
snoozed
done
cancelled
```

Do not store `overdue` as a status. Compute it dynamically:

```text
deadline_at < now AND status NOT IN ('done', 'cancelled')
```

### ReminderEvent / ReminderLog

For MVP, a separate reminder log is useful but not strictly required.

Recommended fields:

```text
id
task_id
user_id
scheduled_for
sent_at
status
error_message
created_at
```

Possible statuses:

```text
pending
sent
failed
cancelled
```

This helps debug missed or failed reminders.

## 8. Task types

### quick

For tasks that should be done soon.

Examples:

- call someone back;
- reply in a chat;
- check payment;
- send a file.

Usually has `remind_at`.

### deadline

For tasks that must be completed before a specific date/time.

Must support:

- `deadline_at`;
- optional `remind_at`.

Example:

```text
deadline_at = 2026-05-28 18:00
remind_at = 2026-05-28 16:30
```

### no_deadline

For storing tasks without a specific deadline.

Should not create reminders by default.

### recurring

For repeated tasks.

MVP options may be simple:

- daily;
- weekly;
- monthly.

Store recurrence in `recurrence_rule`.

Recommended format:

```text
RRULE:FREQ=DAILY
RRULE:FREQ=WEEKLY;BYDAY=MO
RRULE:FREQ=MONTHLY
```

Complex recurrence editing can be postponed.

### waiting

For tasks where the user is waiting for someone else.

Example:

```text
Waiting for Sergey to reply about payment.
```

Reminder wording should be different from regular tasks:

```text
Are you still waiting for: Sergey to reply about payment?
```

Reminder buttons for waiting tasks:

```text
Got reply
Remind later
Open
```

## 9. Reminder behavior

Supported reminder operations:

- remind at specific date/time;
- remind after N minutes/hours;
- repeat/remind later;
- snooze task;
- mark as done from reminder.

Inline buttons under regular reminder:

```text
✅ Done
⏰ +15 min
🕐 +1 hour
📅 Reschedule
🔎 Open
```

Inline buttons under waiting reminder:

```text
✅ Got reply
⏰ Remind later
🔎 Open
```

Inline buttons under recurring reminder:

```text
✅ Done for now
⏰ Later
🔎 Open
```

Callback handling rules:

- `Done` sets task status to `done` and fills `completed_at`.
- `+15 min` sets status to `snoozed` and `snoozed_until/remind_at` to now + 15 minutes.
- `+1 hour` sets status to `snoozed` and `snoozed_until/remind_at` to now + 1 hour.
- `Reschedule` opens the Mini App task detail/edit screen.
- `Open` opens the Mini App task detail screen.
- For waiting tasks, `Got reply` marks the waiting task as done.

## 10. Mini App screens

### Home screen

Show compact dashboard sections:

- Today;
- Overdue;
- Upcoming reminders;
- Waiting;
- No deadline.

Each section should show a short list and a link to full filtered list.

### Task list screen

Filters:

- all active;
- today;
- overdue;
- waiting;
- no deadline;
- completed;
- cancelled.

No categories.

No priority filters.

### Create task screen

Fields:

```text
title
description
type
deadline_at
remind_at
recurrence_rule
```

Behavior:

- title is required;
- description is optional;
- type is required;
- deadline task should allow deadline selection;
- reminder can be optional;
- no_deadline task should not require deadline/reminder;
- recurring task should allow simple recurrence selection;
- waiting task should allow reminder/check-in time.

### Task detail screen

Show:

- title;
- description;
- type;
- status;
- deadline;
- reminder time;
- recurrence info if any;
- created/updated timestamps if useful.

Actions:

- edit;
- mark done;
- snooze;
- cancel;
- restore if cancelled/done, optional for later.

### Edit task screen

Same fields as create screen.

Must allow changing:

- title;
- description;
- type;
- deadline;
- reminder;
- recurrence;
- status where appropriate.

## 11. API design

Base prefix:

```text
/api/v1
```

### Auth

```http
POST /api/v1/auth/telegram
```

Request:

```json
{
  "init_data": "..."
}
```

Response:

```json
{
  "access_token": "...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "telegram_id": 123456789,
    "username": "example"
  }
}
```

### Tasks

```http
GET /api/v1/tasks
POST /api/v1/tasks
GET /api/v1/tasks/{task_id}
PATCH /api/v1/tasks/{task_id}
DELETE /api/v1/tasks/{task_id}
```

Use `DELETE` as soft cancel, not hard deletion.

Query filters for `GET /tasks`:

```text
status
type
view
date_from
date_to
```

Suggested `view` values:

```text
active
today
overdue
waiting
completed
cancelled
no_deadline
```

### Task actions

```http
POST /api/v1/tasks/{task_id}/done
POST /api/v1/tasks/{task_id}/cancel
POST /api/v1/tasks/{task_id}/snooze
POST /api/v1/tasks/{task_id}/reschedule
```

Snooze request:

```json
{
  "minutes": 15
}
```

Reschedule request:

```json
{
  "remind_at": "2026-05-28T16:30:00+03:00",
  "deadline_at": "2026-05-28T18:00:00+03:00"
}
```

## 12. Scheduler

Use APScheduler for MVP.

Recommended approach:

- scheduler periodically checks due tasks every 30-60 seconds;
- select tasks where `remind_at <= now`;
- skip `done` and `cancelled`;
- send Telegram message;
- update `last_reminded_at`;
- set status to `reminded`;
- create ReminderLog entry.

Avoid loading every future reminder as a separate scheduled job in MVP. A periodic DB polling approach is simpler and more reliable for early development.

Pseudo-condition:

```sql
WHERE remind_at IS NOT NULL
  AND remind_at <= now()
  AND status NOT IN ('done', 'cancelled')
```

After snoozing, update `remind_at`.

For recurring tasks, after user marks current occurrence as done, calculate the next `remind_at` using recurrence rule.

## 13. Telegram bot behavior

### `/start`

Send a short welcome message.

Example:

```text
Hi! I help you keep tasks out of your head and inside a reliable reminder system.

Use /app to open the task manager.
When reminders arrive, you can mark tasks done or snooze them directly from Telegram.
```

Include a button:

```text
Open Mini App
```

The button should open the Mini App, but the text response should still behave as a get-started greeting.

### `/app`

Must directly open the Mini App.

Behavior:

- send a message with a prominent Mini App button;
- no long explanation;
- no task-management menu inside bot.

Example:

```text
Open your task manager:
[Open Mini App]
```

### `/help`

Briefly explain:

- `/app` opens the Mini App;
- reminders arrive here;
- buttons under reminders can complete/snooze/open tasks.

## 14. Frontend UX principles

The app should be fast and low-friction.

Priorities:

- follow PocketMind logo palette: blue, green, and soft neutral UI tones;
- minimal taps to create a task;
- clear default values;
- no unnecessary classification;
- no categories;
- no priority levels;
- strong visibility of overdue and today tasks;
- easy snooze and completion.

Suggested task card fields:

```text
title
type label
deadline/reminder time
status
primary action button
```

Primary actions:

- active task: Done;
- waiting task: Got reply;
- overdue task: Done / Reschedule;
- no deadline: Done.

## 14.1. UI branding and visual style

The PocketMind UI must use the visual direction from the generated logo.

Primary palette:

```text
blue
green
soft neutral background tones
```

Design direction:

- soft;
- calm;
- pleasant to look at;
- friendly rather than corporate;
- visually lightweight;
- rounded cards and buttons;
- clear spacing;
- no aggressive colors;
- no overloaded dashboards.

The interface should feel like a reliable external memory assistant, not like an enterprise task tracker.

Use blue as the main brand/action color and green for positive states, completion, success, and supportive accents.

Avoid harsh red except for clearly destructive actions such as cancellation or deletion.


## 15. Time zones

Store all datetimes in UTC in database.

Frontend should display dates in the user's local timezone.

Backend should accept ISO 8601 datetimes with timezone offset.

Default user timezone can be inferred from frontend/browser or set to Europe/Kyiv for initial MVP.

## 16. Validation rules

Task title:

- required;
- max length: 255.

Description:

- optional;
- max length: 5000.

Task type:

- required;
- must be one of known enum values.

Deadline:

- optional globally;
- expected for `deadline` tasks.

Reminder:

- optional;
- required only if the selected task behavior needs it.

Recurring:

- if type is `recurring`, recurrence rule is required for MVP.

Cancelled/done tasks:

- must not trigger reminders.

## 17. Suggested repository structure

```text
pocketmind/
  backend/
    app/
      main.py
      core/
        config.py
        security.py
        telegram_auth.py
      db/
        session.py
        base.py
      models/
        user.py
        task.py
        reminder_log.py
      schemas/
        auth.py
        task.py
        user.py
      api/
        deps.py
        v1/
          auth.py
          tasks.py
      services/
        task_service.py
        reminder_service.py
        recurrence_service.py
      bot/
        main.py
        handlers/
          start.py
          app.py
          help.py
          callbacks.py
        keyboards.py
      scheduler/
        worker.py
      migrations/
        versions/
    alembic.ini
    pyproject.toml
  frontend/
    src/
      main.tsx
      App.tsx
      api/
        client.ts
        auth.ts
        tasks.ts
      components/
        TaskCard.tsx
        TaskForm.tsx
        Layout.tsx
      pages/
        HomePage.tsx
        TaskListPage.tsx
        TaskCreatePage.tsx
        TaskDetailPage.tsx
        TaskEditPage.tsx
      hooks/
        useTelegramAuth.ts
      types/
        task.ts
    package.json
    vite.config.ts
  docker-compose.yml
  .env.example
  README.md
  PLAN.md
```

## 18. Environment variables

Required:

```text
BOT_TOKEN=
DATABASE_URL=sqlite+aiosqlite:///./data/pocketmind.db
APP_BASE_URL=
MINI_APP_URL=
JWT_SECRET=
JWT_EXPIRE_MINUTES=
ENVIRONMENT=local
```

Optional:

```text
DEFAULT_TIMEZONE=Europe/Kyiv
SCHEDULER_POLL_INTERVAL_SECONDS=60
```

## 19. Implementation order for Codex

### Step 1 — Backend foundation

- Create FastAPI app.
- Configure settings.
- Configure SQLAlchemy with SQLite.
- Configure Alembic.
- Add User, Task, ReminderLog models.
- Create first migration.

### Step 2 — Auth

- Implement Telegram Mini App init data validation.
- Implement `/api/v1/auth/telegram`.
- Add JWT issuing.
- Add dependency for current user.

### Step 3 — Task API

- Implement task schemas.
- Implement CRUD endpoints.
- Implement task action endpoints:
  - done;
  - cancel;
  - snooze;
  - reschedule.
- Add filtering for task lists.

### Step 4 — Bot foundation

- Add aiogram bot entrypoint.
- Implement `/start`.
- Implement `/app`.
- Implement `/help`.
- Add Mini App open button.

Remember:

- `/start` = greeting/get started;
- `/app` = directly open Mini App.

### Step 5 — Reminder scheduler

- Implement polling worker.
- Find due tasks.
- Send Telegram reminder messages.
- Add inline buttons.
- Update task status and reminder logs.

### Step 6 — Bot callbacks

Implement callback actions:

- done;
- snooze 15 minutes;
- snooze 1 hour;
- open Mini App task details;
- waiting task got reply.

### Step 7 — Frontend foundation

- Create Vite React TypeScript app.
- Add Telegram WebApp integration.
- Implement auth flow.
- Configure API client.
- Add layout.

### Step 8 — Frontend task screens

Implement:

- Home screen;
- Task list screen;
- Create task screen;
- Task detail screen;
- Edit task screen.

### Step 9 — Polish MVP UX

- Add loading states.
- Add empty states.
- Add error handling.
- Add date/time formatting.
- Add quick snooze controls.
- Add clear task type labels.

### Step 10 — Docker/self-contained VPS setup

- Add `Dockerfile`.
- Add `docker-compose.yml`.
- Add backend service.
- Add bot worker service.
- Add scheduler service.
- Add Caddy or Nginx reverse proxy service for HTTPS.
- Add persistent SQLite volume or bind mount.
- Add `.env.example`.
- Add README with local and VPS deployment instructions.
- Ensure the MVP can be started with `docker compose up -d`.
- Do not require PostgreSQL, Redis, RabbitMQ, Celery, Kubernetes, or managed cloud services for MVP.

## 20. Out of scope for MVP

Do not implement yet:

- external PostgreSQL requirement;
- Redis requirement;
- RabbitMQ/Celery requirement;
- categories;
- priority/urgency levels;
- team/shared tasks;
- NLP task parsing;
- voice input;
- file attachments;
- complex recurring rules;
- calendar integration;
- analytics;
- multi-language support beyond basic UI text;
- full task management inside bot.

## 21. Acceptance criteria

MVP is acceptable when:

- user can open Mini App from `/app`;
- `/start` sends a short welcome/get-started message;
- user can create a task in Mini App;
- user can select task type;
- user can set reminder time;
- user can set deadline where needed;
- user can view active tasks;
- user can view today tasks;
- user can view overdue tasks;
- user can mark task as done;
- user can cancel task;
- user can snooze task;
- Telegram bot sends reminders at the correct time;
- reminder inline buttons work;
- done/cancelled tasks do not send reminders;
- backend validates Telegram Mini App auth data;
- datetimes are stored consistently in UTC.

## 22. Notes for Codex

Prioritize a working vertical slice over perfect architecture.

The first useful vertical slice is:

```text
/start greeting
/app opens Mini App
Mini App auth
Create task
Set remind_at
Scheduler sends reminder
Reminder has Done and +15 min buttons
Task status updates correctly
```

After this works, expand to deadline, waiting, recurring, filters, and better UI.
