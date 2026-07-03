# Changelog

All notable changes to PocketMind are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project follows [Semantic Versioning](https://semver.org/).

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
