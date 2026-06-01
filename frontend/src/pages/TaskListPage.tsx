import { useState } from "react";
import { cancelTask, markTaskDone } from "../api/tasks";
import { LoadingState } from "../components/LoadingState";
import { TaskCard } from "../components/TaskCard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { useToast } from "../contexts/ToastContext";
import { TaskType } from "../types/task";
import { applyTaskFilters, TaskView } from "../features/tasks/selectors";
import { scheduleTasksBackgroundRefresh, updateTaskInCache, useTasksAllQuery } from "../features/tasks/cache";

const views = ["active", "completed", "cancelled"] as const;
const typeFilters = ["all", "quick", "deadline", "no_deadline", "recurring", "waiting"] as const;

export function TaskListPage() {
  const { t } = useAppSettings();
  const { showToast } = useToast();
  const [view, setView] = useState<(typeof views)[number]>("active");
  const [taskType, setTaskType] = useState<(typeof typeFilters)[number]>("all");
  const queryClient = useQueryClient();
  const tasksAllQuery = useTasksAllQuery();
  const filteredTasks = applyTaskFilters(tasksAllQuery.data ?? [], view as TaskView, taskType as TaskType | "all");
  const doneMutation = useMutation({
    mutationFn: markTaskDone,
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

  return (
    <section className="grid-section">
      <div className="tasks-title-pill">{t("tasks")}</div>

      <div className="filter-group-card">
        <p className="filter-group-title">{t("filterTasks")}</p>
        <div className="filter-subgroup">
          <p className="filter-subgroup-title">{t("status")}</p>
          <div className="filter-row">
            {views.map((item) => (
              <button key={item} className={item === view ? "chip active" : "chip"} onClick={() => setView(item)}>
                {item === "active" ? t("active") : item === "completed" ? t("completed") : t("cancelled")}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-subgroup">
          <p className="filter-subgroup-title">{t("type")}</p>
          <div className="filter-row">
            {typeFilters.map((item) => (
              <button key={item} className={item === taskType ? "chip active" : "chip"} onClick={() => setTaskType(item)}>
                {item === "all"
                  ? t("allTypes")
                  : item === "quick"
                    ? t("quick")
                    : item === "deadline"
                      ? t("deadline")
                      : item === "no_deadline"
                        ? t("noDeadline")
                        : item === "recurring"
                          ? t("recurring")
                          : t("waiting")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tasksAllQuery.isPending && <LoadingState label={t("loadingTasks")} />}
      {tasksAllQuery.error && <p>{t("failedToLoadTasks")}</p>}
      {!tasksAllQuery.isPending && !tasksAllQuery.error && filteredTasks.length === 0 && <p className="empty">{t("noTasks")}</p>}
      {filteredTasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onDone={(taskId) =>
            doneMutation.mutate(taskId, {
              onSuccess: () => showToast({ tone: "success", message: t("taskMarkedDone") }),
              onError: () => showToast({ tone: "error", message: t("taskActionFailed") }),
            })
          }
          onCancel={(taskId) =>
            cancelMutation.mutate(taskId, {
              onSuccess: () => showToast({ tone: "success", message: t("taskCancelledMsg") }),
              onError: () => showToast({ tone: "error", message: t("taskActionFailed") }),
            })
          }
        />
      ))}
    </section>
  );
}
