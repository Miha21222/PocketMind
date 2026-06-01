import { apiRequest } from "./client";
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
  title?: string;
  description?: string | null;
  type?: TaskType;
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
  const params = new URLSearchParams();
  params.set("view", filters.view ?? "active");
  if (filters.type && filters.type !== "all") {
    params.set("type", filters.type);
  }
  return apiRequest<TaskListResponse>(`/tasks?${params.toString()}`);
}

export function createTask(payload: TaskCreatePayload): Promise<Task> {
  return apiRequest<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getTask(taskId: number): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}`);
}

export function updateTask(taskId: number, payload: TaskUpdatePayload): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function markTaskDone(taskId: number): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}/done`, { method: "POST" });
}

export function snoozeTask(taskId: number, minutes: number): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}/snooze`, {
    method: "POST",
    body: JSON.stringify({ minutes }),
  });
}

export function cancelTask(taskId: number): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}/cancel`, { method: "POST" });
}

export function rescheduleTask(taskId: number, remindAt: string | null, deadlineAt: string | null): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}/reschedule`, {
    method: "POST",
    body: JSON.stringify({ remind_at: remindAt, deadline_at: deadlineAt }),
  });
}
