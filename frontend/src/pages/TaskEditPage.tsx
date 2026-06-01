import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTask, updateTask } from "../api/tasks";
import { LoadingState } from "../components/LoadingState";
import { TaskForm, TaskFormValues } from "../components/TaskForm";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { useToast } from "../contexts/ToastContext";
import { mergeTaskIntoCache, scheduleTasksBackgroundRefresh, updateTaskInCache, useTasksAllQuery } from "../features/tasks/cache";
import { fromLocalDateTimeInput, toLocalDateTimeInput } from "../utils/dateTime";

function toIsoOrNull(value: string): string | null {
  return fromLocalDateTimeInput(value);
}

export function TaskEditPage() {
  const { t } = useAppSettings();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams();
  const taskId = Number(params.taskId);
  const isValidTaskId = Number.isFinite(taskId);
  const tasksAllQuery = useTasksAllQuery();
  const taskFromCache = (tasksAllQuery.data ?? []).find((task) => task.id === taskId);
  const shouldFetchFallback = isValidTaskId && !taskFromCache;
  const taskFallbackQuery = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTask(taskId),
    enabled: shouldFetchFallback,
  });
  const task = taskFromCache ?? taskFallbackQuery.data;

  useEffect(() => {
    if (taskFallbackQuery.data && !taskFromCache) {
      mergeTaskIntoCache(queryClient, taskFallbackQuery.data);
    }
  }, [queryClient, taskFallbackQuery.data, taskFromCache]);

  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof updateTask>[1]) => updateTask(taskId, body),
    onSuccess: (updatedTask) => {
      updateTaskInCache(queryClient, updatedTask);
      scheduleTasksBackgroundRefresh(queryClient);
    },
  });

  if (!isValidTaskId) return <p>{t("taskNotFound")}</p>;
  if (tasksAllQuery.isPending || (shouldFetchFallback && taskFallbackQuery.isPending)) return <LoadingState label={t("loadingTask")} />;
  if ((tasksAllQuery.error && !taskFromCache) || (shouldFetchFallback && taskFallbackQuery.error) || !task) return <p>{t("taskNotFound")}</p>;
  const initial = {
    title: task.title,
    description: task.description ?? "",
    type: task.type,
    deadline_at: toLocalDateTimeInput(task.deadline_at),
    recurrence_rule: task.recurrence_rule ?? "",
    reminder_mode: task.reminder_mode ?? "daily_at_time",
    reminder_time_local: task.reminder_time_local ?? "09:00",
    reminder_interval_hours: task.reminder_interval_hours ?? 4,
  };

  const handleSubmit = async (values: TaskFormValues) => {
    const payload = {
      title: values.title,
      description: values.description || null,
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
      await updateMutation.mutateAsync(payload);
      showToast({ tone: "success", message: t("taskUpdated") });
      navigate(`/tasks/${taskId}`);
    } catch {
      showToast({ tone: "error", message: t("taskUpdateFailed") });
    }
  };

  return (
    <section className="grid-section">
      <div className="tasks-title-pill">{t("editTask")}</div>
      <TaskForm initial={initial} onSubmit={handleSubmit} />
    </section>
  );
}
