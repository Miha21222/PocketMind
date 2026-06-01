import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelTask, getTask, markTaskDone } from "../api/tasks";
import { LoadingState } from "../components/LoadingState";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { useToast } from "../contexts/ToastContext";
import { mergeTaskIntoCache, scheduleTasksBackgroundRefresh, updateTaskInCache, useTasksAllQuery } from "../features/tasks/cache";
import { formatInTimezone } from "../utils/dateTime";

export function TaskDetailPage() {
  const { settings, t } = useAppSettings();
  const { showToast } = useToast();
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

  const doneMutation = useMutation({
    mutationFn: markTaskDone,
    onSuccess: (updatedTask) => {
      updateTaskInCache(queryClient, updatedTask);
      scheduleTasksBackgroundRefresh(queryClient);
    },
  });
  const cancelMutation = useMutation({
    mutationFn: cancelTask,
    onSuccess: (updatedTask) => {
      updateTaskInCache(queryClient, updatedTask);
      scheduleTasksBackgroundRefresh(queryClient);
    },
  });

  if (!isValidTaskId) return <p>{t("taskNotFound")}</p>;
  if (tasksAllQuery.isPending || (shouldFetchFallback && taskFallbackQuery.isPending)) return <LoadingState label={t("loadingTask")} />;
  if ((tasksAllQuery.error && !taskFromCache) || (shouldFetchFallback && taskFallbackQuery.error) || !task) return <p>{t("taskNotFound")}</p>;
  const isFinal = task.status === "done" || task.status === "cancelled";

  return (
    <section className="grid-section">
      <h2>{task.title}</h2>
      {task.description && <p>{task.description}</p>}
      <p>
        {t("type")}: {task.type}
      </p>
      <p>
        {t("status")}: {task.status}
      </p>
      {!isFinal && task.remind_at && (
        <p>
          {t("reminderTime")}: {formatInTimezone(task.remind_at, settings.timezone, settings.language, true)}
        </p>
      )}
      {task.deadline_at && (
        <p>
          {t("deadlineLabel")}: {formatInTimezone(task.deadline_at, settings.timezone, settings.language, true)}
        </p>
      )}

      {!isFinal && (
        <div className="task-actions">
          <button
            className="success"
            onClick={() =>
              doneMutation.mutate(task.id, {
                onSuccess: () => showToast({ tone: "success", message: t("taskMarkedDone") }),
                onError: () => showToast({ tone: "error", message: t("taskActionFailed") }),
              })
            }
          >
            {t("done")}
          </button>
          <button
            className="danger"
            onClick={() =>
              cancelMutation.mutate(task.id, {
                onSuccess: () => showToast({ tone: "success", message: t("taskCancelledMsg") }),
                onError: () => showToast({ tone: "error", message: t("taskActionFailed") }),
              })
            }
          >
            {t("cancel")}
          </button>
        </div>
      )}
    </section>
  );
}
