export interface TaskEditNavigationState {
  returnTo?: string;
}

export interface TaskEditSaveDestination {
  path: string;
  replace: boolean;
}

export function getTaskEditSaveDestination(taskId: string, returnTo?: string): -1 | TaskEditSaveDestination {
  const detailPath = `/tasks/${taskId}`;
  if (returnTo === detailPath) {
    return -1;
  }

  return {
    path: returnTo ?? detailPath,
    replace: true,
  };
}
