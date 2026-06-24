import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTask } from "../api/tasks";
import { TaskForm, TaskFormValues } from "../components/TaskForm";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { useToast } from "../contexts/ToastContext";
import { scheduleTasksBackgroundRefresh, updateTaskInCache } from "../features/tasks/cache";
import { fromLocalDateTimeInput } from "../utils/dateTime";

function toIsoOrNull(value: string): string | null {
  return fromLocalDateTimeInput(value);
}

export function TaskCreatePage() {
  const { t, settings } = useAppSettings();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
      deadline_at: toIsoOrNull(values.deadline_at),
      reminder_mode: values.type === "deadline" || values.type === "waiting" ? values.reminder_mode : null,
      reminder_time_local:
        values.type === "recurring" || values.reminder_mode === "daily_at_time" ? values.reminder_time_local || null : null,
      reminder_interval_hours:
        values.type !== "recurring" && values.reminder_mode === "every_n_hours" ? values.reminder_interval_hours : null,
      recurrence_rule: values.type === "recurring" ? values.recurrence_rule || null : null,
    };
    try {
      await createMutation.mutateAsync(payload);
      showToast({ tone: "success", message: t("taskCreated") });
      navigate("/tasks");
    } catch {
      showToast({ tone: "error", message: t("failedCreateTask") });
    }
  };

  return (
    <section className="grid-section">
      {createMutation.error && <p className="error">{t("failedCreateTask")}</p>}
      <TaskForm onSubmit={handleSubmit} />
    </section>
  );
}
