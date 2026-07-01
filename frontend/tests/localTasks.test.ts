import { buildTaskFromPayload, deleteLocalTask, isTaskVisible, mergeRemoteTaskIntoLocal, normalizeDeadlineOverdue, normalizeTasksForSyncBootstrap, rehydrateLocalTask } from "../src/features/tasks/localTasks";
import { taskListViewForTask } from "../src/features/tasks/selectors";
import { fromLocalDateInput, toLocalDateInput } from "../src/utils/dateTime";
import type { UserSettings } from "../src/types/settings";
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
    status: "active",
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
    description: null,
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

const kyivSettings: UserSettings = {
  language: "en",
  timezone: "Europe/Kyiv",
  default_snooze_minutes: 15,
  default_quick_delay_minutes: 10,
  default_deadline_reminder_mode: "daily_at_time",
  default_deadline_reminder_time_local: "09:00",
  default_deadline_reminder_interval_hours: 4,
  default_waiting_reminder_mode: "daily_at_time",
  default_waiting_reminder_time_local: "10:00",
  default_waiting_reminder_interval_hours: 4,
  default_recurring_reminder_time_local: "09:00",
};

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

  assertEqual(merged.status, "active");
  assertEqual(merged.title, "Local title");
  assertEqual(merged.reminder_time_local, "09:00");
}

{
  const remote = buildRemoteTask("2026-06-15T10:00:00.000Z", "active");
  const rehydrated = rehydrateLocalTask(remote);

  assertEqual(rehydrated.id, "local-1");
  assertEqual(rehydrated.description, "");
  assertEqual(rehydrated.title, "Remote title");
}

{
  const overdueDeadline = normalizeDeadlineOverdue(
    {
      ...buildLocalTask("2026-06-15T12:05:00.000Z"),
      deadline_at: "2026-06-15T12:00:00.000Z",
      remind_at: "2026-06-15T11:00:00.000Z",
      snoozed_until: "2026-06-15T11:15:00.000Z",
    },
    new Date("2026-06-15T12:05:00.000Z"),
  );

  assertEqual(overdueDeadline.status, "overdue");
  assertEqual(overdueDeadline.remind_at, null);
  assertEqual(overdueDeadline.snoozed_until, null);
}

{
  const overdueWaiting = normalizeDeadlineOverdue(
    {
      ...buildLocalTask("2026-06-15T12:10:00.000Z"),
      type: "waiting",
      deadline_at: "2026-06-15T12:00:00.000Z",
      remind_at: "2026-06-15T11:00:00.000Z",
      snoozed_until: "2026-06-15T11:30:00.000Z",
    },
    new Date("2026-06-15T12:10:00.000Z"),
  );

  assertEqual(overdueWaiting.status, "overdue");
  assertEqual(overdueWaiting.remind_at, null);
  assertEqual(overdueWaiting.snoozed_until, null);
}

{
  const quickTask = normalizeDeadlineOverdue(
    {
      ...buildLocalTask("2026-06-15T12:05:00.000Z"),
      type: "quick",
      deadline_at: null,
      remind_at: "2026-06-15T11:00:00.000Z",
      recurrence_rule: null,
    },
    new Date("2026-06-15T12:05:00.000Z"),
  );

  assertEqual(quickTask.status, "active");
  assertEqual(quickTask.remind_at, "2026-06-15T11:00:00.000Z");
}

{
  const remote = buildRemoteTask("2026-06-15T12:10:00.000Z", "overdue");
  const rehydrated = rehydrateLocalTask(remote, new Date("2026-06-15T12:10:00.000Z"));

  assertEqual(rehydrated.status, "overdue");
  assertEqual(rehydrated.remind_at, null);
  assertEqual(rehydrated.snoozed_until, null);
}

{
  const normalizedFutureOverdue = normalizeDeadlineOverdue(
    {
      ...buildLocalTask("2026-06-15T10:00:00.000Z"),
      status: "overdue",
      deadline_at: "2026-06-15T12:00:00.000Z",
      remind_at: null,
      snoozed_until: null,
    },
    new Date("2026-06-15T10:00:00.000Z"),
  );

  assertEqual(normalizedFutureOverdue.status, "active");
}

{
  const remote = buildRemoteTask("2026-06-15T10:00:00.000Z", "overdue");
  const rehydrated = rehydrateLocalTask(remote, new Date("2026-06-15T10:00:00.000Z"));

  assertEqual(rehydrated.status, "active");
}

{
  const reopenedTasks = normalizeTasksForSyncBootstrap(
    [
      {
        ...buildLocalTask("2026-06-15T12:10:00.000Z"),
        status: "active",
        deadline_at: "2026-06-15T12:00:00.000Z",
        remind_at: "2026-06-15T11:00:00.000Z",
        snoozed_until: "2026-06-15T11:30:00.000Z",
      },
    ] satisfies LocalTask[],
    new Date("2026-06-15T12:10:00.000Z"),
  );

  assertEqual(reopenedTasks[0]?.status, "overdue");
  assertEqual(reopenedTasks[0]?.remind_at, null);
  assertEqual(reopenedTasks[0]?.snoozed_until, null);
}

{
  const task = buildTaskFromPayload(
    {
      title: "Daily Kyiv reminder",
      type: "recurring",
      recurrence_rule: "RRULE:FREQ=DAILY",
      reminder_time_local: "09:00",
    },
    kyivSettings,
    new Date("2026-06-26T12:05:00.000Z"),
  );

  assertEqual(task.remind_at, "2026-06-27T06:00:00.000Z");
}

{
  const task = buildTaskFromPayload(
    {
      title: "Inbox task",
      type: "no_deadline",
    },
    kyivSettings,
    new Date("2026-06-26T12:05:00.000Z"),
  );

  assertEqual(task.status, "active");
  assertEqual(task.remind_at, null);
}

{
  const stored = fromLocalDateInput("2026-06-27", "Europe/Kyiv");

  assertEqual(stored, "2026-06-27T20:59:00.000Z");
  assertEqual(toLocalDateInput(stored, "Europe/Kyiv"), "2026-06-27");
}

{
  const task = buildLocalTask("2026-06-15T09:00:00.000Z");
  const deleted = deleteLocalTask(task, new Date("2026-06-15T13:00:00.000Z"));

  assertEqual(deleted.status, "cancelled");
  assertEqual(deleted.deleted_at, "2026-06-15T13:00:00.000Z");
  assertEqual(deleted.cancelled_at, "2026-06-15T13:00:00.000Z");
  assertEqual(deleted.updated_at, "2026-06-15T13:00:00.000Z");
  assertEqual(deleted.remind_at, null);
  assertEqual(isTaskVisible(deleted), false);
}

{
  const doneTask = { ...buildLocalTask("2026-06-15T09:00:00.000Z"), status: "done" as const };
  const cancelledTask = { ...buildLocalTask("2026-06-15T09:00:00.000Z"), status: "cancelled" as const };
  const overdueDeadlineTask = {
    ...buildLocalTask("2026-06-15T09:00:00.000Z"),
    type: "deadline" as const,
    status: "active" as const,
    deadline_at: "2026-06-15T12:00:00.000Z",
  };
  const activeTask = { ...buildLocalTask("2026-06-15T09:00:00.000Z"), status: "active" as const, deadline_at: null };

  assertEqual(taskListViewForTask(doneTask), "completed");
  assertEqual(taskListViewForTask(cancelledTask), "cancelled");
  assertEqual(taskListViewForTask(overdueDeadlineTask, new Date("2026-06-15T13:00:00.000Z").getTime()), "overdue");
  assertEqual(taskListViewForTask(activeTask), "active");
}
