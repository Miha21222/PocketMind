import { bootstrapSync, deleteSyncTask, syncTask, syncTaskBatch, type SyncTaskPayload } from "../../api/sync";
import type { UserSettings } from "../../types/settings";
import type { LocalTask, Task, TaskListResponse } from "../../types/task";
import {
  buildTaskFromPayload,
  cancelLocalTask,
  createPlaceholderSyncRecord,
  isTaskVisible,
  markLocalTaskDone,
  mergeRemoteTaskIntoLocal,
  mergeRemoteTasksIntoLocal,
  sortLocalTasks,
  updateLocalTask,
  type LocalTaskMutationPayload,
} from "./localTasks";

const STORAGE_KEY = "pocketmind.tasks.v2";

function readTaskStore(): LocalTask[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalTask[]) : [];
  } catch {
    return [];
  }
}

function writeTaskStore(tasks: LocalTask[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function replaceTask(tasks: LocalTask[], task: LocalTask): LocalTask[] {
  const next = tasks.filter((item) => item.id !== task.id);
  next.push(task);
  return next;
}

function toSyncPayload(task: LocalTask): SyncTaskPayload {
  return {
    title: task.title,
    description: task.description || null,
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
  };
}

function buildListResponse(tasks: Task[]): TaskListResponse {
  const items = sortLocalTasks(tasks);
  return { items, total: items.length };
}

async function persistTaskWithSync(task: LocalTask): Promise<LocalTask> {
  const localTasks = replaceTask(readTaskStore(), task);
  writeTaskStore(localTasks);

  try {
    const synced =
      task.deleted_at !== null
        ? await deleteSyncTask(task.id)
        : await syncTask(task.id, toSyncPayload(task));
    const merged = mergeRemoteTaskIntoLocal(task, synced.task);
    const nextTasks = replaceTask(readTaskStore(), merged);
    writeTaskStore(nextTasks);
    return merged;
  } catch {
    return task;
  }
}

export async function listLocalTasks(): Promise<TaskListResponse> {
  return buildListResponse(readTaskStore().filter(isTaskVisible));
}

export async function getLocalTask(taskId: string): Promise<Task> {
  const task = readTaskStore().find((item) => item.id === taskId && item.deleted_at === null);
  if (!task) {
    throw new Error("Task not found");
  }
  return task;
}

export async function createLocalTask(payload: LocalTaskMutationPayload, settings: UserSettings): Promise<Task> {
  const task = buildTaskFromPayload(payload, settings);
  return persistTaskWithSync(task);
}

export async function updateStoredTask(taskId: string, payload: LocalTaskMutationPayload, settings: UserSettings): Promise<Task> {
  const current = await getLocalTask(taskId);
  const nextTask = updateLocalTask(current, payload, settings);
  return persistTaskWithSync(nextTask);
}

export async function markStoredTaskDone(taskId: string, settings: UserSettings): Promise<Task> {
  const current = await getLocalTask(taskId);
  const nextTask = markLocalTaskDone(current, settings);
  return persistTaskWithSync(nextTask);
}

export async function cancelStoredTask(taskId: string): Promise<Task> {
  const current = await getLocalTask(taskId);
  const nextTask = cancelLocalTask(current);
  return persistTaskWithSync(nextTask);
}

export async function bootstrapTaskSync(): Promise<Task[]> {
  const localTasks = readTaskStore();
  try {
    const response =
      localTasks.length > 0
        ? await syncTaskBatch({
            tasks: localTasks.map((task) => ({
              client_task_id: task.id,
              ...toSyncPayload(task),
            })),
          })
        : await bootstrapSync();
    const merged = mergeRemoteTasksIntoLocal(localTasks, response.items);
    writeTaskStore(merged);
    return sortLocalTasks(merged.filter(isTaskVisible));
  } catch {
    return sortLocalTasks(localTasks.filter(isTaskVisible));
  }
}

export async function mergeRemoteSnapshotIntoStore(): Promise<Task[]> {
  const localTasks = readTaskStore();
  try {
    const response = await bootstrapSync();
    const merged = mergeRemoteTasksIntoLocal(localTasks, response.items);
    writeTaskStore(merged);
    return sortLocalTasks(merged.filter(isTaskVisible));
  } catch {
    return sortLocalTasks(localTasks.filter(isTaskVisible));
  }
}

export function exportSyncSnapshot(): ReturnType<typeof createPlaceholderSyncRecord>[] {
  return readTaskStore().map((task) => createPlaceholderSyncRecord(task));
}
