import type { LucideIcon } from "lucide-react";
import { AlertTriangle, BellRing, CalendarCheck2, Clock3, ListTodo } from "lucide-react";
import { TaskCard } from "../components/TaskCard";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { useTasksAllQuery } from "../features/tasks/cache";
import { getDashboardTasks, TaskView } from "../features/tasks/selectors";
import { Task } from "../types/task";

type SectionProps = {
  title: string;
  tasks: Task[];
  icon: LucideIcon;
};

function Section({ title, tasks, icon: Icon }: SectionProps) {
  const { t } = useAppSettings();
  return (
    <section className="home-section-card">
      <div className="home-section-header">
        <span className="home-section-icon">
          <Icon size={18} />
        </span>
        <h2>{title}</h2>
      </div>
      <div className="home-section-divider" />
      {tasks.length === 0 && <p className="home-section-empty">{t("noTasks")}</p>}
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </section>
  );
}

export function HomePage() {
  const { t } = useAppSettings();
  const tasksAllQuery = useTasksAllQuery();
  const allTasks = tasksAllQuery.data ?? [];
  const sections: Array<{
    title: string;
    view: Exclude<TaskView, "all" | "active" | "completed" | "cancelled">;
    icon: LucideIcon;
  }> = [
    { title: t("today"), view: "today", icon: CalendarCheck2 },
    { title: t("overdue"), view: "overdue", icon: AlertTriangle },
    { title: t("upcoming"), view: "upcoming", icon: BellRing },
    { title: t("waiting"), view: "waiting", icon: Clock3 },
    { title: t("noDeadline"), view: "no_deadline", icon: ListTodo },
  ];

  return (
    <div className="grid-section home-grid">
      <div className="tasks-title-pill">{t("dashboard")}</div>
      {sections.map((section) => (
        <Section
          key={section.view}
          title={section.title}
          icon={section.icon}
          tasks={getDashboardTasks(allTasks, section.view)}
        />
      ))}
    </div>
  );
}
