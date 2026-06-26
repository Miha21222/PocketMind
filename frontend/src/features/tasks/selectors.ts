import { Task, TaskStatus, TaskType } from "../../types/task";
import { addDaysToDayKey, addMonthsToDayKey, getZonedDayRange, zonedDateTimeToUtcTimestamp, zonedDayKeyFromTimestamp } from "../../utils/dateTime";

export type TaskView = "all" | "active" | "today" | "overdue" | "upcoming" | "waiting" | "completed" | "cancelled" | "no_deadline";

const FINAL_STATUSES: TaskStatus[] = ["done", "cancelled"];
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function isFinal(task: Task): boolean {
  return FINAL_STATUSES.includes(task.status);
}

function toTimestamp(value: string | null): number | null {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? null : ts;
}

function toIso(timestamp: number | null): string | null {
  return timestamp === null ? null : new Date(timestamp).toISOString();
}

function nextDailyReminderTimestamp(nowTs: number, hhmm: string, timezone: string): number | null {
  const todayKey = zonedDayKeyFromTimestamp(nowTs, timezone);
  let candidate = zonedDateTimeToUtcTimestamp(todayKey, hhmm, timezone);
  if (candidate === null) return null;
  if (candidate <= nowTs) {
    candidate = zonedDateTimeToUtcTimestamp(addDaysToDayKey(todayKey, 1), hhmm, timezone);
  }
  return candidate;
}

function nextRecurringReminderTimestamp(nowTs: number, recurrenceRule: string | null, hhmm: string | null, timezone: string): number | null {
  if (!recurrenceRule || !hhmm) return null;
  const upperRule = recurrenceRule.toUpperCase();
  if (upperRule.includes("FREQ=DAILY")) {
    return nextDailyReminderTimestamp(nowTs, hhmm, timezone);
  }
  if (upperRule.includes("FREQ=WEEKLY")) {
    let candidate = nextDailyReminderTimestamp(nowTs, hhmm, timezone);
    const weekdayMatch = upperRule.match(/BYDAY=(MO|TU|WE|TH|FR|SA|SU)/);
    if (!weekdayMatch) return candidate;
    if (candidate === null) return null;
    const targetMap: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
    const target = targetMap[weekdayMatch[1]];
    const candidateDay = zonedDayKeyFromTimestamp(candidate, timezone);
    const currentDay = new Date(`${candidateDay}T00:00:00.000Z`).getUTCDay();
    const delta = (target - currentDay + 7) % 7;
    return zonedDateTimeToUtcTimestamp(addDaysToDayKey(candidateDay, delta), hhmm, timezone);
  }
  if (upperRule.includes("FREQ=MONTHLY")) {
    const todayKey = zonedDayKeyFromTimestamp(nowTs, timezone);
    const todayCandidate = zonedDateTimeToUtcTimestamp(todayKey, hhmm, timezone);
    if (todayCandidate !== null && todayCandidate > nowTs) {
      return todayCandidate;
    }
    return zonedDateTimeToUtcTimestamp(addMonthsToDayKey(todayKey, 1), hhmm, timezone);
  }
  return null;
}

function capByDeadline(candidateTs: number | null, deadlineAt: string | null): number | null {
  const deadlineTs = toTimestamp(deadlineAt);
  if (candidateTs === null || deadlineTs === null) return candidateTs;
  return candidateTs > deadlineTs ? null : candidateTs;
}

function currentTaskScheduleTimestamp(task: Task): number | null {
  return toTimestamp(task.remind_at) ?? toTimestamp(task.deadline_at);
}

function taskActivationTimestamp(task: Task): number {
  return toTimestamp(task.created_at) ?? 0;
}

function isActionableOccurrence(task: Task, scheduleTs: number | null): scheduleTs is number {
  return scheduleTs !== null && scheduleTs >= taskActivationTimestamp(task);
}

function nextTaskScheduleTimestamp(task: Task, nowTs: number, timezone: string): number | null {
  if (task.type === "recurring") {
    return nextRecurringReminderTimestamp(nowTs, task.recurrence_rule, task.reminder_time_local, timezone);
  }

  if (task.type === "deadline" || task.type === "waiting") {
    if (task.reminder_mode === "daily_at_time") {
      return capByDeadline(
        task.reminder_time_local ? nextDailyReminderTimestamp(nowTs, task.reminder_time_local, timezone) : null,
        task.deadline_at,
      );
    }

    if (task.reminder_mode === "every_n_hours") {
      const intervalHours = task.reminder_interval_hours ?? 4;
      const intervalMs = intervalHours * HOUR_MS;
      let candidate = toTimestamp(task.remind_at) ?? nowTs + intervalMs;
      while (candidate <= nowTs) {
        candidate += intervalMs;
      }
      return capByDeadline(candidate, task.deadline_at);
    }
  }

  const currentTs = currentTaskScheduleTimestamp(task);
  return currentTs !== null && currentTs > nowTs ? currentTs : null;
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((left, right) => {
    const leftRemind = toTimestamp(left.remind_at);
    const rightRemind = toTimestamp(right.remind_at);
    if (leftRemind !== rightRemind) {
      if (leftRemind === null) return 1;
      if (rightRemind === null) return -1;
      return leftRemind - rightRemind;
    }

    const leftDeadline = toTimestamp(left.deadline_at);
    const rightDeadline = toTimestamp(right.deadline_at);
    if (leftDeadline !== rightDeadline) {
      if (leftDeadline === null) return 1;
      if (rightDeadline === null) return -1;
      return leftDeadline - rightDeadline;
    }

    const leftCreated = toTimestamp(left.created_at) ?? 0;
    const rightCreated = toTimestamp(right.created_at) ?? 0;
    return rightCreated - leftCreated;
  });
}

// "Overdue" is a derived status: an active task whose current actionable instant
// is already behind it, whether that instant came from a reminder or a deadline.
export function isTaskOverdue(task: Task, now = Date.now()): boolean {
  if (isFinal(task)) return false;
  const scheduleTs = currentTaskScheduleTimestamp(task);
  return isActionableOccurrence(task, scheduleTs) && scheduleTs < now;
}

export function filterTasksByView(tasks: Task[], view: TaskView, now = new Date(), timezone = "UTC"): Task[] {
  const nowTs = now.getTime();
  const { start, end } = getZonedDayRange(now, timezone);
  return tasks.filter((task) => {
    const remindTs = toTimestamp(task.remind_at);
    const deadlineTs = toTimestamp(task.deadline_at);

    if (view === "all") return true;
    if (view === "active") return !isFinal(task);
    if (view === "completed") return task.status === "done";
    if (view === "cancelled") return task.status === "cancelled";
    if (view === "waiting") return task.type === "waiting" && !isFinal(task);
    if (view === "overdue") return isTaskOverdue(task, nowTs);
    if (view === "upcoming") return remindTs !== null && remindTs > nowTs && !isFinal(task);
    if (view === "no_deadline") return deadlineTs === null && !isFinal(task);
    if (view === "today") {
      if (isFinal(task)) return false;
      const deadlineInRange = deadlineTs !== null && deadlineTs >= start && deadlineTs < end;
      const remindInRange = remindTs !== null && remindTs >= start && remindTs < end;
      return deadlineInRange || remindInRange;
    }
    return true;
  });
}

export function applyTaskFilters(
  tasks: Task[],
  view: TaskView,
  type: TaskType | "all" = "all",
  now = new Date(),
  timezone = "UTC",
): Task[] {
  const byView = filterTasksByView(tasks, view, now, timezone);
  const byType = type === "all" ? byView : byView.filter((task) => task.type === type);
  return sortTasks(byType);
}

export type DashboardView = "today" | "tomorrow" | "soon" | "overdue";

export function primaryTaskInstant(task: Task): string | null {
  return task.remind_at ?? task.deadline_at ?? null;
}

function primaryTaskTimestamp(task: Task): number | null {
  return toTimestamp(task.remind_at) ?? toTimestamp(task.deadline_at);
}

function dashboardInstantTimestamp(task: Task, view: DashboardView, nowTs: number, timezone: string): number | null {
  if (view === "overdue") {
    return currentTaskScheduleTimestamp(task);
  }
  return nextTaskScheduleTimestamp(task, nowTs, timezone);
}

export function getDashboardTaskInstant(task: Task, view: DashboardView, now = new Date(), timezone = "UTC"): string | null {
  return toIso(dashboardInstantTimestamp(task, view, now.getTime(), timezone));
}

export function getDashboardSchedule(tasks: Task[], view: DashboardView, now = new Date(), timezone = "UTC"): Task[] {
  const nowTs = now.getTime();
  const { end: todayEnd } = getZonedDayRange(now, timezone);
  const tomorrowEnd = todayEnd + DAY_MS;

  const filtered = tasks.filter((task) => {
    if (isFinal(task)) return false;

    if (view === "overdue") {
      return isTaskOverdue(task, nowTs);
    }

    const nextTs = dashboardInstantTimestamp(task, view, nowTs, timezone);
    if (nextTs === null) return false;
    if (view === "today") return nextTs >= nowTs && nextTs < todayEnd;
    if (view === "tomorrow") return nextTs >= todayEnd && nextTs < tomorrowEnd;
    if (view === "soon") return nextTs >= todayEnd;
    return false;
  });

  return [...filtered].sort((left, right) => {
    const leftTs = dashboardInstantTimestamp(left, view, nowTs, timezone) ?? primaryTaskTimestamp(left) ?? Number.MAX_SAFE_INTEGER;
    const rightTs = dashboardInstantTimestamp(right, view, nowTs, timezone) ?? primaryTaskTimestamp(right) ?? Number.MAX_SAFE_INTEGER;
    if (leftTs !== rightTs) return leftTs - rightTs;

    const leftCreated = toTimestamp(left.created_at) ?? 0;
    const rightCreated = toTimestamp(right.created_at) ?? 0;
    return rightCreated - leftCreated;
  });
}
