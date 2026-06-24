export type AppLanguage = "en" | "ru" | "uk";
export type ReminderMode = "none" | "daily_at_time" | "every_n_hours" | "once_at_time";

export interface UserSettings {
  language: AppLanguage;
  timezone: string;
  default_snooze_minutes: number;
  default_quick_delay_minutes: number;
  default_deadline_reminder_mode: ReminderMode;
  default_deadline_reminder_time_local: string;
  default_deadline_reminder_interval_hours: number;
  default_waiting_reminder_mode: ReminderMode;
  default_waiting_reminder_time_local: string;
  default_waiting_reminder_interval_hours: number;
  default_recurring_reminder_time_local: string;
}
