import { clearTaskCreateDraft, hasTaskCreateDraft, readTaskCreateDraft, writeTaskCreateDraft } from "../src/features/tasks/taskCreateDraft";

class MemoryStorage implements Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function assertEqual<T>(actual: T, expected: T): void {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  }
}

const storage = new MemoryStorage();

writeTaskCreateDraft(
  {
    title: "",
    description: "",
    type: "quick",
    deadline_at: "",
    recurrence_rule: "",
    reminder_mode: "daily_at_time",
    reminder_time_local: "09:00",
    reminder_interval_hours: 4,
  },
  storage,
);
assertEqual(hasTaskCreateDraft(storage), false);
assertEqual(readTaskCreateDraft(storage), undefined);

writeTaskCreateDraft(
  {
    title: "Draft title",
    description: "Draft description",
    type: "deadline",
    deadline_at: "2026-06-24T09:20",
    recurrence_rule: "",
    reminder_mode: "daily_at_time",
    reminder_time_local: "09:00",
    reminder_interval_hours: 4,
  },
  storage,
);

const draft = readTaskCreateDraft(storage);
assertEqual(hasTaskCreateDraft(storage), true);
assertEqual(draft?.title, "Draft title");
assertEqual(draft?.type, "deadline");
assertEqual(draft?.deadline_at, "2026-06-24T09:20");
assertEqual(draft?.reminder_interval_hours, 4);

clearTaskCreateDraft(storage);
assertEqual(readTaskCreateDraft(storage), undefined);

storage.setItem("pocketmind:create-task-draft:v1", "{bad json");
assertEqual(readTaskCreateDraft(storage), undefined);
