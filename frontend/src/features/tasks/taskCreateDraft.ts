import { TaskReminderMode, TaskType } from "../../types/task";

export const TASK_CREATE_DRAFT_KEY = "pocketmind:create-task-draft:v1";
export const TASK_CREATE_DRAFT_UPDATED_EVENT = "pocketmind:task-create-draft-updated";

export interface TaskCreateDraftValues {
  title: string;
  description: string;
  type: TaskType;
  deadline_at: string;
  recurrence_rule: string;
  reminder_mode: TaskReminderMode;
  reminder_time_local: string;
  reminder_interval_hours: number;
}

interface DraftStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

type DraftWindow = Window & {
  __pocketmindTaskDraftStorage?: DraftStorage;
};

function createMemoryStorage(): DraftStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function browserStorage(): DraftStorage | undefined {
  if (typeof window === "undefined") return undefined;
  const draftWindow = window as DraftWindow;

  try {
    if (draftWindow.localStorage) return draftWindow.localStorage;
  } catch {
    // Some webview-like environments expose storage getters that throw.
  }

  try {
    if (draftWindow.sessionStorage) return draftWindow.sessionStorage;
  } catch {
    // Fall back to in-memory storage for SPA route transitions.
  }

  if (!draftWindow.__pocketmindTaskDraftStorage) {
    draftWindow.__pocketmindTaskDraftStorage = createMemoryStorage();
  }
  return draftWindow.__pocketmindTaskDraftStorage;
}

function readString(source: Record<string, unknown>, key: keyof TaskCreateDraftValues): string | undefined {
  const value = source[key];
  return typeof value === "string" ? value : undefined;
}

function notifyTaskCreateDraftUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TASK_CREATE_DRAFT_UPDATED_EVENT));
}

export function isTaskCreateDraftMeaningful(values: Partial<TaskCreateDraftValues> | undefined): boolean {
  if (!values) return false;
  return Boolean(
    values.title?.trim() ||
      values.description?.trim() ||
      values.deadline_at?.trim() ||
      values.recurrence_rule?.trim() ||
      (values.type && values.type !== "quick"),
  );
}

export function readTaskCreateDraft(storage = browserStorage()): Partial<TaskCreateDraftValues> | undefined {
  if (!storage) return undefined;

  try {
    const raw = storage.getItem(TASK_CREATE_DRAFT_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;

    const source = parsed as Record<string, unknown>;
    const draft: Partial<TaskCreateDraftValues> = {};
    const stringFields: Array<keyof TaskCreateDraftValues> = [
      "title",
      "description",
      "type",
      "deadline_at",
      "recurrence_rule",
      "reminder_mode",
      "reminder_time_local",
    ];

    stringFields.forEach((key) => {
      const value = readString(source, key);
      if (value !== undefined) {
        draft[key] = value as never;
      }
    });

    if (typeof source.reminder_interval_hours === "number" && Number.isFinite(source.reminder_interval_hours)) {
      draft.reminder_interval_hours = source.reminder_interval_hours;
    }

    return Object.keys(draft).length > 0 ? draft : undefined;
  } catch {
    return undefined;
  }
}

export function writeTaskCreateDraft(values: TaskCreateDraftValues, storage = browserStorage()): void {
  if (!storage) return;

  try {
    if (!isTaskCreateDraftMeaningful(values)) {
      storage.removeItem(TASK_CREATE_DRAFT_KEY);
      notifyTaskCreateDraftUpdated();
      return;
    }
    storage.setItem(TASK_CREATE_DRAFT_KEY, JSON.stringify(values));
    notifyTaskCreateDraftUpdated();
  } catch {
    // Draft persistence should never block task creation or editing.
  }
}

export function hasTaskCreateDraft(storage = browserStorage()): boolean {
  return isTaskCreateDraftMeaningful(readTaskCreateDraft(storage));
}

export function clearTaskCreateDraft(storage = browserStorage()): void {
  if (!storage) return;

  try {
    storage.removeItem(TASK_CREATE_DRAFT_KEY);
    notifyTaskCreateDraftUpdated();
  } catch {
    // Ignore storage failures; the draft is a convenience layer.
  }
}
