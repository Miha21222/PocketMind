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
  // A task stays "active" until it is snoozed, completed or cancelled. The
  // legacy new/planned/reminded values collapse into the same active label.
  if (status === "snoozed") return t("taskStatusSnoozed");
  if (status === "done") return t("taskStatusDone");
  if (status === "cancelled") return t("taskStatusCancelled");
  return t("taskStatusActive");
}
