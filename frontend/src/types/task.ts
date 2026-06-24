export type TaskType = "quick" | "deadline" | "no_deadline" | "recurring" | "waiting";
// "active" is the single status the app produces for any task that hasn't been
// snoozed, completed or cancelled. The legacy new/planned/reminded values are
// retained only so tasks synced from the backend stay type-safe; they are
// displayed as "active" too.
export type TaskStatus = "active" | "new" | "planned" | "reminded" | "snoozed" | "done" | "cancelled";
export type TaskReminderMode = "none" | "daily_at_time" | "every_n_hours" | "once_at_time";

export interface LocalTask {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  deadline_at: string | null;
  remind_at: string | null;
  reminder_mode: TaskReminderMode;
  reminder_time_local: string | null;
  reminder_interval_hours: number | null;
  snoozed_until: string | null;
  recurrence_rule: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  last_reminded_at: string | null;
  deleted_at: string | null;
}

export type Task = LocalTask;

export interface TaskListResponse {
  items: Task[];
  total: number;
}

export interface SyncTaskRecord {
  client_task_id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  deadline_at: string | null;
  remind_at: string | null;
  reminder_mode: TaskReminderMode;
  reminder_time_local: string | null;
  reminder_interval_hours: number | null;
  recurrence_rule: string | null;
  updated_at: string;
  deleted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  last_reminded_at: string | null;
}

export interface SyncBootstrapResponse {
  items: SyncTaskRecord[];
  server_time: string;
}
