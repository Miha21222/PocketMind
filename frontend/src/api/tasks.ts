import { createLocalTask, getLocalTask, listLocalTasks, updateStoredTask, markStoredTaskDone, cancelStoredTask, deleteStoredTask, bootstrapTaskSync } from "../features/tasks/localTaskRepository";
import { UserSettings } from "../types/settings";
import { Task, TaskListResponse, TaskReminderMode, TaskType } from "../types/task";

export interface TaskCreatePayload {
  title: string;
  description?: string;
  type: TaskType;
  deadline_at?: string | null;
  remind_at?: string | null;
  reminder_mode?: TaskReminderMode | null;
  reminder_time_local?: string | null;
  reminder_interval_hours?: number | null;
  recurrence_rule?: string | null;
}

export interface TaskUpdatePayload {
  title: string;
  description?: string | null;
  type: TaskType;
  deadline_at?: string | null;
  remind_at?: string | null;
  reminder_mode?: TaskReminderMode | null;
  reminder_time_local?: string | null;
  reminder_interval_hours?: number | null;
  recurrence_rule?: string | null;
}

export interface TaskListFilters {
  view?: string;
  type?: TaskType | "all";
}

export function listTasks(filters: TaskListFilters = {}): Promise<TaskListResponse> {
  void filters;
  return listLocalTasks();
}

export function createTask(payload: TaskCreatePayload, settings: UserSettings): Promise<Task> {
  return createLocalTask(payload, settings);
}

export function getTask(taskId: string): Promise<Task> {
  return getLocalTask(taskId);
}

export function updateTask(taskId: string, payload: TaskUpdatePayload, settings: UserSettings): Promise<Task> {
  return updateStoredTask(taskId, payload, settings);
}

export function markTaskDone(taskId: string, settings: UserSettings): Promise<Task> {
  return markStoredTaskDone(taskId, settings);
}

export function snoozeTask(taskId: string, minutes: number): Promise<Task> {
  void taskId;
  void minutes;
  return Promise.reject(new Error("Snooze is handled from bot reminders"));
}

export function cancelTask(taskId: string): Promise<Task> {
  return cancelStoredTask(taskId);
}

export function deleteTask(taskId: string): Promise<Task> {
  return deleteStoredTask(taskId);
}

export function rescheduleTask(taskId: string, remindAt: string | null, deadlineAt: string | null): Promise<Task> {
  void taskId;
  void remindAt;
  void deadlineAt;
  return Promise.reject(new Error("Reschedule is not exposed in the static local-first flow"));
}

export function syncTasksWithBackend(): Promise<Task[]> {
  return bootstrapTaskSync();
}
