export type TaskType = "quick" | "deadline" | "no_deadline" | "recurring" | "waiting";
export type TaskStatus = "new" | "planned" | "reminded" | "snoozed" | "done" | "cancelled";
export type TaskReminderMode = "none" | "daily_at_time" | "every_n_hours";

export interface Task {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
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
}

export interface TaskListResponse {
  items: Task[];
  total: number;
}
