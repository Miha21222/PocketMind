import { AppLanguage } from "../types/settings";

export type TranslationKey =
  | "appTitle"
  | "appSubtitle"
  | "home"
  | "tasks"
  | "newTask"
  | "settings"
  | "dashboard"
  | "today"
  | "overdue"
  | "upcoming"
  | "waiting"
  | "noDeadline"
  | "noTasks"
  | "status"
  | "type"
  | "active"
  | "completed"
  | "cancelled"
  | "allTypes"
  | "quick"
  | "deadline"
  | "recurring"
  | "loading"
  | "loadingTask"
  | "loadingTasks"
  | "authorizing"
  | "failedToLoadTasks"
  | "retry"
  | "taskNotFound"
  | "editTask"
  | "createTask"
  | "saveTask"
  | "title"
  | "description"
  | "reminderTime"
  | "deadlineLabel"
  | "deadlineOptional"
  | "recurrence"
  | "selectRecurrence"
  | "daily"
  | "weeklyMon"
  | "monthly"
  | "open"
  | "edit"
  | "done"
  | "cancel"
  | "filterTasks"
  | "failedCreateTask"
  | "failedLoadTask"
  | "timezone"
  | "language"
  | "defaultSnooze"
  | "defaultQuickDelay"
  | "defaultDeadlineReminderMode"
  | "defaultDeadlineReminderTime"
  | "defaultDeadlineReminderInterval"
  | "defaultWaitingReminderMode"
  | "defaultWaitingReminderTime"
  | "defaultWaitingReminderInterval"
  | "defaultRecurringReminderTime"
  | "saveSettings"
  | "settingsSaved"
  | "settingsSaveError"
  | "authFailed"
  | "quickAutoReminderHint"
  | "minutes"
  | "reminderMode"
  | "reminderModeNone"
  | "reminderModeDaily"
  | "reminderModeInterval"
  | "reminderAtTime"
  | "remindEveryHours"
  | "saving"
  | "taskCreated"
  | "taskUpdated"
  | "taskUpdateFailed"
  | "taskMarkedDone"
  | "taskActionFailed"
  | "taskCancelledMsg"
  | "languageUpdated"
  | "voiceInput"
  | "voiceRecording"
  | "voiceTranscribing"
  | "voiceUnavailable";

export const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  en: {
    appTitle: "PocketMind",
    appSubtitle: "Your pocket memory",
    home: "Home",
    tasks: "Tasks",
    newTask: "New",
    settings: "Settings",
    dashboard: "Dashboard",
    today: "Today",
    overdue: "Overdue",
    upcoming: "Upcoming reminders",
    waiting: "Waiting",
    noDeadline: "No deadline",
    noTasks: "No tasks.",
    status: "Status",
    type: "Type",
    active: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
    allTypes: "All types",
    quick: "Quick",
    deadline: "Deadline",
    recurring: "Recurring",
    loading: "Loading...",
    loadingTask: "Loading task...",
    loadingTasks: "Loading tasks...",
    authorizing: "Authorizing with Telegram...",
    failedToLoadTasks: "Failed to load tasks.",
    retry: "Retry",
    taskNotFound: "Task not found.",
    editTask: "Edit Task",
    createTask: "Create Task",
    saveTask: "Save task",
    title: "Title",
    description: "Description",
    reminderTime: "Reminder",
    deadlineLabel: "Deadline",
    deadlineOptional: "Deadline (optional)",
    recurrence: "Recurrence",
    selectRecurrence: "Select recurrence",
    daily: "Daily",
    weeklyMon: "Weekly (Monday)",
    monthly: "Monthly",
    open: "Open",
    edit: "Edit",
    done: "Done",
    cancel: "Cancel",
    filterTasks: "Filter tasks",
    failedCreateTask: "Failed to create task",
    failedLoadTask: "Failed to load task.",
    timezone: "Timezone",
    language: "Language",
    defaultSnooze: "Default snooze (minutes)",
    defaultQuickDelay: "Quick task reminder delay (minutes)",
    defaultDeadlineReminderMode: "Default deadline reminder mode",
    defaultDeadlineReminderTime: "Default deadline reminder time",
    defaultDeadlineReminderInterval: "Default deadline interval (hours)",
    defaultWaitingReminderMode: "Default waiting reminder mode",
    defaultWaitingReminderTime: "Default waiting reminder time",
    defaultWaitingReminderInterval: "Default waiting interval (hours)",
    defaultRecurringReminderTime: "Default recurring reminder time",
    saveSettings: "Save settings",
    settingsSaved: "Settings saved",
    settingsSaveError: "Failed to save settings",
    authFailed: "Auth failed",
    quickAutoReminderHint: "Auto reminder after",
    minutes: "minutes",
    reminderMode: "Reminder mode",
    reminderModeNone: "No reminders",
    reminderModeDaily: "Every day at time",
    reminderModeInterval: "Every N hours",
    reminderAtTime: "Reminder time (HH:mm)",
    remindEveryHours: "Remind every N hours",
    saving: "Saving...",
    taskCreated: "Task created",
    taskUpdated: "Task updated",
    taskUpdateFailed: "Failed to update task",
    taskMarkedDone: "Task marked done",
    taskActionFailed: "Task action failed",
    taskCancelledMsg: "Task cancelled",
    languageUpdated: "Language updated",
    voiceInput: "Voice input",
    voiceRecording: "Recording… tap to stop",
    voiceTranscribing: "Transcribing…",
    voiceUnavailable: "Microphone unavailable",
  },
  ru: {
    appTitle: "PocketMind",
    appSubtitle: "Ваша карманная память",
    home: "Главная",
    tasks: "Задачи",
    newTask: "Новая",
    settings: "Настройки",
    dashboard: "Дашборд",
    today: "Сегодня",
    overdue: "Просрочено",
    upcoming: "Ближайшие напоминания",
    waiting: "Ожидание",
    noDeadline: "Без дедлайна",
    noTasks: "Нет задач.",
    status: "Статус",
    type: "Тип",
    active: "Активные",
    completed: "Выполненные",
    cancelled: "Отменённые",
    allTypes: "Все типы",
    quick: "Быстрая",
    deadline: "Дедлайн",
    recurring: "Повторяющаяся",
    loading: "Загрузка...",
    loadingTask: "Загрузка задачи...",
    loadingTasks: "Загрузка задач...",
    authorizing: "Авторизация через Telegram...",
    failedToLoadTasks: "Не удалось загрузить задачи.",
    retry: "Повторить",
    taskNotFound: "Задача не найдена.",
    editTask: "Редактировать задачу",
    createTask: "Создать задачу",
    saveTask: "Сохранить задачу",
    title: "Заголовок",
    description: "Описание",
    reminderTime: "Напоминание",
    deadlineLabel: "Дедлайн",
    deadlineOptional: "Дедлайн (необязательно)",
    recurrence: "Повтор",
    selectRecurrence: "Выберите повтор",
    daily: "Ежедневно",
    weeklyMon: "Еженедельно (понедельник)",
    monthly: "Ежемесячно",
    open: "Открыть",
    edit: "Изменить",
    done: "Готово",
    cancel: "Отмена",
    filterTasks: "Фильтр задач",
    failedCreateTask: "Не удалось создать задачу",
    failedLoadTask: "Не удалось загрузить задачу.",
    timezone: "Часовой пояс",
    language: "Язык",
    defaultSnooze: "Снуз по умолчанию (минуты)",
    defaultQuickDelay: "Задержка напоминания быстрой задачи (минуты)",
    defaultDeadlineReminderMode: "Режим напоминаний дедлайна по умолчанию",
    defaultDeadlineReminderTime: "Время напоминаний дедлайна по умолчанию",
    defaultDeadlineReminderInterval: "Интервал дедлайна по умолчанию (часы)",
    defaultWaitingReminderMode: "Режим напоминаний waiting по умолчанию",
    defaultWaitingReminderTime: "Время напоминаний waiting по умолчанию",
    defaultWaitingReminderInterval: "Интервал waiting по умолчанию (часы)",
    defaultRecurringReminderTime: "Время напоминаний recurring по умолчанию",
    saveSettings: "Сохранить настройки",
    settingsSaved: "Настройки сохранены",
    settingsSaveError: "Не удалось сохранить настройки",
    authFailed: "Ошибка авторизации",
    quickAutoReminderHint: "Автонапоминание через",
    minutes: "минут",
    reminderMode: "Режим напоминаний",
    reminderModeNone: "Без напоминаний",
    reminderModeDaily: "Каждый день в выбранное время",
    reminderModeInterval: "Каждые N часов",
    reminderAtTime: "Время напоминания (HH:mm)",
    remindEveryHours: "Напоминать каждые N часов",
    saving: "Сохранение...",
    taskCreated: "Задача создана",
    taskUpdated: "Задача обновлена",
    taskUpdateFailed: "Не удалось обновить задачу",
    taskMarkedDone: "Задача отмечена выполненной",
    taskActionFailed: "Не удалось выполнить действие",
    taskCancelledMsg: "Задача отменена",
    languageUpdated: "Язык обновлён",
    voiceInput: "Голосовой ввод",
    voiceRecording: "Запись… нажмите, чтобы остановить",
    voiceTranscribing: "Распознаю…",
    voiceUnavailable: "Микрофон недоступен",
  },
};
