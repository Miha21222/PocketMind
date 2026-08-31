import { apiRequest } from "./client";
import type { UserSettings } from "../types/settings";

// The Mini App keeps settings in localStorage, but bot-created tasks (e.g.
// voice notes) are made server-side where only the backend's UserPreferences
// row is visible. Mirror the client-owned values that shape reminders so those
// server-side tasks use the user's real settings.

export function syncPreferences(settings: UserSettings): Promise<{ synced: boolean }> {
  return apiRequest<{ synced: boolean }>("/preferences/me", {
    method: "PUT",
    body: JSON.stringify({
      language: settings.language,
      timezone: settings.timezone,
      default_snooze_minutes: settings.default_snooze_minutes,
      default_quick_delay_minutes: settings.default_quick_delay_minutes,
    }),
  });
}