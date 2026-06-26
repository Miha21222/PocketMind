import { ListFilter, ListTodo, RotateCcw } from "lucide-react";
import { LoadingState } from "../components/LoadingState";
import { TaskCard } from "../components/TaskCard";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { applyTaskFilters } from "../features/tasks/selectors";
import { useTasksAllQuery } from "../features/tasks/cache";
import {
  DEFAULT_TASK_LIST_TYPE,
  DEFAULT_TASK_LIST_VIEW,
  TASK_LIST_TYPES,
  TASK_LIST_TYPE_STORAGE_KEY,
  TASK_LIST_VIEWS,
  TASK_LIST_VIEW_STORAGE_KEY,
} from "../features/tasks/viewPreferences";
import { usePersistentEnumState } from "../hooks/usePersistentEnumState";
import { hapticSelection } from "../utils/haptics";

export function TaskListPage() {
  const { settings, t } = useAppSettings();
  const { value: view, setValue: setView, reset: resetView, isDefault: isDefaultView } = usePersistentEnumState(
    TASK_LIST_VIEW_STORAGE_KEY,
    DEFAULT_TASK_LIST_VIEW,
    TASK_LIST_VIEWS,
  );
  const { value: taskType, setValue: setTaskType, reset: resetTaskType, isDefault: isDefaultTaskType } = usePersistentEnumState(
    TASK_LIST_TYPE_STORAGE_KEY,
    DEFAULT_TASK_LIST_TYPE,
    TASK_LIST_TYPES,
  );
  const tasksAllQuery = useTasksAllQuery();
  const filteredTasks = applyTaskFilters(tasksAllQuery.data ?? [], view, taskType, new Date(), settings.timezone);

  const statusLabels = {
    active: t("active"),
    overdue: t("overdue"),
    completed: t("completed"),
    cancelled: t("cancelled"),
  } as const;
  const typeLabels = {
    all: t("allTypes"),
    quick: t("quick"),
    deadline: t("deadline"),
    no_deadline: t("noDeadline"),
    recurring: t("recurring"),
    waiting: t("waiting"),
  } as const;
  const isDefaultFilters = isDefaultView && isDefaultTaskType;

  return (
    <section className="grid-section">
      <section className="task-results-card">
        <div className="filter-card-topline">
          <div className="section-card-header">
            <span className="section-card-icon" aria-hidden="true">
              <ListTodo size={18} />
            </span>
            <h2>{t("taskList")}</h2>
          </div>
          {!isDefaultFilters && (
            <button
              type="button"
              className="filter-reset-btn"
              onClick={() => {
                hapticSelection();
                resetView();
                resetTaskType();
              }}
            >
              <RotateCcw size={15} aria-hidden="true" />
              <span>{t("clear")}</span>
            </button>
          )}
        </div>
        <div className="section-card-divider" />
        <div className="compact-select-toolbar tasks">
          <label className="compact-select-group" htmlFor="filter-status">
            <span className="filter-subgroup-title">{t("status")}</span>
            <select
              id="filter-status"
              className="filter-select compact"
              aria-label={t("status")}
              value={view}
              onChange={(event) => {
                hapticSelection();
                setView(event.target.value as (typeof TASK_LIST_VIEWS)[number]);
              }}
            >
              {TASK_LIST_VIEWS.map((item) => (
                <option key={item} value={item}>
                  {statusLabels[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="compact-select-group" htmlFor="filter-type">
            <span className="filter-subgroup-title">{t("type")}</span>
            <select
              id="filter-type"
              className="filter-select compact"
              aria-label={t("type")}
              value={taskType}
              onChange={(event) => {
                hapticSelection();
                setTaskType(event.target.value as (typeof TASK_LIST_TYPES)[number]);
              }}
            >
              {TASK_LIST_TYPES.map((item) => (
                <option key={item} value={item}>
                  {typeLabels[item]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mild-section-separator" />

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
