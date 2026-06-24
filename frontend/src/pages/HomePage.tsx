import { useState } from "react";
import { CalendarRange, ClipboardList } from "lucide-react";
import { TaskCard } from "../components/TaskCard";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { useTasksAllQuery } from "../features/tasks/cache";
import { DashboardView, getDashboardSchedule, primaryTaskInstant } from "../features/tasks/selectors";
import { dayKeyInTimezone, formatDayInTimezone, formatTimeInTimezone } from "../utils/dateTime";
import { hapticSelection } from "../utils/haptics";
import { Task } from "../types/task";

const DASHBOARD_VIEWS: DashboardView[] = ["today", "tomorrow", "soon", "overdue"];

// Single-day views read cleanly without date headers; multi-day views group the
// timeline by calendar day so the agenda stays scannable.
const MULTI_DAY_VIEWS: DashboardView[] = ["soon", "overdue"];

type DayGroup = {
  key: string;
  label: string | null;
  tasks: Task[];
};

function groupByDay(tasks: Task[], timezone: string, locale: string, withHeaders: boolean): DayGroup[] {
  if (!withHeaders) {
    return [{ key: "single", label: null, tasks }];
  }
  const groups: DayGroup[] = [];
  const byKey = new Map<string, DayGroup>();
  for (const task of tasks) {
    const instant = primaryTaskInstant(task);
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
  const [view, setView] = useState<DashboardView>("today");

  const viewLabel = (item: DashboardView) =>
    item === "today" ? t("today") : item === "tomorrow" ? t("tomorrow") : item === "soon" ? t("soon") : t("overdue");

  const scheduled = getDashboardSchedule(allTasks, view);
  const groups = groupByDay(scheduled, settings.timezone, settings.language, MULTI_DAY_VIEWS.includes(view));

  return (
    <section className="grid-section dashboard">
      <div className="filter-group-card">
        <div className="section-card-header">
          <span className="section-card-icon" aria-hidden="true">
            <ClipboardList size={18} />
          </span>
          <h2>{t("dashboardTasks")}</h2>
        </div>
        <div className="section-card-divider" />
        <div className="filter-subgroup">
          <select
            id="dashboard-view"
            className="filter-select"
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
        </div>
      </div>

      {scheduled.length === 0 ? (
        <div className="dashboard-empty">
          <CalendarRange size={22} aria-hidden="true" />
          <p>{t("noTasks")}</p>
        </div>
      ) : (
        <div className="timeline">
          {groups.map((group) => (
            <div key={group.key} className="timeline-group">
              {group.label ? <h2 className="timeline-day-label">{group.label}</h2> : null}
              {group.tasks.map((task) => (
                <div key={task.id} className="timeline-row">
                  <div className="timeline-rail">
                    <span className="timeline-time">
                      {formatTimeInTimezone(primaryTaskInstant(task), settings.timezone, settings.language) || "—"}
                    </span>
                    <span className="timeline-dot" aria-hidden="true" />
                  </div>
                  <div className="timeline-card">
                    <TaskCard task={task} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
