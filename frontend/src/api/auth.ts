import { apiRequest } from "./client";
import { UserSettings } from "../types/settings";

export interface AuthUser {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name?: string | null;
  last_name?: string | null;
  language_code?: string | null;
  preferred_language?: string | null;
  preferred_timezone?: string | null;
  default_snooze_minutes?: number;
  default_quick_delay_minutes?: number;
  default_deadline_reminder_mode?: string;
  default_deadline_reminder_time_local?: string;
  default_deadline_reminder_interval_hours?: number;
  default_waiting_reminder_mode?: string;
  default_waiting_reminder_time_local?: string;
  default_waiting_reminder_interval_hours?: number;
  default_recurring_reminder_time_local?: string;
  settings?: UserSettings | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: "bearer";
  user: AuthUser;
}

export function authWithTelegram(initData: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/telegram", {
    method: "POST",
    body: JSON.stringify({ init_data: initData }),
  });
}
