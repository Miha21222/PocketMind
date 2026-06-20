import type { UserSettings } from "../../types/settings";
import type { LocalTask, SyncTaskRecord, TaskReminderMode, TaskStatus, TaskType } from "../../types/task";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function toIso(date: Date): string {
  return date.toISOString();
}

function parseIso(value: string | null): number | null {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? null : ts;
}

function timestampOrZero(value: string | null): number {
  return parseIso(value) ?? 0;
}

function generateTaskId(): string {
  const cryptoObject = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (cryptoObject?.randomUUID) {
    return cryptoObject.randomUUID();
  }
  return `task-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function combineDateAndTime(dateMs: number, hhmm: string): number {
  const date = new Date(dateMs);
  const [hours, minutes] = hhmm.split(":").map((part) => Number(part));
  date.setUTCHours(hours || 0, minutes || 0, 0, 0);
  return date.getTime();
}

function nextDailyReminder(nowMs: number, hhmm: string): string {
  let candidate = combineDateAndTime(nowMs, hhmm);
  if (candidate <= nowMs) {
    candidate += DAY_MS;
  }
  return toIso(new Date(candidate));
}

function nextRecurringReminder(nowMs: number, recurrenceRule: string | null, hhmm: string | null): string | null {
  if (!recurrenceRule || !hhmm) return null;
  const upperRule = recurrenceRule.toUpperCase();
  if (upperRule.includes("FREQ=DAILY")) {
    return nextDailyReminder(nowMs, hhmm);
  }
  if (upperRule.includes("FREQ=WEEKLY")) {
    let candidate = nextDailyReminder(nowMs, hhmm);
    const weekdayMatch = upperRule.match(/BYDAY=(MO|TU|WE|TH|FR|SA|SU)/);
    if (!weekdayMatch) return candidate;
    const targetMap: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
    const target = targetMap[weekdayMatch[1]];
    const candidateDate = new Date(candidate);
    const currentDay = candidateDate.getUTCDay();
    const delta = (target - currentDay + 7) % 7;
    candidateDate.setUTCDate(candidateDate.getUTCDate() + delta);
    candidate = toIso(candidateDate);
    if (timestampOrZero(candidate) <= nowMs) {
      candidateDate.setUTCDate(candidateDate.getUTCDate() + 7);
      candidate = toIso(candidateDate);
    }
    return candidate;
  }
  if (upperRule.includes("FREQ=MONTHLY")) {
    const candidateDate = new Date(nextDailyReminder(nowMs, hhmm));
    if (candidateDate.getTime() <= nowMs) {
      candidateDate.setUTCMonth(candidateDate.getUTCMonth() + 1);
    }
    return toIso(candidateDate);
  }
  return null;
}

function capByDeadline(candidate: string | null, deadlineAt: string | null): string | null {
  if (!candidate || !deadlineAt) return candidate;
  return timestampOrZero(candidate) > timestampOrZero(deadlineAt) ? null : candidate;
}

function applyTiming(task: LocalTask, settings: UserSettings, now = new Date()): LocalTask {
  const next: LocalTask = { ...task };
  const nowMs = now.getTime();

  if (next.type === "quick") {
    next.reminder_mode = "none";
    next.reminder_time_local = null;
    next.reminder_interval_hours = null;
    next.deadline_at = null;
    next.recurrence_rule = null;
    next.remind_at = toIso(new Date(nowMs + settings.default_quick_delay_minutes * MINUTE_MS));
    if (next.status !== "done" && next.status !== "cancelled") {
      next.status = "planned";
    }
    return next;
  }

  if (next.type === "deadline" || next.type === "waiting") {
    if (next.reminder_mode === "daily_at_time") {
      next.remind_at = capByDeadline(
        next.reminder_time_local ? nextDailyReminder(nowMs, next.reminder_time_local) : null,
        next.deadline_at,
      );
    } else if (next.reminder_mode === "every_n_hours") {
      const hours = next.reminder_interval_hours ?? 4;
      next.remind_at = capByDeadline(toIso(new Date(nowMs + hours * HOUR_MS)), next.deadline_at);
    } else {
      next.remind_at = null;
    }
    if (next.status !== "done" && next.status !== "cancelled") {
      next.status = next.remind_at ? "planned" : "new";
    }
    return next;
  }

  if (next.type === "recurring") {
    next.deadline_at = null;
    next.reminder_mode = "none";
    next.reminder_interval_hours = null;
    next.remind_at = nextRecurringReminder(nowMs, next.recurrence_rule, next.reminder_time_local);
    if (next.status !== "done" && next.status !== "cancelled") {
      next.status = next.remind_at ? "planned" : "new";
    }
    return next;
  }

  next.reminder_mode = "none";
  next.reminder_time_local = null;
  next.reminder_interval_hours = null;
  if (next.status !== "done" && next.status !== "cancelled") {
    next.status = next.remind_at ? "planned" : "new";
  }
  return next;
}

export interface LocalTaskMutationPayload {
  title: string;
  description?: string | null;
  type: TaskType;
  deadline_at?: string | null;
  reminder_mode?: TaskReminderMode | null;
  reminder_time_local?: string | null;
  reminder_interval_hours?: number | null;
  recurrence_rule?: string | null;
}

export function buildTaskFromPayload(payload: LocalTaskMutationPayload, settings: UserSettings, now = new Date()): LocalTask {
  const nowIso = toIso(now);
  return applyTiming(
    {
      id: generateTaskId(),
      title: payload.title,
      description: payload.description ?? "",
      type: payload.type,
      status: "new",
      deadline_at: payload.deadline_at ?? null,
      remind_at: null,
      reminder_mode: payload.reminder_mode ?? "none",
      reminder_time_local: payload.reminder_time_local ?? null,
      reminder_interval_hours: payload.reminder_interval_hours ?? null,
      snoozed_until: null,
      recurrence_rule: payload.recurrence_rule ?? null,
      created_at: nowIso,
      updated_at: nowIso,
      completed_at: null,
      cancelled_at: null,
      last_reminded_at: null,
      deleted_at: null,
    },
    settings,
    now,
  );
}

export function updateLocalTask(localTask: LocalTask, payload: LocalTaskMutationPayload, settings: UserSettings, now = new Date()): LocalTask {
  return applyTiming(
    {
      ...localTask,
      title: payload.title,
      description: payload.description ?? "",
      type: payload.type,
      deadline_at: payload.deadline_at ?? null,
      reminder_mode: payload.reminder_mode ?? "none",
      reminder_time_local: payload.reminder_time_local ?? null,
      reminder_interval_hours: payload.reminder_interval_hours ?? null,
      recurrence_rule: payload.recurrence_rule ?? null,
      snoozed_until: null,
      updated_at: toIso(now),
      deleted_at: null,
    },
    settings,
    now,
  );
}

export function markLocalTaskDone(task: LocalTask, settings: UserSettings, now = new Date()): LocalTask {
  const nowIso = toIso(now);
  if (task.type === "recurring" && task.recurrence_rule) {
    const nextReminder = nextRecurringReminder(now.getTime(), task.recurrence_rule, task.reminder_time_local);
    if (nextReminder) {
      return {
        ...task,
        status: "planned",
        remind_at: nextReminder,
        snoozed_until: null,
        completed_at: nowIso,
        updated_at: nowIso,
      };
    }
  }

  return {
    ...task,
    status: "done",
    completed_at: nowIso,
    updated_at: nowIso,
    remind_at: null,
    snoozed_until: null,
  };
}

export function cancelLocalTask(task: LocalTask, now = new Date()): LocalTask {
  const nowIso = toIso(now);
  return {
    ...task,
    status: "cancelled",
    cancelled_at: nowIso,
    updated_at: nowIso,
    remind_at: null,
    snoozed_until: null,
  };
}

export function rehydrateLocalTask(remoteTask: SyncTaskRecord): LocalTask {
  return {
    id: remoteTask.client_task_id,
    title: remoteTask.title,
    description: "",
    type: remoteTask.type,
    status: remoteTask.status,
    deadline_at: remoteTask.deadline_at,
    remind_at: remoteTask.remind_at,
    reminder_mode: remoteTask.reminder_mode,
    reminder_time_local: remoteTask.reminder_time_local,
    reminder_interval_hours: remoteTask.reminder_interval_hours,
    snoozed_until: remoteTask.remind_at,
    recurrence_rule: remoteTask.recurrence_rule,
    created_at: remoteTask.updated_at,
    updated_at: remoteTask.updated_at,
    completed_at: remoteTask.completed_at,
    cancelled_at: remoteTask.cancelled_at,
    last_reminded_at: remoteTask.last_reminded_at,
    deleted_at: remoteTask.deleted_at,
  };
}

export function mergeRemoteTaskIntoLocal(localTask: LocalTask, remoteTask: SyncTaskRecord): LocalTask {
  if (timestampOrZero(remoteTask.updated_at) <= timestampOrZero(localTask.updated_at)) {
    return localTask;
  }

  return {
    ...localTask,
    title: remoteTask.title,
    type: remoteTask.type,
    status: remoteTask.status,
    deadline_at: remoteTask.deadline_at,
    remind_at: remoteTask.remind_at,
    reminder_mode: remoteTask.reminder_mode,
    reminder_time_local: remoteTask.reminder_time_local,
    reminder_interval_hours: remoteTask.reminder_interval_hours,
    recurrence_rule: remoteTask.recurrence_rule,
    updated_at: remoteTask.updated_at,
    completed_at: remoteTask.completed_at,
    cancelled_at: remoteTask.cancelled_at,
    last_reminded_at: remoteTask.last_reminded_at,
    deleted_at: remoteTask.deleted_at,
    snoozed_until:
      remoteTask.status === "snoozed" || remoteTask.status === "planned"
        ? remoteTask.remind_at
        : localTask.snoozed_until,
  };
}

export function mergeRemoteTasksIntoLocal(localTasks: LocalTask[], remoteTasks: SyncTaskRecord[]): LocalTask[] {
  const byId = new Map(localTasks.map((task) => [task.id, task]));
  for (const remoteTask of remoteTasks) {
    const current = byId.get(remoteTask.client_task_id);
    byId.set(remoteTask.client_task_id, current ? mergeRemoteTaskIntoLocal(current, remoteTask) : rehydrateLocalTask(remoteTask));
  }
  return [...byId.values()];
}

export function isTaskVisible(task: LocalTask): boolean {
  return task.deleted_at === null;
}

export function sortLocalTasks(tasks: LocalTask[]): LocalTask[] {
  return [...tasks].sort((left, right) => timestampOrZero(right.updated_at) - timestampOrZero(left.updated_at));
}

export function createPlaceholderSyncRecord(task: LocalTask): SyncTaskRecord {
  return {
    client_task_id: task.id,
    title: task.title,
    type: task.type,
    status: task.status,
    deadline_at: task.deadline_at,
    remind_at: task.remind_at,
    reminder_mode: task.reminder_mode,
    reminder_time_local: task.reminder_time_local,
    reminder_interval_hours: task.reminder_interval_hours,
    recurrence_rule: task.recurrence_rule,
    updated_at: task.updated_at,
    deleted_at: task.deleted_at,
    completed_at: task.completed_at,
    cancelled_at: task.cancelled_at,
    last_reminded_at: task.last_reminded_at,
  };
}
