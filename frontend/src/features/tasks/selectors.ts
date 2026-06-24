import { Task, TaskStatus, TaskType } from "../../types/task";

export type TaskView = "all" | "active" | "today" | "overdue" | "upcoming" | "waiting" | "completed" | "cancelled" | "no_deadline";

const FINAL_STATUSES: TaskStatus[] = ["done", "cancelled"];

function isFinal(task: Task): boolean {
  return FINAL_STATUSES.includes(task.status);
}

// "Overdue" is a derived status: an active task whose deadline has already
// passed. Shown as the task's status badge and offered as a status filter.
export function isTaskOverdue(task: Task, now = Date.now()): boolean {
  if (isFinal(task)) return false;
  const deadlineTs = toTimestamp(task.deadline_at);
  return deadlineTs !== null && deadlineTs < now;
}

function toTimestamp(value: string | null): number | null {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? null : ts;
}

function getUtcDayRange(now: Date): { start: number; end: number } {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0);
  return { start, end: start + 24 * 60 * 60 * 1000 };
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

export function filterTasksByView(tasks: Task[], view: TaskView, now = new Date()): Task[] {
  const nowTs = now.getTime();
  const { start, end } = getUtcDayRange(now);
  return tasks.filter((task) => {
    const remindTs = toTimestamp(task.remind_at);
    const deadlineTs = toTimestamp(task.deadline_at);

    if (view === "all") return true;
    if (view === "active") return !isFinal(task);
    if (view === "completed") return task.status === "done";
    if (view === "cancelled") return task.status === "cancelled";
    if (view === "waiting") return task.type === "waiting" && !isFinal(task);
    if (view === "overdue") return deadlineTs !== null && deadlineTs < nowTs && !isFinal(task);
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

export function applyTaskFilters(tasks: Task[], view: TaskView, type: TaskType | "all" = "all", now = new Date()): Task[] {
  const byView = filterTasksByView(tasks, view, now);
  const byType = type === "all" ? byView : byView.filter((task) => task.type === type);
  return sortTasks(byType);
}

export type DashboardView = "today" | "tomorrow" | "soon" | "overdue";

// The instant a task is anchored to on the timeline: its reminder if it has
// one, otherwise its deadline. Tasks without either have no place on the scale.
export function primaryTaskInstant(task: Task): string | null {
  return task.remind_at ?? task.deadline_at ?? null;
}

function primaryTaskTimestamp(task: Task): number | null {
  return toTimestamp(task.remind_at) ?? toTimestamp(task.deadline_at);
}

export function getDashboardSchedule(tasks: Task[], view: DashboardView, now = new Date()): Task[] {
  const nowTs = now.getTime();
  const { start: todayStart, end: todayEnd } = getUtcDayRange(now);
  const tomorrowEnd = todayEnd + 24 * 60 * 60 * 1000;

  const filtered = tasks.filter((task) => {
    if (isFinal(task)) return false;

    if (view === "overdue") {
      const deadlineTs = toTimestamp(task.deadline_at);
      return deadlineTs !== null && deadlineTs < nowTs;
    }

    const primaryTs = primaryTaskTimestamp(task);
    if (primaryTs === null) return false;
    if (view === "today") return primaryTs >= todayStart && primaryTs < todayEnd;
    if (view === "tomorrow") return primaryTs >= todayEnd && primaryTs < tomorrowEnd;
    if (view === "soon") return primaryTs >= tomorrowEnd;
    return false;
  });

  return sortTasks(filtered);
}
