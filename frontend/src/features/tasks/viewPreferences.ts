import { TaskType } from "../../types/task";
import { DashboardView, TaskView } from "./selectors";

export const DASHBOARD_VIEW_STORAGE_KEY = "pocketmind.dashboard.view.v1";
export const TASK_LIST_VIEW_STORAGE_KEY = "pocketmind.tasks.view.v1";
export const TASK_LIST_TYPE_STORAGE_KEY = "pocketmind.tasks.type.v1";

export const DEFAULT_DASHBOARD_VIEW: DashboardView = "today";
export const DEFAULT_TASK_LIST_VIEW: TaskView = "active";
export const DEFAULT_TASK_LIST_TYPE: TaskType | "all" = "all";

export const DASHBOARD_VIEWS = ["today", "tomorrow", "soon", "overdue"] as const satisfies readonly DashboardView[];
export const TASK_LIST_VIEWS = ["active", "overdue", "completed", "cancelled"] as const satisfies readonly TaskView[];
export const TASK_LIST_TYPES = ["all", "quick", "deadline", "no_deadline", "recurring", "waiting"] as const satisfies readonly (TaskType | "all")[];
