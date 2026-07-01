import { AppLanguage } from "../types/settings";

export type TranslationKey =
  | "appTitle"
  | "appSubtitle"
  | "home"
  | "tasks"
  | "newTask"
  | "settings"
  | "dashboard"
  | "dashboardTasks"
  | "taskList"
  | "today"
  | "tomorrow"
  | "soon"
  | "showPeriod"
  | "overdue"
  | "upcoming"
  | "waiting"
  | "haptics"
  | "noDeadline"
  | "noTasks"
  | "status"
  | "type"
  | "active"
  | "completed"
  | "cancelled"
  | "allTypes"
  | "clear"
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
  | "discard"
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
  | "taskStatusActive"
  | "taskStatusSnoozed"
  | "taskStatusDone"
  | "taskStatusCancelled"
  | "filterTasks"
  | "errorTitleRequired"
  | "errorTitleTooLong"
  | "errorDescriptionTooLong"
  | "errorRecurrenceRequired"
  | "errorDeadlineRequired"
  | "errorTimeRequired"
  | "errorReminderTimeRequired"
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
  | "unsavedSettingsTitle"
  | "unsavedSettingsBody"
  | "authFailed"
  | "quickAutoReminderHint"
  | "minutes"
  | "reminderMode"
  | "reminderModeNone"
  | "reminderModeDaily"
  | "reminderModeInterval"
  | "reminderModeOnce"
  | "reminderAtTime"
  | "remindEveryHours"
  | "saving"
  | "taskCreated"
  | "taskUpdated"
  | "taskUpdateFailed"
  | "taskMarkedDone"
  | "taskActionFailed"
  | "taskCancelledMsg"
  | "confirmDeleteTask"
  | "taskDeletedMsg"
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
  | "openInTelegramRedirecting"
  | "feedbackSupport"
  | "rateExperience"
  | "reportBug"
  | "feedbackRatingLabel"
  | "feedbackCommentLabel"
  | "feedbackCommentPlaceholder"
  | "bugDescriptionLabel"
  | "bugDescriptionPlaceholder"
  | "errorRatingRequired"
  | "errorBugDescriptionRequired"
  | "feedbackSent"
  | "feedbackSendError"
  | "send"
  | "screenshotFieldLabel"
  | "attachScreenshot"
  | "removeScreenshot"
  | "errorScreenshotType"
  | "errorScreenshotTooLarge"
  | "feedbackScreenshotUploadFailed";

export const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  en: {
    appTitle: "PocketMind",
    appSubtitle: "Your pocket memory",
    home: "Home",
    tasks: "Tasks",
    newTask: "New",
    settings: "Settings",
    dashboard: "Dashboard",
    dashboardTasks: "Tasks",
    taskList: "All tasks",
    today: "Today",
    tomorrow: "Tomorrow",
    soon: "Coming up",
    showPeriod: "Show",
    overdue: "Overdue",
    upcoming: "Upcoming reminders",
    waiting: "Waiting",
    haptics: "Haptic feedback",
    noDeadline: "No deadline",
    noTasks: "No tasks",
    status: "Status",
    type: "Type",
    active: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
    allTypes: "All types",
    clear: "Clear",
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
    discard: "Discard",
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
    taskStatusActive: "Active",
    taskStatusSnoozed: "Snoozed",
    taskStatusDone: "Done",
    taskStatusCancelled: "Cancelled",
    filterTasks: "Filter tasks",
    errorTitleRequired: "Title is required",
    errorTitleTooLong: "Title is too long",
    errorDescriptionTooLong: "Description is too long",
    errorRecurrenceRequired: "Recurrence is required for a recurring task",
    errorDeadlineRequired: "Deadline is required for a deadline task",
    errorTimeRequired: "Time is required",
    errorReminderTimeRequired: "Reminder time is required",
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
    unsavedSettingsTitle: "Unsaved settings",
    unsavedSettingsBody: "Save your changes or discard them to return to the last saved values.",
    authFailed: "Auth failed",
    quickAutoReminderHint: "Auto reminder after",
    minutes: "minutes",
    reminderMode: "Reminder mode",
    reminderModeNone: "No reminders",
    reminderModeDaily: "Every day at time",
    reminderModeInterval: "Every N hours",
    reminderModeOnce: "Once at selected time",
    reminderAtTime: "Reminder time (HH:mm)",
    remindEveryHours: "Remind every N hours",
    saving: "Saving...",
    taskCreated: "Task created",
    taskUpdated: "Task updated",
    taskUpdateFailed: "Failed to update task",
    taskMarkedDone: "Task marked done",
    taskActionFailed: "Task action failed",
    taskCancelledMsg: "Task cancelled",
    confirmDeleteTask: "Delete this task? This can't be undone.",
    taskDeletedMsg: "Task deleted",
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
    feedbackSupport: "Feedback & Support",
    rateExperience: "Rate your experience",
    reportBug: "Report a bug",
    feedbackRatingLabel: "How would you rate your experience?",
    feedbackCommentLabel: "Comment (optional)",
    feedbackCommentPlaceholder: "Anything you'd like to add?",
    bugDescriptionLabel: "What went wrong?",
    bugDescriptionPlaceholder: "Describe the issue and how to reproduce it",
    errorRatingRequired: "Please select a rating",
    errorBugDescriptionRequired: "Please describe the issue",
    feedbackSent: "Thanks for your feedback!",
    feedbackSendError: "Couldn't send feedback. Please try again.",
    send: "Send",
    screenshotFieldLabel: "Screenshot (optional)",
    attachScreenshot: "Attach a screenshot",
    removeScreenshot: "Remove screenshot",
    errorScreenshotType: "Please choose an image file",
    errorScreenshotTooLarge: "Image must be smaller than 8 MB",
    feedbackScreenshotUploadFailed: "Report sent, but the screenshot failed to upload",
  },
  ru: {
    appTitle: "PocketMind",
    appSubtitle: "Ваша карманная память",
    home: "Главная",
    tasks: "Задачи",
    newTask: "Новая",
    settings: "Настройки",
    dashboard: "Дашборд",
    dashboardTasks: "Задачи",
    taskList: "Все задачи",
    today: "Сегодня",
    tomorrow: "Завтра",
    soon: "Ближайшее время",
    showPeriod: "Показать",
    overdue: "Просроченные",
    upcoming: "Ближайшие напоминания",
    waiting: "Ожидание",
    haptics: "Тактильный отклик",
    noDeadline: "Без дедлайна",
    noTasks: "Нет задач",
    status: "Статус",
    type: "Тип",
    active: "Активные",
    completed: "Выполненные",
    cancelled: "Отменённые",
    allTypes: "Все типы",
    clear: "Сбросить",
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
    discard: "Сбросить",
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
    taskStatusActive: "Активна",
    taskStatusSnoozed: "Отложена",
    taskStatusDone: "Выполнена",
    taskStatusCancelled: "Отменена",
    filterTasks: "Фильтр задач",
    errorTitleRequired: "Укажите заголовок",
    errorTitleTooLong: "Заголовок слишком длинный",
    errorDescriptionTooLong: "Описание слишком длинное",
    errorRecurrenceRequired: "Для повторяющейся задачи нужно указать повтор",
    errorDeadlineRequired: "Для задачи с дедлайном нужно указать дату",
    errorTimeRequired: "Укажите время",
    errorReminderTimeRequired: "Укажите время напоминания",
    failedCreateTask: "Не удалось создать задачу",
    failedLoadTask: "Не удалось загрузить задачу",
    timezone: "Часовой пояс",
    language: "Язык",
    defaultSnooze: "Отложить по умолчанию (минуты)",
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
    unsavedSettingsTitle: "Есть несохранённые настройки",
    unsavedSettingsBody: "Сохраните изменения или сбросьте их, чтобы вернуться к последним сохранённым значениям.",
    authFailed: "Ошибка авторизации",
    quickAutoReminderHint: "Автонапоминание через",
    minutes: "минут",
    reminderMode: "Режим напоминаний",
    reminderModeNone: "Без напоминаний",
    reminderModeDaily: "Каждый день в выбранное время",
    reminderModeInterval: "Каждые N часов",
    reminderModeOnce: "Один раз в выбранное время",
    reminderAtTime: "Время напоминания (HH:mm)",
    remindEveryHours: "Напоминать каждые N часов",
    saving: "Сохранение...",
    taskCreated: "Задача создана",
    taskUpdated: "Задача обновлена",
    taskUpdateFailed: "Не удалось обновить задачу",
    taskMarkedDone: "Задача отмечена выполненной",
    taskActionFailed: "Не удалось выполнить действие",
    taskCancelledMsg: "Задача отменена",
    confirmDeleteTask: "Удалить эту задачу? Это действие нельзя отменить.",
    taskDeletedMsg: "Задача удалена",
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
    feedbackSupport: "Отзывы и поддержка",
    rateExperience: "Оценить приложение",
    reportBug: "Сообщить об ошибке",
    feedbackRatingLabel: "Как бы вы оценили приложение?",
    feedbackCommentLabel: "Комментарий (необязательно)",
    feedbackCommentPlaceholder: "Хотите что-то добавить?",
    bugDescriptionLabel: "Что пошло не так?",
    bugDescriptionPlaceholder: "Опишите проблему и как её воспроизвести",
    errorRatingRequired: "Пожалуйста, выберите оценку",
    errorBugDescriptionRequired: "Пожалуйста, опишите проблему",
    feedbackSent: "Спасибо за отзыв!",
    feedbackSendError: "Не удалось отправить отзыв. Попробуйте ещё раз.",
    send: "Отправить",
    screenshotFieldLabel: "Скриншот (необязательно)",
    attachScreenshot: "Прикрепить скриншот",
    removeScreenshot: "Убрать скриншот",
    errorScreenshotType: "Пожалуйста, выберите файл изображения",
    errorScreenshotTooLarge: "Изображение должно быть меньше 8 МБ",
    feedbackScreenshotUploadFailed: "Обращение отправлено, но скриншот не удалось загрузить",
  },
  uk: {
    appTitle: "PocketMind",
    appSubtitle: "Ваша кишенькова пам'ять",
    home: "Головна",
    tasks: "Завдання",
    newTask: "Нове",
    settings: "Налаштування",
    dashboard: "Дашборд",
    dashboardTasks: "Завдання",
    taskList: "Усі завдання",
    today: "Сьогодні",
    tomorrow: "Завтра",
    soon: "Найближчим часом",
    showPeriod: "Показати",
    overdue: "Прострочені",
    upcoming: "Найближчі нагадування",
    waiting: "Очікування",
    haptics: "Тактильний відгук",
    noDeadline: "Без дедлайну",
    noTasks: "Немає завдань",
    status: "Статус",
    type: "Тип",
    active: "Активні",
    completed: "Виконані",
    cancelled: "Скасовані",
    allTypes: "Усі типи",
    clear: "Скинути",
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
    discard: "Скинути",
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
    taskStatusActive: "Активне",
    taskStatusSnoozed: "Відкладене",
    taskStatusDone: "Виконане",
    taskStatusCancelled: "Скасоване",
    filterTasks: "Фільтр завдань",
    errorTitleRequired: "Вкажіть заголовок",
    errorTitleTooLong: "Заголовок занадто довгий",
    errorDescriptionTooLong: "Опис занадто довгий",
    errorRecurrenceRequired: "Для повторюваного завдання потрібно вказати повтор",
    errorDeadlineRequired: "Для завдання з дедлайном потрібно вказати дату",
    errorTimeRequired: "Вкажіть час",
    errorReminderTimeRequired: "Вкажіть час нагадування",
    failedCreateTask: "Не вдалося створити завдання",
    failedLoadTask: "Не вдалося завантажити завдання",
    timezone: "Часовий пояс",
    language: "Мова",
    defaultSnooze: "Відкласти за замовчуванням (хвилини)",
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
    unsavedSettingsTitle: "Є незбережені налаштування",
    unsavedSettingsBody: "Збережіть зміни або скиньте їх, щоб повернутися до останніх збережених значень.",
    authFailed: "Помилка авторизації",
    quickAutoReminderHint: "Автонагадування через",
    minutes: "хвилин",
    reminderMode: "Режим нагадувань",
    reminderModeNone: "Без нагадувань",
    reminderModeDaily: "Щодня у вибраний час",
    reminderModeInterval: "Кожні N годин",
    reminderModeOnce: "Один раз у вибраний час",
    reminderAtTime: "Час нагадування (HH:mm)",
    remindEveryHours: "Нагадувати кожні N годин",
    saving: "Збереження...",
    taskCreated: "Завдання створено",
    taskUpdated: "Завдання оновлено",
    taskUpdateFailed: "Не вдалося оновити завдання",
    taskMarkedDone: "Завдання позначено виконаним",
    taskActionFailed: "Не вдалося виконати дію",
    taskCancelledMsg: "Завдання скасовано",
    confirmDeleteTask: "Видалити це завдання? Цю дію не можна скасувати.",
    taskDeletedMsg: "Завдання видалено",
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
    feedbackSupport: "Відгуки та підтримка",
    rateExperience: "Оцінити застосунок",
    reportBug: "Повідомити про помилку",
    feedbackRatingLabel: "Як би ви оцінили застосунок?",
    feedbackCommentLabel: "Коментар (необов'язково)",
    feedbackCommentPlaceholder: "Хочете щось додати?",
    bugDescriptionLabel: "Що пішло не так?",
    bugDescriptionPlaceholder: "Опишіть проблему і як її відтворити",
    errorRatingRequired: "Будь ласка, оберіть оцінку",
    errorBugDescriptionRequired: "Будь ласка, опишіть проблему",
    feedbackSent: "Дякуємо за відгук!",
    feedbackSendError: "Не вдалося надіслати відгук. Спробуйте ще раз.",
    send: "Надіслати",
    screenshotFieldLabel: "Скріншот (необов'язково)",
    attachScreenshot: "Прикріпити скріншот",
    removeScreenshot: "Прибрати скріншот",
    errorScreenshotType: "Будь ласка, оберіть файл зображення",
    errorScreenshotTooLarge: "Зображення має бути менше 8 МБ",
    feedbackScreenshotUploadFailed: "Звернення надіслано, але скріншот не вдалося завантажити",
  },
};
