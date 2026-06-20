import { mergeRemoteTaskIntoLocal, rehydrateLocalTask } from "../src/features/tasks/localTasks";
import type { LocalTask, SyncTaskRecord } from "../src/types/task";

function assertEqual<T>(actual: T, expected: T): void {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  }
}

function buildLocalTask(updatedAt: string): LocalTask {
  return {
    id: "local-1",
    title: "Local title",
    description: "Keep this description",
    type: "deadline",
    status: "planned",
    deadline_at: "2026-06-15T12:00:00.000Z",
    remind_at: "2026-06-15T09:00:00.000Z",
    reminder_mode: "daily_at_time",
    reminder_time_local: "09:00",
    reminder_interval_hours: 4,
    snoozed_until: null,
    recurrence_rule: null,
    created_at: "2026-06-15T08:00:00.000Z",
    updated_at: updatedAt,
    completed_at: null,
    cancelled_at: null,
    last_reminded_at: null,
    deleted_at: null,
  };
}

function buildRemoteTask(updatedAt: string, status: SyncTaskRecord["status"]): SyncTaskRecord {
  return {
    client_task_id: "local-1",
    title: "Remote title",
    type: "deadline",
    status,
    deadline_at: "2026-06-15T12:00:00.000Z",
    remind_at: "2026-06-15T10:30:00.000Z",
    reminder_mode: "daily_at_time",
    reminder_time_local: "10:30",
    reminder_interval_hours: 4,
    recurrence_rule: null,
    updated_at: updatedAt,
    deleted_at: null,
    completed_at: status === "done" ? updatedAt : null,
    cancelled_at: null,
    last_reminded_at: updatedAt,
  };
}

{
  const local = buildLocalTask("2026-06-15T09:00:00.000Z");
  const remote = buildRemoteTask("2026-06-15T10:00:00.000Z", "done");
  const merged = mergeRemoteTaskIntoLocal(local, remote);

  assertEqual(merged.status, "done");
  assertEqual(merged.title, "Remote title");
  assertEqual(merged.description, "Keep this description");
  assertEqual(merged.reminder_time_local, "10:30");
  assertEqual(merged.completed_at, "2026-06-15T10:00:00.000Z");
}

{
  const local = buildLocalTask("2026-06-15T11:00:00.000Z");
  const remote = buildRemoteTask("2026-06-15T10:00:00.000Z", "done");
  const merged = mergeRemoteTaskIntoLocal(local, remote);

  assertEqual(merged.status, "planned");
  assertEqual(merged.title, "Local title");
  assertEqual(merged.reminder_time_local, "09:00");
}

{
  const remote = buildRemoteTask("2026-06-15T10:00:00.000Z", "planned");
  const rehydrated = rehydrateLocalTask(remote);

  assertEqual(rehydrated.id, "local-1");
  assertEqual(rehydrated.description, "");
  assertEqual(rehydrated.title, "Remote title");
}
