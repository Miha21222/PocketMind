import { useState } from "react";
import { ListFilter, ListTodo } from "lucide-react";
import { LoadingState } from "../components/LoadingState";
import { TaskCard } from "../components/TaskCard";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { TaskType } from "../types/task";
import { applyTaskFilters, TaskView } from "../features/tasks/selectors";
import { useTasksAllQuery } from "../features/tasks/cache";

const views = ["active", "completed", "cancelled"] as const;
const typeFilters = ["all", "quick", "deadline", "no_deadline", "recurring", "waiting"] as const;

export function TaskListPage() {
  const { t } = useAppSettings();
  const [view, setView] = useState<(typeof views)[number]>("active");
  const [taskType, setTaskType] = useState<(typeof typeFilters)[number]>("all");
  const tasksAllQuery = useTasksAllQuery();
  const filteredTasks = applyTaskFilters(tasksAllQuery.data ?? [], view as TaskView, taskType as TaskType | "all");

  const statusLabel = (item: (typeof views)[number]) =>
    item === "active" ? t("active") : item === "completed" ? t("completed") : t("cancelled");
  const typeLabel = (item: (typeof typeFilters)[number]) =>
    item === "all"
      ? t("allTypes")
      : item === "quick"
        ? t("quick")
        : item === "deadline"
          ? t("deadline")
          : item === "no_deadline"
            ? t("noDeadline")
            : item === "recurring"
              ? t("recurring")
              : t("waiting");

  return (
    <section className="grid-section">
      <div className="tasks-title-pill">{t("tasks")}</div>

      <div className="filter-group-card">
        <div className="section-card-header">
          <span className="section-card-icon" aria-hidden="true">
            <ListFilter size={18} />
          </span>
          <h2>{t("filterTasks")}</h2>
        </div>
        <div className="section-card-divider" />
        <div className="filter-controls">
          <div className="filter-subgroup">
            <label className="filter-subgroup-title" htmlFor="filter-status">{t("status")}</label>
            <select
              id="filter-status"
              className="filter-select"
              value={view}
              onChange={(event) => setView(event.target.value as (typeof views)[number])}
            >
              {views.map((item) => (
                <option key={item} value={item}>
                  {statusLabel(item)}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-subgroup">
            <label className="filter-subgroup-title" htmlFor="filter-type">{t("type")}</label>
            <select
              id="filter-type"
              className="filter-select"
              value={taskType}
              onChange={(event) => setTaskType(event.target.value as (typeof typeFilters)[number])}
            >
              {typeFilters.map((item) => (
                <option key={item} value={item}>
                  {typeLabel(item)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <section className="task-results-card">
        <div className="section-card-header">
          <span className="section-card-icon" aria-hidden="true">
            <ListTodo size={18} />
          </span>
          <h2>{t("taskList")}</h2>
        </div>
        <div className="section-card-divider" />

        {tasksAllQuery.isPending && <LoadingState label={t("loadingTasks")} />}
        {tasksAllQuery.error && <p className="error">{t("failedToLoadTasks")}</p>}
        {!tasksAllQuery.isPending && !tasksAllQuery.error && filteredTasks.length === 0 && (
          <p className="empty" role="status">{t("noTasks")}</p>
        )}
        {filteredTasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </section>
    </section>
  );
}
