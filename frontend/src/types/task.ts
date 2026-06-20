export type TaskType = "quick" | "deadline" | "no_deadline" | "recurring" | "waiting";
export type TaskStatus = "new" | "planned" | "reminded" | "snoozed" | "done" | "cancelled";
export type TaskReminderMode = "none" | "daily_at_time" | "every_n_hours";

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
