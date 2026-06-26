import { getTaskEditSaveDestination } from "../src/utils/taskNavigation";

function assertEqual<T>(actual: T, expected: T): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

{
  assertEqual(getTaskEditSaveDestination("task-1", "/tasks/task-1"), -1);
}

{
  assertEqual(getTaskEditSaveDestination("task-1", "/tasks"), {
    path: "/tasks",
    replace: true,
  });
}

{
  assertEqual(getTaskEditSaveDestination("task-1", undefined), {
    path: "/tasks/task-1",
    replace: true,
  });
}
