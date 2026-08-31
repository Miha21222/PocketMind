# Changelog

All notable changes to PocketMind are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project follows [Semantic Versioning](https://semver.org/).

## [1.3.0] - 2026-08-31

### Added

- Server-rendered web UI. The app now exposes a FastAPI-rendered web app
  (Jinja templates, static assets) alongside the Telegram Mini App, with a
  dashboard, task list/detail/form, settings, and migrated browser data.
- Cookie session auth for the web surface, backed by a session store, while
  the Telegram Mini App keeps its token-based auth.
- Server-owned `UserPreferences`: a dedicated model and settings surface that
  now owns user preferences server-side instead of relying on client storage.
- Voice-to-task bot: Telegram voice messages are transcribed (Whisper) into
  quick tasks directly from chat, with en/ru/uk responses and a 10 MB size cap.
- Server preference sync: client-owned Mini App settings are mirrored into the
  backend `UserPreferences` row so future bot-created tasks pick up the real
  quick-delay/reminder defaults.
- Reminder cleanup on task close: already-sent Telegram reminder cards are
  deleted once a task is done, cancelled, or deleted (sync and web surfaces).
- Russian and Ukrainian editions of the README, with a per-edition language
  selector and section-for-section parity with the English edition.
- Fresh dashboard and task-creation screenshots, and a legacy browser-data
  import surface for existing local-first users.

### Changed

- Reshaped the README into a user-first PocketMind overview covering the
  Telegram onboarding journey, local-first data ownership, architecture, API
  surface, setup, validation, deployment, and privacy boundaries.
- `docker-compose.yml` renamed the backend service `backend` -> `app` and
  pinned `cloudflared`; added `docker-compose.local.yml` and a supervisor
  config for the compose-run workers.

## [1.2.1] - 2026-07-13

### Fixed

- Opening the mobile keyboard in Telegram no longer resizes the app and pushes
  the bottom navigation and floating actions above the keyboard. Supporting
  Chromium WebViews now use keyboard overlay mode, while older Telegram
  Android WebViews retain the pre-keyboard viewport height and compensate for
  viewport resizing.
- Floating Back and Create controls no longer bounce while the keyboard opens.
  Keyboard-animation offsets are applied immediately without the normal button
  transform transition.

## [1.2.0] - 2026-07-06

### Changed

- Voice input now starts recording on a single tap of the field mic button,
  instead of requiring a second tap on a button inside the recording modal
  (the native browser microphone permission prompt still appears once per
  session, which can't be removed).
- Recording now uses voice-activity detection instead of relying purely on
  the user to tap stop: it auto-cancels (no transcription) if no speech is
  heard within ~5s of starting, and auto-stops (transcribes) once the user
  goes quiet again after speaking, so most recordings need no manual stop.

## [1.1.1] - 2026-07-03

### Fixed

- Task status pill (e.g. "Активна") in the task list stretched taller or
  shorter depending on how many lines the task title wrapped to, because the
  row's default flex `align-items: stretch` sized the badge to match the
  title's height. The row now uses `align-items: flex-start` and the badge is
  `flex-shrink: 0`, so it stays a fixed size regardless of title length.

## [1.1.0] - 2026-07-03

### Fixed

- Reminders for deadline/waiting tasks with a deadline set could be resent on
  every scheduler poll (every 60s) indefinitely instead of firing once. Two
  causes, both fixed:
  - `assign_next_reminder_after_send` compared a tz-aware computed reminder
    time against `task.deadline_at`, which SQLAlchemy + SQLite returns naive
    on a fresh load — raising a `TypeError` on nearly every send for a task
    with a deadline. `deadline_at` is now normalized to UTC before comparing.
  - Sending the Telegram message and scheduling the next reminder happened in
    one transaction; a failure after a successful send rolled back the "sent"
    mark too, so the next poll resent the same message. Sending is now split
    into two independently-committed phases, and `ReminderLog.status`
    (`pending → sent/cancelled`) is reconciled as a durable audit trail at
    every point `remind_at` changes (sync, snooze, overdue transitions,
    post-send).

### Changed

- Task completion is now app-only. The Telegram reminder keyboard's "Done"
  button and its bot callback have been removed (Snooze and Open remain);
  completing a task always goes through the frontend's task-state ownership.

## [1.0.0] - 2026-07-03

Initial tracked release. This tag is the baseline the project starts versioning
from; earlier history exists only as untagged commits on `main`.

### Included at this baseline

- Telegram Mini App frontend (React + TypeScript + Vite) with a local-first
  task model: tasks are created, edited, and completed entirely in browser
  `localStorage`, independent of backend availability.
- Task types: quick, deadline, no-deadline, waiting, and recurring, each with
  its own reminder strategy (one-off, daily, interval, or recurrence rule).
- FastAPI backend providing Telegram-identity auth, a sync API
  (`/api/v1/sync/*`) that stores only the reminder-relevant subset of each
  task, and voice-note transcription (`/api/v1/voice/transcribe`).
- An aiogram long-polling bot that delivers reminders to Telegram and handles
  snooze/open actions.
- An APScheduler worker that polls for due reminders and fires them.
- In-app feedback and bug-report flow, including screenshot upload.
- Frontend deploy to GitHub Pages; backend deploy via Docker Compose behind a
  Cloudflare Tunnel.
