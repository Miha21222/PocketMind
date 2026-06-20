import { apiRequest } from "./client";
import { LocalTask, SyncBootstrapResponse, SyncTaskRecord } from "../types/task";

export interface SyncTaskPayload {
  title: string;
  description?: string | null;
  type: LocalTask["type"];
  status: LocalTask["status"];
  deadline_at: string | null;
  remind_at: string | null;
  reminder_mode: LocalTask["reminder_mode"];
  reminder_time_local: string | null;
  reminder_interval_hours: number | null;
  recurrence_rule: string | null;
  updated_at: string;
  deleted_at: string | null;
}

interface SyncTaskUpsertResponse {
  applied: boolean;
  task: SyncTaskRecord;
}

interface SyncBatchPayload {
  tasks: Array<SyncTaskPayload & { client_task_id: string }>;
}

export function bootstrapSync(): Promise<SyncBootstrapResponse> {
  return apiRequest<SyncBootstrapResponse>("/sync/bootstrap");
}

export function listSyncChanges(since: string): Promise<SyncBootstrapResponse> {
  const params = new URLSearchParams({ since });
  return apiRequest<SyncBootstrapResponse>(`/sync/changes?${params.toString()}`);
}

export function syncTask(clientTaskId: string, payload: SyncTaskPayload): Promise<SyncTaskUpsertResponse> {
  return apiRequest<SyncTaskUpsertResponse>(`/sync/tasks/${clientTaskId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteSyncTask(clientTaskId: string): Promise<SyncTaskUpsertResponse> {
  return apiRequest<SyncTaskUpsertResponse>(`/sync/tasks/${clientTaskId}`, {
    method: "DELETE",
  });
}

export function syncTaskBatch(payload: SyncBatchPayload): Promise<SyncBootstrapResponse> {
  return apiRequest<SyncBootstrapResponse>("/sync/batch", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
