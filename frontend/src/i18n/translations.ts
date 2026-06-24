import { AppLanguage } from "../types/settings";

export type TranslationKey =
  | "appTitle"
  | "appSubtitle"
  | "home"
  | "tasks"
  | "newTask"
  | "settings"
  | "dashboard"
  | "taskList"
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
  | "save"
  | "saveTask"
  | "delete"
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
  | "back"
  | "done"
  | "cancel"
  | "taskStatusNew"
  | "taskStatusPlanned"
  | "taskStatusReminded"
  | "taskStatusSnoozed"
  | "taskStatusDone"
  | "taskStatusCancelled"
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
  | "voiceUnavailable"
  | "voiceTapToRecord"
  | "voiceCancel"
  | "openInTelegramTitle"
  | "openInTelegramSubtitle"
  | "openInTelegramButton"
  | "openInTelegramRedirecting";

export const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  en: {
    appTitle: "PocketMind",
    appSubtitle: "Your pocket memory",
    home: "Home",
    tasks: "Tasks",
    newTask: "New",
    settings: "Settings",
    dashboard: "Dashboard",
    taskList: "Task list",
    today: "Today",
    overdue: "Overdue",
    upcoming: "Upcoming reminders",
    waiting: "Waiting",
    noDeadline: "No deadline",
    noTasks: "No tasks",
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
    failedToLoadTasks: "Failed to load tasks",
    retry: "Retry",
    taskNotFound: "Task not found",
    editTask: "Edit Task",
    createTask: "Create Task",
    save: "Save",
    saveTask: "Save task",
    delete: "Delete",
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
    back: "Back",
    done: "Done",
    cancel: "Cancel",
    taskStatusNew: "New",
    taskStatusPlanned: "Planned",
    taskStatusReminded: "Reminded",
    taskStatusSnoozed: "Snoozed",
    taskStatusDone: "Done",
    taskStatusCancelled: "Cancelled",
    filterTasks: "Filter tasks",
    failedCreateTask: "Failed to create task",
    failedLoadTask: "Failed to load task",
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
    voiceTapToRecord: "Tap to record",
    voiceCancel: "Cancel",
    openInTelegramTitle: "Open in Telegram",
    openInTelegramSubtitle: "PocketMind lives inside Telegram. Tap below to open the bot and launch the app",
    openInTelegramButton: "Open in Telegram",
    openInTelegramRedirecting: "Redirecting to Telegram…",
  },
  ru: {
    appTitle: "PocketMind",
    appSubtitle: "Ваша карманная память",
    home: "Главная",
    tasks: "Задачи",
    newTask: "Новая",
    settings: "Настройки",
    dashboard: "Дашборд",
    taskList: "Список задач",
    today: "Сегодня",
    overdue: "Просрочено",
    upcoming: "Ближайшие напоминания",
    waiting: "Ожидание",
    noDeadline: "Без дедлайна",
    noTasks: "Нет задач",
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
    failedToLoadTasks: "Не удалось загрузить задачи",
    retry: "Повторить",
    taskNotFound: "Задача не найдена",
    editTask: "Редактировать задачу",
    createTask: "Создать задачу",
    save: "Сохранить",
    saveTask: "Сохранить задачу",
    delete: "Удалить",
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
    back: "Назад",
    done: "Готово",
    cancel: "Отмена",
    taskStatusNew: "Новая",
    taskStatusPlanned: "Запланирована",
    taskStatusReminded: "Напомнена",
    taskStatusSnoozed: "Отложена",
    taskStatusDone: "Выполнена",
    taskStatusCancelled: "Отменена",
    filterTasks: "Фильтр задач",
    failedCreateTask: "Не удалось создать задачу",
    failedLoadTask: "Не удалось загрузить задачу",
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
    voiceTapToRecord: "Нажмите, чтобы записать",
    voiceCancel: "Отмена",
    openInTelegramTitle: "Откройте в Telegram",
    openInTelegramSubtitle: "PocketMind работает внутри Telegram. Нажмите кнопку, чтобы открыть бота и запустить приложение",
    openInTelegramButton: "Открыть в Telegram",
    openInTelegramRedirecting: "Перенаправляем в Telegram…",
  },
  uk: {
    appTitle: "PocketMind",
    appSubtitle: "Ваша кишенькова пам'ять",
    home: "Головна",
    tasks: "Завдання",
    newTask: "Нове",
    settings: "Налаштування",
    dashboard: "Дашборд",
    taskList: "Список завдань",
    today: "Сьогодні",
    overdue: "Прострочено",
    upcoming: "Найближчі нагадування",
    waiting: "Очікування",
    noDeadline: "Без дедлайну",
    noTasks: "Немає завдань",
    status: "Статус",
    type: "Тип",
    active: "Активні",
    completed: "Виконані",
    cancelled: "Скасовані",
    allTypes: "Усі типи",
    quick: "Швидка",
    deadline: "Дедлайн",
    recurring: "Повторювана",
    loading: "Завантаження...",
    loadingTask: "Завантаження завдання...",
    loadingTasks: "Завантаження завдань...",
    authorizing: "Авторизація через Telegram...",
    failedToLoadTasks: "Не вдалося завантажити завдання",
    retry: "Повторити",
    taskNotFound: "Завдання не знайдено",
    editTask: "Редагувати завдання",
    createTask: "Створити завдання",
    save: "Зберегти",
    saveTask: "Зберегти завдання",
    delete: "Видалити",
    title: "Заголовок",
    description: "Опис",
    reminderTime: "Нагадування",
    deadlineLabel: "Дедлайн",
    deadlineOptional: "Дедлайн (необов'язково)",
    recurrence: "Повтор",
    selectRecurrence: "Оберіть повтор",
    daily: "Щодня",
    weeklyMon: "Щотижня (понеділок)",
    monthly: "Щомісяця",
    open: "Відкрити",
    edit: "Змінити",
    back: "Назад",
    done: "Готово",
    cancel: "Скасувати",
    taskStatusNew: "Нове",
    taskStatusPlanned: "Заплановане",
    taskStatusReminded: "Нагадано",
    taskStatusSnoozed: "Відкладене",
    taskStatusDone: "Виконане",
    taskStatusCancelled: "Скасоване",
    filterTasks: "Фільтр завдань",
    failedCreateTask: "Не вдалося створити завдання",
    failedLoadTask: "Не вдалося завантажити завдання",
    timezone: "Часовий пояс",
    language: "Мова",
    defaultSnooze: "Снуз за замовчуванням (хвилини)",
    defaultQuickDelay: "Затримка нагадування швидкої задачі (хвилини)",
    defaultDeadlineReminderMode: "Режим нагадувань дедлайну за замовчуванням",
    defaultDeadlineReminderTime: "Час нагадувань дедлайну за замовчуванням",
    defaultDeadlineReminderInterval: "Інтервал дедлайну за замовчуванням (години)",
    defaultWaitingReminderMode: "Режим нагадувань очікування за замовчуванням",
    defaultWaitingReminderTime: "Час нагадувань очікування за замовчуванням",
    defaultWaitingReminderInterval: "Інтервал очікування за замовчуванням (години)",
    defaultRecurringReminderTime: "Час нагадувань повторюваних за замовчуванням",
    saveSettings: "Зберегти налаштування",
    settingsSaved: "Налаштування збережено",
    settingsSaveError: "Не вдалося зберегти налаштування",
    authFailed: "Помилка авторизації",
    quickAutoReminderHint: "Автонагадування через",
    minutes: "хвилин",
    reminderMode: "Режим нагадувань",
    reminderModeNone: "Без нагадувань",
    reminderModeDaily: "Щодня у вибраний час",
    reminderModeInterval: "Кожні N годин",
    reminderAtTime: "Час нагадування (HH:mm)",
    remindEveryHours: "Нагадувати кожні N годин",
    saving: "Збереження...",
    taskCreated: "Завдання створено",
    taskUpdated: "Завдання оновлено",
    taskUpdateFailed: "Не вдалося оновити завдання",
    taskMarkedDone: "Завдання позначено виконаним",
    taskActionFailed: "Не вдалося виконати дію",
    taskCancelledMsg: "Завдання скасовано",
    languageUpdated: "Мову оновлено",
    voiceInput: "Голосове введення",
    voiceRecording: "Запис… натисніть, щоб зупинити",
    voiceTranscribing: "Розпізнаю…",
    voiceUnavailable: "Мікрофон недоступний",
    voiceTapToRecord: "Натисніть, щоб записати",
    voiceCancel: "Скасувати",
    openInTelegramTitle: "Відкрийте в Telegram",
    openInTelegramSubtitle: "PocketMind працює всередині Telegram. Натисніть кнопку, щоб відкрити бота та запустити застосунок",
    openInTelegramButton: "Відкрити в Telegram",
    openInTelegramRedirecting: "Перенаправляємо в Telegram…",
  },
};
