import { Link } from "react-router-dom";
import { Task } from "../types/task";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { formatInTimezone } from "../utils/dateTime";
import { taskStatusLabel, taskTypeLabel } from "../utils/taskLabels";

type TaskCardProps = {
  task: Task;
};

export function TaskCard({ task }: TaskCardProps) {
  const { settings, t } = useAppSettings();
  const isOverdue = task.deadline_at ? new Date(task.deadline_at).getTime() < Date.now() && task.status !== "done" : false;
  const isFinal = task.status === "done" || task.status === "cancelled";

  return (
    <article className={`task-card rounded-soft bg-white p-4 shadow-card ${isOverdue ? "overdue border border-rose-300" : ""}`}>
      <div className="task-title-row">
        <h3>{task.title}</h3>
        <span className={`status ${task.status}`}>{taskStatusLabel(task.status, t)}</span>
      </div>
      <p className="task-type text-sm text-slate-600">{taskTypeLabel(task.type, t)}</p>
      {!isFinal && task.remind_at ? (
        <p className="task-date">
          {t("reminderTime")}: {formatInTimezone(task.remind_at, settings.timezone, settings.language)}
        </p>
      ) : null}
      {task.deadline_at ? (
        <p className="task-date">
          {t("deadlineLabel")}: {formatInTimezone(task.deadline_at, settings.timezone, settings.language)}
        </p>
      ) : null}
      <div className="task-actions">
        <Link to={`/tasks/${task.id}`} className="link-btn">
          {t("open")}
        </Link>
        {!isFinal && (
          <Link to={`/tasks/${task.id}/edit`} className="link-btn ghost">
            {t("edit")}
          </Link>
        )}
      </div>
    </article>
  );
}
