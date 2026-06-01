import { apiRequest } from "./client";
import { UserSettings } from "../types/settings";

export interface SettingsUpdatePayload {
  language?: "en" | "ru";
  timezone?: string;
  default_snooze_minutes?: number;
  default_quick_delay_minutes?: number;
  default_deadline_reminder_mode?: "none" | "daily_at_time" | "every_n_hours";
  default_deadline_reminder_time_local?: string;
  default_deadline_reminder_interval_hours?: number;
  default_waiting_reminder_mode?: "none" | "daily_at_time" | "every_n_hours";
  default_waiting_reminder_time_local?: string;
  default_waiting_reminder_interval_hours?: number;
  default_recurring_reminder_time_local?: string;
}

export function getMySettings(): Promise<UserSettings> {
  return apiRequest<UserSettings>("/settings/me");
}

export function updateMySettings(payload: SettingsUpdatePayload): Promise<UserSettings> {
  return apiRequest<UserSettings>("/settings/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
