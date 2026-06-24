import { TranslationKey } from "../i18n/translations";
import { TaskStatus, TaskType } from "../types/task";

type Translator = (key: TranslationKey) => string;

export function taskTypeLabel(type: TaskType, t: Translator): string {
  const labels: Record<TaskType, TranslationKey> = {
    quick: "quick",
    deadline: "deadline",
    no_deadline: "noDeadline",
    recurring: "recurring",
    waiting: "waiting",
  };

  return t(labels[type]);
}

export function taskStatusLabel(status: TaskStatus, t: Translator): string {
  const labels: Record<TaskStatus, TranslationKey> = {
    new: "taskStatusNew",
    planned: "taskStatusPlanned",
    reminded: "taskStatusReminded",
    snoozed: "taskStatusSnoozed",
    done: "taskStatusDone",
    cancelled: "taskStatusCancelled",
  };

  return t(labels[status]);
}
