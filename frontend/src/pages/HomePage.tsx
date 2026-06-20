import type { LucideIcon } from "lucide-react";
import { AlertTriangle, BellRing, CalendarCheck2, Clock3, ListTodo } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelTask, markTaskDone } from "../api/tasks";
import { TaskCard } from "../components/TaskCard";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { useToast } from "../contexts/ToastContext";
import { scheduleTasksBackgroundRefresh, useTasksAllQuery, updateTaskInCache } from "../features/tasks/cache";
import { getDashboardTasks, TaskView } from "../features/tasks/selectors";
import { Task } from "../types/task";

type SectionProps = {
  title: string;
  tasks: Task[];
  icon: LucideIcon;
  onDone: (taskId: string) => void;
  onCancel: (taskId: string) => void;
};

function Section({ title, tasks, icon: Icon, onDone, onCancel }: SectionProps) {
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
        <TaskCard key={task.id} task={task} onDone={onDone} onCancel={onCancel} />
      ))}
    </section>
  );
}

export function HomePage() {
  const { t, settings } = useAppSettings();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const tasksAllQuery = useTasksAllQuery();
  const allTasks = tasksAllQuery.data ?? [];
  const doneMutation = useMutation({
    mutationFn: (taskId: string) => markTaskDone(taskId, settings),
    onSuccess: (task) => {
      updateTaskInCache(queryClient, task);
      scheduleTasksBackgroundRefresh(queryClient);
    },
  });
  const cancelMutation = useMutation({
    mutationFn: cancelTask,
    onSuccess: (task) => {
      updateTaskInCache(queryClient, task);
      scheduleTasksBackgroundRefresh(queryClient);
    },
  });

  const handleDone = (taskId: string) =>
    doneMutation.mutate(taskId, {
      onSuccess: () => showToast({ tone: "success", message: t("taskMarkedDone") }),
      onError: () => showToast({ tone: "error", message: t("taskActionFailed") }),
    });
  const handleCancel = (taskId: string) =>
    cancelMutation.mutate(taskId, {
      onSuccess: () => showToast({ tone: "success", message: t("taskCancelledMsg") }),
      onError: () => showToast({ tone: "error", message: t("taskActionFailed") }),
    });
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
          onDone={handleDone}
          onCancel={handleCancel}
        />
      ))}
    </div>
  );
}
