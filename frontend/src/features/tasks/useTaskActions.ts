import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelTask, markTaskDone } from "../../api/tasks";
import { useAppSettings } from "../../contexts/AppSettingsContext";
import { useToast } from "../../contexts/ToastContext";
import { hapticNotification } from "../../utils/haptics";
import { scheduleTasksBackgroundRefresh, updateTaskInCache } from "./cache";

// Shared done/cancel behaviour so the compact card and the detail view stay in
// sync: optimistic cache update, background refresh, toast and haptic feedback.
export function useTaskActions() {
  const { settings, t } = useAppSettings();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const doneMutation = useMutation({
    mutationFn: (id: string) => markTaskDone(id, settings),
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

  const markDone = (id: string) =>
    doneMutation.mutate(id, {
      onSuccess: () => {
        hapticNotification("success");
        showToast({ tone: "success", message: t("taskMarkedDone") });
      },
      onError: () => {
        hapticNotification("error");
        showToast({ tone: "error", message: t("taskActionFailed") });
      },
    });

  const cancel = (id: string) =>
    cancelMutation.mutate(id, {
      onSuccess: () => {
        hapticNotification("warning");
        showToast({ tone: "success", message: t("taskCancelledMsg") });
      },
      onError: () => {
        hapticNotification("error");
        showToast({ tone: "error", message: t("taskActionFailed") });
      },
    });

  return { markDone, cancel, pending: doneMutation.isPending || cancelMutation.isPending };
}
