import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTask } from "../api/tasks";
import { TaskForm, TaskFormValues } from "../components/TaskForm";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { useToast } from "../contexts/ToastContext";
import { scheduleTasksBackgroundRefresh, updateTaskInCache } from "../features/tasks/cache";
import { clearTaskCreateDraft, readTaskCreateDraft, writeTaskCreateDraft } from "../features/tasks/taskCreateDraft";
import { fromLocalDateInput } from "../utils/dateTime";
import { hapticNotification } from "../utils/haptics";

function usesReminderTime(values: TaskFormValues): boolean {
  return values.type === "recurring" || values.reminder_mode === "daily_at_time" || values.reminder_mode === "once_at_time";
}

export function TaskCreatePage() {
  const { t, settings } = useAppSettings();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draftInitial] = useState(() => readTaskCreateDraft());
  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createTask>[0]) => createTask(payload, settings),
    onSuccess: (task) => {
      updateTaskInCache(queryClient, task);
      scheduleTasksBackgroundRefresh(queryClient);
    },
  });

  const handleSubmit = async (values: TaskFormValues) => {
    const payload = {
      title: values.title,
      description: values.description || undefined,
      type: values.type,
      deadline_at: values.type === "deadline" ? fromLocalDateInput(values.deadline_at) : null,
      reminder_mode: values.type === "deadline" || values.type === "waiting" ? values.reminder_mode : null,
      reminder_time_local: usesReminderTime(values) ? values.reminder_time_local || null : null,
      reminder_interval_hours:
        values.type !== "recurring" && values.reminder_mode === "every_n_hours" ? values.reminder_interval_hours : null,
      recurrence_rule: values.type === "recurring" ? values.recurrence_rule || null : null,
    };
    try {
      await createMutation.mutateAsync(payload);
      clearTaskCreateDraft();
      hapticNotification("success");
      showToast({ tone: "success", message: t("taskCreated") });
      navigate("/tasks");
    } catch {
      hapticNotification("error");
      showToast({ tone: "error", message: t("failedCreateTask") });
    }
  };
  const handleDraftChange = useCallback((values: TaskFormValues) => writeTaskCreateDraft(values), []);
  const handleDeleteDraft = useCallback(() => clearTaskCreateDraft(), []);

  return (
    <section className="grid-section">
      {createMutation.error && <p className="error">{t("failedCreateTask")}</p>}
      <TaskForm initial={draftInitial} onSubmit={handleSubmit} onValuesChange={handleDraftChange} onDelete={handleDeleteDraft} />
    </section>
  );
}
