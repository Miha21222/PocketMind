import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ListTodo, Pencil, X } from "lucide-react";
import { getTask } from "../api/tasks";
import { LoadingState } from "../components/LoadingState";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { mergeTaskIntoCache, useTasksAllQuery } from "../features/tasks/cache";
import { isTaskOverdue } from "../features/tasks/selectors";
import { useTaskActions } from "../features/tasks/useTaskActions";
import { formatInTimezone } from "../utils/dateTime";
import { TaskEditNavigationState } from "../utils/taskNavigation";
import { taskStatusLabel, taskTypeLabel } from "../utils/taskLabels";

export function TaskDetailPage() {
  const { settings, t } = useAppSettings();
  const location = useLocation();
  const navigate = useNavigate();
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
  const { markDone, cancel, pending } = useTaskActions();

  useEffect(() => {
    if (taskFallbackQuery.data && !taskFromCache) {
      mergeTaskIntoCache(queryClient, taskFallbackQuery.data);
    }
  }, [queryClient, taskFallbackQuery.data, taskFromCache]);

  if (!isValidTaskId) return <p>{t("taskNotFound")}</p>;
  if (tasksAllQuery.isPending || (shouldFetchFallback && taskFallbackQuery.isPending)) return <LoadingState label={t("loadingTask")} />;
  if ((tasksAllQuery.error && !taskFromCache) || (shouldFetchFallback && taskFallbackQuery.error) || !task) return <p>{t("taskNotFound")}</p>;
  const isFinal = task.status === "done" || task.status === "cancelled";
  const overdue = isTaskOverdue(task);

  return (
    <section className="grid-section">
      <article className="task-detail-card">
        <div className="section-card-header task-detail-header">
          <span className="section-card-icon" aria-hidden="true">
            <ListTodo size={18} />
          </span>
          <div className="task-detail-heading">
            <h2>{task.title}</h2>
            {overdue ? (
              <span className="status overdue">{t("overdue")}</span>
            ) : (
              <span className={`status ${task.status}`}>{taskStatusLabel(task.status, t)}</span>
            )}
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

        {!isFinal && (
          <div className="task-card-actions task-detail-actions">
            <button
              type="button"
              className="icon-btn success"
              disabled={pending}
              aria-label={t("done")}
              title={t("done")}
              onClick={() => markDone(task.id)}
            >
              <Check size={22} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-btn danger"
              disabled={pending}
              aria-label={t("cancel")}
              title={t("cancel")}
              onClick={() => cancel(task.id)}
            >
              <X size={22} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-btn ghost"
              aria-label={t("edit")}
              title={t("edit")}
              onClick={() => {
                const state: TaskEditNavigationState = { returnTo: location.pathname };
                navigate(`/tasks/${task.id}/edit`, { state });
              }}
            >
              <Pencil size={22} aria-hidden="true" />
            </button>
          </div>
        )}
      </article>
    </section>
  );
}
