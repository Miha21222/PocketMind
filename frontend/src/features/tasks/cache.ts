import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { listTasks, syncTasksWithBackend } from "../../api/tasks";
import { Task } from "../../types/task";

export const TASKS_ALL_QUERY_KEY = ["tasks", "all"] as const;
let tasksRefreshTimer: ReturnType<typeof setTimeout> | null = null;

export function useTasksAllQuery(enabled = true) {
  const queryClient = useQueryClient();
  const tasksQuery = useQuery({
    queryKey: TASKS_ALL_QUERY_KEY,
    queryFn: async () => {
      const response = await listTasks({ view: "all" });
      return response.items;
    },
    enabled,
  });
  const syncQuery = useQuery({
    queryKey: ["tasks", "sync"],
    queryFn: syncTasksWithBackend,
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (syncQuery.data) {
      queryClient.setQueryData<Task[]>(TASKS_ALL_QUERY_KEY, syncQuery.data);
    }
  }, [queryClient, syncQuery.data]);

  return {
    ...tasksQuery,
    syncPending: syncQuery.isPending,
    syncError: syncQuery.error,
  };
}

export function updateTaskInCache(queryClient: QueryClient, task: Task) {
  queryClient.setQueryData<Task[]>(TASKS_ALL_QUERY_KEY, (current) => {
    if (!current || current.length === 0) {
      return [task];
    }
    const idx = current.findIndex((item) => item.id === task.id);
    if (idx === -1) {
      return [task, ...current];
    }
    const next = [...current];
    next[idx] = task;
    return next;
  });
}

export function mergeTaskIntoCache(queryClient: QueryClient, task: Task) {
  updateTaskInCache(queryClient, task);
}

export function scheduleTasksBackgroundRefresh(queryClient: QueryClient, delayMs = 1000) {
  if (tasksRefreshTimer) {
    clearTimeout(tasksRefreshTimer);
  }
  tasksRefreshTimer = setTimeout(() => {
    void queryClient.invalidateQueries({ queryKey: TASKS_ALL_QUERY_KEY, refetchType: "active" });
    tasksRefreshTimer = null;
  }, delayMs);
}
