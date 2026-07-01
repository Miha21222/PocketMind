# Deadline-Only Overdue Status Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `overdue` a real synced task status used only for `deadline` and `waiting` tasks whose `deadline_at` is already past and which are not `done` or `cancelled`.

**Architecture:** Move overdue from a broad derived UI filter into a narrow persisted status contract. The frontend remains the source of truth for when a deadline-bearing task becomes overdue, while the backend enforces the same rule, clears queued reminders for overdue tasks, and excludes them from future scheduling.

**Tech Stack:** React, TypeScript, Vite, FastAPI, SQLAlchemy, Alembic, aiogram, APScheduler, unittest

---

## File Structure

- Modify: `frontend/src/types/task.ts`
  - Add `overdue` to the shared task status union used by local state and sync records.
- Modify: `frontend/src/features/tasks/localTasks.ts`
  - Centralize “deadline passed => overdue” normalization for local create/update/merge flows.
- Modify: `frontend/src/features/tasks/localTaskRepository.ts`
  - Keep sync payloads aligned with normalized local status and ensure bootstrap writes overdue tasks back to local storage.
- Modify: `frontend/src/features/tasks/selectors.ts`
  - Narrow overdue logic so only deadline-bearing tasks count, and prefer persisted `status === "overdue"` for filtering.
- Modify: `frontend/src/utils/taskLabels.ts`
  - Label `overdue` separately from `active`.
- Modify: `frontend/tests/localTasks.test.ts`
  - Add regression coverage for overdue normalization and for non-deadline tasks staying active.
- Modify: `frontend/tests/dashboardRecurring.test.ts`
  - Add one dashboard/filter regression that overdue tasks appear only when deadline-bearing.
- Modify: `backend/app/models/task.py`
  - Add `overdue` to the backend enum and keep it out of the scheduler’s runnable states.
- Modify: `backend/app/schemas/sync.py`
  - Accept and return `overdue`.
- Modify: `backend/app/services/task_sync_service.py`
  - Normalize synced tasks into overdue when deadline has passed; clear `remind_at` and `snoozed_until`.
- Modify: `backend/app/services/task_service.py`
  - Keep scheduler queries limited to runnable states so overdue tasks never fire again.
- Modify: `backend/app/services/reminder_service.py`
  - After a reminder send, if the deadline is already exhausted or no next reminder fits before the deadline, mark the task overdue and stop scheduling.
- Modify: `backend/app/services/task_actions.py`
  - Ensure snooze/complete helper paths cannot revive an already overdue deadline task into an active reminder cycle.
- Modify: `backend/tests/test_sync_api.py`
  - Add sync/runtime tests for overdue normalization and reminder cutoff.
- Create: `backend/alembic/versions/20260630_0009_deadline_tasks_overdue_status.py`
  - Convert existing past-deadline `deadline`/`waiting` tasks from `active` or `snoozed` into `overdue`, add enum value, and preserve non-deadline tasks as active.

### Task 1: Define The Shared Overdue Status Contract

**Files:**
- Modify: `frontend/src/types/task.ts`
- Modify: `backend/app/models/task.py`
- Modify: `backend/app/schemas/sync.py`

- [ ] **Step 1: Add the new shared status value**

Update the status unions/enums so both app halves recognize the same vocabulary:

```ts
export type TaskStatus = "active" | "overdue" | "snoozed" | "done" | "cancelled";
```

```python
class TaskStatus(str, enum.Enum):
    active = "active"
    overdue = "overdue"
    snoozed = "snoozed"
    done = "done"
    cancelled = "cancelled"
```

- [ ] **Step 2: Keep schema defaults non-overdue**

Leave create/sync defaults as `active`, not `overdue`, because overdue must be earned by a passed deadline:

```python
status: TaskStatus = TaskStatus.active
```

- [ ] **Step 3: Run the smallest compile checks**

Run:

```powershell
cd frontend; npm.cmd run build
cd ..\backend; .\.venv\Scripts\python.exe -m unittest backend\tests\test_sync_api.py
```

Expected:
- Frontend build fails only where `TaskStatus` exhaustiveness needs updating.
- Backend test run fails only where enum values or expectations still need updates.

### Task 2: Make Frontend Overdue Deadline-Only

**Files:**
- Modify: `frontend/src/features/tasks/localTasks.ts`
- Modify: `frontend/src/features/tasks/localTaskRepository.ts`
- Modify: `frontend/src/features/tasks/selectors.ts`
- Modify: `frontend/src/utils/taskLabels.ts`
- Test: `frontend/tests/localTasks.test.ts`
- Test: `frontend/tests/dashboardRecurring.test.ts`

- [ ] **Step 1: Introduce one local normalization helper**

Add a helper in `localTasks.ts` that runs after timing math:

```ts
function normalizeDeadlineOverdue(task: LocalTask, now = new Date()): LocalTask {
  if (task.status === "done" || task.status === "cancelled") return task;
  const deadlineTs = task.deadline_at ? new Date(task.deadline_at).getTime() : null;
  const supportsOverdue = task.type === "deadline" || task.type === "waiting";
  if (!supportsOverdue || deadlineTs === null || Number.isNaN(deadlineTs) || deadlineTs >= now.getTime()) {
    return task.status === "overdue" ? { ...task, status: "active" } : task;
  }
  return {
    ...task,
    status: "overdue",
    remind_at: null,
    snoozed_until: null,
  };
}
```

- [ ] **Step 2: Apply it to every frontend mutation and merge path**

Call the helper from:
- `buildTaskFromPayload`
- `updateLocalTask`
- `markLocalTaskDone` recurring branch result
- `rehydrateLocalTask`
- `mergeRemoteTaskIntoLocal`

The key rule is:

```ts
return normalizeDeadlineOverdue(applyTiming(...), now);
```

- [ ] **Step 3: Narrow UI overdue logic to deadline-bearing tasks only**

Change `isTaskOverdue()` in `selectors.ts` so it no longer treats past quick reminders as overdue:

```ts
export function isTaskOverdue(task: Task, now = Date.now()): boolean {
  if (task.status === "overdue") return true;
  if (task.status === "done" || task.status === "cancelled") return false;
  if (task.type !== "deadline" && task.type !== "waiting") return false;
  const deadlineTs = toTimestamp(task.deadline_at);
  return deadlineTs !== null && deadlineTs < now;
}
```

- [ ] **Step 4: Keep labels and filters reader-facing**

Update `taskStatusLabel()` so `overdue` is distinct from `active`, while list filters keep using the existing `overdue` view key:

```ts
if (status === "overdue") return t("taskStatusOverdue");
```

- [ ] **Step 5: Add focused frontend regressions**

Extend `frontend/tests/localTasks.test.ts` with:

```ts
{
  const task = buildTaskFromPayload(
    {
      title: "Missed deadline",
      type: "deadline",
      deadline_at: "2026-06-26T08:00:00.000Z",
      reminder_mode: "daily_at_time",
      reminder_time_local: "09:00",
    },
    kyivSettings,
    new Date("2026-06-26T12:05:00.000Z"),
  );

  assertEqual(task.status, "overdue");
  assertEqual(task.remind_at, null);
}

{
  const task = buildTaskFromPayload(
    { title: "Old quick", type: "quick" },
    kyivSettings,
    new Date("2026-06-26T12:05:00.000Z"),
  );

  assertEqual(task.status, "active");
}
```

Add one selector/dashboard assertion in `frontend/tests/dashboardRecurring.test.ts` that a quick task with a past `remind_at` is not in the overdue bucket while a deadline task with a past `deadline_at` is.

- [ ] **Step 6: Run frontend verification**

Run:

```powershell
cd frontend
npm.cmd run build
```

Expected:
- Build passes.
- Existing test script may still need the known `import.meta` fix; if so, run the targeted compiled tests already used in this repo or extend the test runner in a separate cleanup commit.

### Task 3: Enforce Overdue On The Backend And Stop Reminders

**Files:**
- Modify: `backend/app/services/task_sync_service.py`
- Modify: `backend/app/services/task_service.py`
- Modify: `backend/app/services/reminder_service.py`
- Modify: `backend/app/services/task_actions.py`
- Test: `backend/tests/test_sync_api.py`

- [ ] **Step 1: Add one backend normalization helper**

In `task_sync_service.py`, add a helper that owns the backend rule:

```python
def apply_overdue_if_needed(task: Task, now: datetime) -> None:
    if task.status in {TaskStatus.done, TaskStatus.cancelled}:
        return
    if task.type not in {TaskType.deadline, TaskType.waiting}:
        if task.status == TaskStatus.overdue:
            task.status = TaskStatus.active
        return
    deadline_at = ensure_utc_datetime(task.deadline_at)
    if deadline_at is not None and deadline_at < now:
        task.status = TaskStatus.overdue
        task.remind_at = None
        task.snoozed_until = None
    elif task.status == TaskStatus.overdue:
        task.status = TaskStatus.active
```

- [ ] **Step 2: Call the helper after timing decisions**

In `apply_sync_payload()`, run overdue normalization after `apply_timing_by_type(...)`.

In `task_actions.snooze_task()`, if the target task is deadline-bearing and already past deadline, force `overdue` instead of `snoozed`.

- [ ] **Step 3: Make scheduler ignore overdue tasks**

Keep runnable states limited:

```python
Task.status.in_([TaskStatus.active, TaskStatus.snoozed])
```

Do not add `overdue` there.

- [ ] **Step 4: Stop re-scheduling once a deadline is missed**

After `assign_next_reminder_after_send()` in `reminder_service.py`, run the same overdue helper or equivalent check:

```python
apply_overdue_if_needed(task, datetime.now(UTC))
```

That ensures a deadline task that has crossed the deadline becomes `overdue` and loses `remind_at`, even if it just received a final reminder.

- [ ] **Step 5: Add backend behavior tests**

Extend `backend/tests/test_sync_api.py` with:

```python
def test_past_deadline_task_syncs_as_overdue(self) -> None:
    payload = {
        "title": "Missed deadline",
        "type": "deadline",
        "status": "active",
        "description": None,
        "deadline_at": "2026-06-01T08:00:00Z",
        "remind_at": "2026-06-01T07:00:00Z",
        "reminder_mode": "daily_at_time",
        "reminder_time_local": "09:00",
        "reminder_interval_hours": None,
        "recurrence_rule": None,
        "updated_at": "2026-06-30T09:00:00Z",
        "deleted_at": None,
    }
    response = self.client.put("/api/v1/sync/tasks/overdue-1", json=payload, headers=self.headers)
    self.assertEqual(response.status_code, 200)
    body = response.json()["task"]
    self.assertEqual(body["status"], "overdue")
    self.assertIsNone(body["remind_at"])
```

```python
def test_past_quick_task_stays_active(self) -> None:
    payload = {
        "title": "Quick task",
        "type": "quick",
        "status": "active",
        "description": None,
        "deadline_at": None,
        "remind_at": "2026-06-30T08:00:00Z",
        "reminder_mode": "none",
        "reminder_time_local": None,
        "reminder_interval_hours": None,
        "recurrence_rule": None,
        "updated_at": "2026-06-30T09:00:00Z",
        "deleted_at": None,
    }
    response = self.client.put("/api/v1/sync/tasks/quick-1", json=payload, headers=self.headers)
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.json()["task"]["status"], "active")
```

- [ ] **Step 6: Run backend verification**

Run:

```powershell
cd backend
.\.venv\Scripts\python.exe -m unittest discover -s tests -p "test_*.py"
```

Expected:
- All backend tests pass.

### Task 4: Migrate Existing Data To The New Rule

**Files:**
- Create: `backend/alembic/versions/20260630_0009_deadline_tasks_overdue_status.py`
- Test: local Docker/SQLite upgrade path

- [ ] **Step 1: Write the migration**

Add an Alembic revision that:
- extends the enum with `overdue`
- converts existing `deadline` and `waiting` tasks with `deadline_at < CURRENT_TIMESTAMP` and status in `active`/`snoozed` to `overdue`
- clears `remind_at` and `snoozed_until` for those rows
- leaves `quick`, `no_deadline`, and `recurring` tasks as `active`

The core SQL should look like:

```sql
UPDATE tasks
SET status = 'overdue',
    remind_at = NULL,
    snoozed_until = NULL
WHERE type IN ('deadline', 'waiting')
  AND deadline_at IS NOT NULL
  AND deadline_at < CURRENT_TIMESTAMP
  AND status IN ('active', 'snoozed');
```

- [ ] **Step 2: Support SQLite and Postgres enum handling**

Mirror the enum-alter pattern already used in `20260630_0008_task_status_active_only.py`:
- Postgres: rename type, create new type, cast column, drop old type
- SQLite: `batch_alter_table(...).alter_column(...)`

- [ ] **Step 3: Run migration verification**

Run:

```powershell
cd backend
$env:DATABASE_URL='sqlite+aiosqlite:///./.tmp_alembic_overdue_test.db'
$env:ENVIRONMENT='local'
$env:JWT_SECRET='test-secret'
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Expected:
- Alembic reaches the new revision without enum errors.

### Task 5: End-To-End Local Stack Verification

**Files:**
- Modify if needed after verification: `docker-compose.yml` only if commands or docs prove misleading

- [ ] **Step 1: Rebuild and recreate the backend container**

Run:

```powershell
docker compose build backend
docker compose up -d --force-recreate backend
```

- [ ] **Step 2: Confirm the migrated runtime state**

Run:

```powershell
docker compose exec backend sh -lc "python - <<'PY'
import sqlite3
con = sqlite3.connect('/app/data/pocketmind.db')
cur = con.cursor()
print(cur.execute('SELECT version_num FROM alembic_version').fetchall())
print(cur.execute('SELECT status, type, COUNT(*) FROM tasks GROUP BY status, type ORDER BY status, type').fetchall())
con.close()
PY"
```

Expected:
- Latest Alembic revision is present.
- Past-deadline `deadline`/`waiting` tasks show `overdue`.
- Quick/no-deadline/recurring tasks never show `overdue` unless manually corrupted before migration.

- [ ] **Step 3: Manual reminder sanity check**

Perform three manual checks with the local app:
1. Create a quick task and let its reminder pass.
   Expected: task stays `active`; reminder can still send once.
2. Create a deadline task with a near future deadline and near reminder.
   Expected: reminder sends before deadline; after deadline, task becomes `overdue` and stops receiving future reminders.
3. Create a no-deadline task.
   Expected: task always stays `active` until `done` or `cancelled`.

- [ ] **Step 4: Commit in reviewable slices**

Suggested commits:

```bash
git add frontend/src/types/task.ts frontend/src/features/tasks/localTasks.ts frontend/src/features/tasks/selectors.ts frontend/src/utils/taskLabels.ts frontend/tests/localTasks.test.ts frontend/tests/dashboardRecurring.test.ts frontend/src/features/tasks/localTaskRepository.ts
git commit -m "feat: restrict overdue status to deadline-based tasks"

git add backend/app/models/task.py backend/app/schemas/sync.py backend/app/services/task_sync_service.py backend/app/services/task_service.py backend/app/services/reminder_service.py backend/app/services/task_actions.py backend/tests/test_sync_api.py backend/alembic/versions/20260630_0009_deadline_tasks_overdue_status.py
git commit -m "feat: sync overdue status and stop reminders after deadlines"
```

## Self-Review

- Spec coverage: this plan covers the status model, frontend overdue semantics, backend reminder cutoff, migration of existing data, and local Docker verification.
- Placeholder scan: no `TBD`/`TODO` placeholders remain; each task names exact files and commands.
- Type consistency: the plan uses one target status model throughout: `active | overdue | snoozed | done | cancelled`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-30-deadline-overdue-status-sync.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
