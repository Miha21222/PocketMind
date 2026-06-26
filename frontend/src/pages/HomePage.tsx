import { CalendarRange, ClipboardList, RotateCcw } from "lucide-react";
import { TaskCard } from "../components/TaskCard";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { useTasksAllQuery } from "../features/tasks/cache";
import { DashboardView, getDashboardSchedule, getDashboardTaskInstant } from "../features/tasks/selectors";
import { DASHBOARD_VIEW_STORAGE_KEY, DASHBOARD_VIEWS, DEFAULT_DASHBOARD_VIEW } from "../features/tasks/viewPreferences";
import { usePersistentEnumState } from "../hooks/usePersistentEnumState";
import { dayKeyInTimezone, formatDayInTimezone, formatTimeInTimezone } from "../utils/dateTime";
import { hapticSelection } from "../utils/haptics";
import { Task } from "../types/task";

// Single-day views read cleanly without date headers; multi-day views group the
// schedule by calendar day so the agenda stays scannable.
const MULTI_DAY_VIEWS: DashboardView[] = ["soon", "overdue"];

type DayGroup = {
  key: string;
  label: string | null;
  tasks: Task[];
};

function groupByDay(tasks: Task[], view: DashboardView, timezone: string, locale: string, withHeaders: boolean): DayGroup[] {
  const now = new Date();
  if (!withHeaders) {
    return [{ key: "single", label: null, tasks }];
  }
  const groups: DayGroup[] = [];
  const byKey = new Map<string, DayGroup>();
  for (const task of tasks) {
    const instant = getDashboardTaskInstant(task, view, now, timezone);
    if (!instant) continue;
    const key = dayKeyInTimezone(instant, timezone);
    let group = byKey.get(key);
    if (!group) {
      group = { key, label: formatDayInTimezone(instant, timezone, locale), tasks: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.tasks.push(task);
  }
  return groups;
}

export function HomePage() {
  const { settings, t } = useAppSettings();
  const tasksAllQuery = useTasksAllQuery();
  const allTasks = tasksAllQuery.data ?? [];
  const { value: view, setValue: setView, reset: resetView, isDefault: isDefaultView } = usePersistentEnumState(
    DASHBOARD_VIEW_STORAGE_KEY,
    DEFAULT_DASHBOARD_VIEW,
    DASHBOARD_VIEWS,
  );

  const viewLabel = (item: DashboardView) =>
    item === "today" ? t("today") : item === "tomorrow" ? t("tomorrow") : item === "soon" ? t("soon") : t("overdue");

  const now = new Date();
  const scheduled = getDashboardSchedule(allTasks, view, now, settings.timezone);
  const groups = groupByDay(scheduled, view, settings.timezone, settings.language, MULTI_DAY_VIEWS.includes(view));

  return (
    <section className="grid-section dashboard">
      <div className="filter-group-card">
        <div className="filter-card-topline">
          <div className="section-card-header">
            <span className="section-card-icon" aria-hidden="true">
              <ClipboardList size={18} />
            </span>
            <h2>{t("dashboardTasks")}</h2>
          </div>
          {!isDefaultView && (
            <button
              type="button"
              className="filter-reset-btn"
              onClick={() => {
                hapticSelection();
                resetView();
              }}
            >
              <RotateCcw size={15} aria-hidden="true" />
              <span>{t("clear")}</span>
            </button>
          )}
        </div>
        <div className="section-card-divider" />
        <div className="compact-select-toolbar">
          <label className="compact-select-group" htmlFor="dashboard-view">
            <span className="filter-subgroup-title">{t("showPeriod")}</span>
            <select
              id="dashboard-view"
              className="filter-select compact"
              aria-label={t("showPeriod")}
              value={view}
              onChange={(event) => {
                hapticSelection();
                setView(event.target.value as DashboardView);
              }}
            >
              {DASHBOARD_VIEWS.map((item) => (
                <option key={item} value={item}>
                  {viewLabel(item)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {scheduled.length === 0 ? (
        <div className="dashboard-empty">
          <CalendarRange size={22} aria-hidden="true" />
          <p>{t("noTasks")}</p>
        </div>
      ) : (
        <div className="schedule-list">
          {groups.map((group) => (
            <section key={group.key} className="schedule-group">
              {group.label ? <h2 className="schedule-day-label">{group.label}</h2> : null}
              {group.tasks.map((task) => {
                const displayInstant = getDashboardTaskInstant(task, view, now, settings.timezone);
                return (
                  <div key={task.id} className="schedule-item">
                    <div className="schedule-item-meta">
                      <span className="schedule-time-chip">
                        {formatTimeInTimezone(displayInstant, settings.timezone, settings.language) || "-"}
                      </span>
                    </div>
                    <TaskCard task={task} displayReminderAt={displayInstant} />
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
