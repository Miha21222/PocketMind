import { applyTaskFilters, getDashboardSchedule, getDashboardTaskInstant, isTaskOverdue } from "../src/features/tasks/selectors";
import type { Task } from "../src/types/task";

function assertEqual<T>(actual: T, expected: T): void {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertTaskIds(actual: Task[], expected: string[]): void {
  const actualIds = actual.map((task) => task.id).join(",");
  const expectedIds = expected.join(",");
  if (actualIds !== expectedIds) {
    throw new Error(`Expected task ids ${expectedIds}, got ${actualIds}`);
  }
}

function buildTask(overrides: Partial<Task>): Task {
  return {
    id: "task-1",
    title: "Recurring task",
    description: "",
    type: "recurring",
    status: "active",
    deadline_at: null,
    remind_at: "2026-06-26T09:00:00.000Z",
    reminder_mode: "none",
    reminder_time_local: "09:00",
    reminder_interval_hours: null,
    snoozed_until: null,
    recurrence_rule: "FREQ=DAILY",
    created_at: "2026-06-20T08:00:00.000Z",
    updated_at: "2026-06-20T08:00:00.000Z",
    completed_at: null,
    cancelled_at: null,
    last_reminded_at: null,
    deleted_at: null,
    ...overrides,
  };
}

const now = new Date("2026-06-26T14:05:00.000Z");
const kyivNow = new Date("2026-06-26T12:05:00.000Z");

{
  const staleDailyRecurring = buildTask({});

  assertEqual(isTaskOverdue(staleDailyRecurring, now.getTime()), true);
  assertTaskIds(getDashboardSchedule([staleDailyRecurring], "today", now), []);
  assertTaskIds(getDashboardSchedule([staleDailyRecurring], "tomorrow", now), ["task-1"]);
  assertTaskIds(getDashboardSchedule([staleDailyRecurring], "soon", now), ["task-1"]);
  assertTaskIds(applyTaskFilters([staleDailyRecurring], "overdue", "all", now), ["task-1"]);
  assertEqual(getDashboardTaskInstant(staleDailyRecurring, "tomorrow", now), "2026-06-27T09:00:00.000Z");
}

{
  const createdAfterTodayTime = buildTask({
    id: "task-2",
    remind_at: "2026-06-27T09:00:00.000Z",
    created_at: "2026-06-26T14:05:00.000Z",
    updated_at: "2026-06-26T14:05:00.000Z",
  });

  assertEqual(isTaskOverdue(createdAfterTodayTime, now.getTime()), false);
  assertTaskIds(getDashboardSchedule([createdAfterTodayTime], "today", now), []);
  assertTaskIds(getDashboardSchedule([createdAfterTodayTime], "tomorrow", now), ["task-2"]);
  assertTaskIds(getDashboardSchedule([createdAfterTodayTime], "soon", now), ["task-2"]);
  assertTaskIds(applyTaskFilters([createdAfterTodayTime], "overdue", "all", now), []);
}

{
  const staleReminderBeforeCreation = buildTask({
    id: "task-2b",
    remind_at: "2026-06-26T09:00:00.000Z",
    created_at: "2026-06-26T14:05:00.000Z",
    updated_at: "2026-06-26T14:05:00.000Z",
  });

  assertEqual(isTaskOverdue(staleReminderBeforeCreation, now.getTime()), false);
  assertTaskIds(getDashboardSchedule([staleReminderBeforeCreation], "today", now), []);
  assertTaskIds(getDashboardSchedule([staleReminderBeforeCreation], "tomorrow", now), ["task-2b"]);
  assertTaskIds(getDashboardSchedule([staleReminderBeforeCreation], "soon", now), ["task-2b"]);
}

{
  const repeatingDeadlineReminder = buildTask({
    id: "task-3",
    type: "deadline",
    deadline_at: "2026-06-28T18:00:00.000Z",
    remind_at: "2026-06-26T09:00:00.000Z",
    reminder_mode: "daily_at_time",
    recurrence_rule: null,
  });

  assertEqual(isTaskOverdue(repeatingDeadlineReminder, now.getTime()), true);
  assertTaskIds(getDashboardSchedule([repeatingDeadlineReminder], "today", now), []);
  assertTaskIds(getDashboardSchedule([repeatingDeadlineReminder], "tomorrow", now), ["task-3"]);
  assertTaskIds(getDashboardSchedule([repeatingDeadlineReminder], "soon", now), ["task-3"]);
  assertEqual(getDashboardTaskInstant(repeatingDeadlineReminder, "tomorrow", now), "2026-06-27T09:00:00.000Z");
}

{
  const recurringLaterToday = buildTask({
    id: "task-3b",
    remind_at: "2026-06-26T23:00:00.000Z",
    reminder_time_local: "23:00",
  });

  assertTaskIds(getDashboardSchedule([recurringLaterToday], "today", now), ["task-3b"]);
  assertTaskIds(getDashboardSchedule([recurringLaterToday], "tomorrow", now), []);
  assertTaskIds(getDashboardSchedule([recurringLaterToday], "soon", now), []);
  assertEqual(getDashboardTaskInstant(recurringLaterToday, "today", now), "2026-06-26T23:00:00.000Z");
}

{
  const weeklyRecurring = buildTask({
    id: "task-4",
    remind_at: "2026-06-25T09:00:00.000Z",
    recurrence_rule: "FREQ=WEEKLY;BYDAY=SU",
  });

  assertTaskIds(getDashboardSchedule([weeklyRecurring], "today", now), []);
  assertTaskIds(getDashboardSchedule([weeklyRecurring], "tomorrow", now), []);
  assertTaskIds(getDashboardSchedule([weeklyRecurring], "soon", now), ["task-4"]);
  assertEqual(getDashboardTaskInstant(weeklyRecurring, "soon", now), "2026-06-28T09:00:00.000Z");
}

{
  const kyivDailyRecurring = buildTask({
    id: "task-5",
    remind_at: "2026-06-26T06:00:00.000Z",
    reminder_time_local: "09:00",
  });

  assertTaskIds(getDashboardSchedule([kyivDailyRecurring], "today", kyivNow, "Europe/Kyiv"), []);
  assertTaskIds(getDashboardSchedule([kyivDailyRecurring], "tomorrow", kyivNow, "Europe/Kyiv"), ["task-5"]);
  assertTaskIds(getDashboardSchedule([kyivDailyRecurring], "soon", kyivNow, "Europe/Kyiv"), ["task-5"]);
  assertEqual(getDashboardTaskInstant(kyivDailyRecurring, "tomorrow", kyivNow, "Europe/Kyiv"), "2026-06-27T06:00:00.000Z");
}
