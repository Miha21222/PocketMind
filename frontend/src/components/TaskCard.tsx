import { Pencil } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Task } from "../types/task";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { isTaskOverdue } from "../features/tasks/selectors";
import { TaskEditNavigationState } from "../utils/taskNavigation";
import { formatInTimezone } from "../utils/dateTime";
import { taskStatusLabel, taskTypeLabel } from "../utils/taskLabels";

type TaskCardProps = {
  task: Task;
  displayReminderAt?: string | null;
};

export function TaskCard({ task, displayReminderAt }: TaskCardProps) {
  const { settings, t } = useAppSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const overdue = isTaskOverdue(task);
  const isFinal = task.status === "done" || task.status === "cancelled";

  const open = () => navigate(`/tasks/${task.id}`);

  return (
    <article
      className={`task-card is-clickable rounded-soft bg-white p-4 shadow-card ${overdue ? "overdue border border-rose-300" : ""}`}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      }}
    >
      <div className="task-title-row">
        <h3>{task.title}</h3>
        {overdue ? (
          <span className="status overdue">{t("overdue")}</span>
        ) : (
          <span className={`status ${task.status}`}>{taskStatusLabel(task.status, t)}</span>
        )}
      </div>
      {task.description ? <p className="task-card-desc">{task.description}</p> : null}
      {!isFinal && (displayReminderAt ?? task.remind_at) ? (
        <p className="task-date">
          {t("reminderTime")}: {formatInTimezone(displayReminderAt ?? task.remind_at, settings.timezone, settings.language)}
        </p>
      ) : null}
      {task.deadline_at ? (
        <p className="task-date">
          {t("deadlineLabel")}: {formatInTimezone(task.deadline_at, settings.timezone, settings.language)}
        </p>
      ) : null}
      <div className="task-card-footer">
        <span className="task-type-chip">{taskTypeLabel(task.type, t)}</span>
        {!isFinal && (
          <div className="task-card-actions">
            <button
              type="button"
              className="icon-btn ghost"
              aria-label={t("edit")}
              title={t("edit")}
              onClick={(event) => {
                event.stopPropagation();
                const state: TaskEditNavigationState = { returnTo: location.pathname };
                navigate(`/tasks/${task.id}/edit`, { state });
              }}
            >
              <Pencil size={20} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
