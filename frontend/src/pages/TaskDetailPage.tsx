import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, ListTodo, XCircle } from "lucide-react";
import { cancelTask, getTask, markTaskDone } from "../api/tasks";
import { LoadingState } from "../components/LoadingState";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { useToast } from "../contexts/ToastContext";
import { mergeTaskIntoCache, scheduleTasksBackgroundRefresh, updateTaskInCache, useTasksAllQuery } from "../features/tasks/cache";
import { formatInTimezone } from "../utils/dateTime";
import { taskStatusLabel, taskTypeLabel } from "../utils/taskLabels";

export function TaskDetailPage() {
  const { settings, t } = useAppSettings();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const params = useParams();
  const taskId = params.taskId ?? "";
  const isValidTaskId = taskId.length > 0;
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
    mutationFn: (id: string) => markTaskDone(id, settings),
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
      <article className="task-detail-card">
        <div className="section-card-header task-detail-header">
          <span className="section-card-icon" aria-hidden="true">
            <ListTodo size={18} />
          </span>
          <div className="task-detail-heading">
            <h2>{task.title}</h2>
            <span className={`status ${task.status}`}>{taskStatusLabel(task.status, t)}</span>
          </div>
        </div>
        <div className="section-card-divider" />

        {task.description && <p className="task-detail-description">{task.description}</p>}

        <dl className="task-detail-meta">
          <div>
            <dt>{t("type")}</dt>
            <dd>{taskTypeLabel(task.type, t)}</dd>
          </div>
          {!isFinal && task.remind_at && (
            <div>
              <dt>{t("reminderTime")}</dt>
              <dd>{formatInTimezone(task.remind_at, settings.timezone, settings.language, true)}</dd>
            </div>
          )}
          {task.deadline_at && (
            <div>
              <dt>{t("deadlineLabel")}</dt>
              <dd>{formatInTimezone(task.deadline_at, settings.timezone, settings.language, true)}</dd>
            </div>
          )}
        </dl>

        <div className="task-actions task-detail-actions">
          <Link to="/tasks" className="link-btn ghost">
            <ArrowLeft size={18} aria-hidden="true" />
            {t("back")}
          </Link>
          {!isFinal && (
            <>
              <button
                className="success"
                onClick={() =>
                  doneMutation.mutate(task.id, {
                    onSuccess: () => showToast({ tone: "success", message: t("taskMarkedDone") }),
                    onError: () => showToast({ tone: "error", message: t("taskActionFailed") }),
                  })
                }
              >
                <CheckCircle2 size={18} aria-hidden="true" />
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
                <XCircle size={18} aria-hidden="true" />
                {t("cancel")}
              </button>
            </>
          )}
        </div>
      </article>
    </section>
  );
}
