import { UserSettings } from "../../types/settings";

// Settings are client-owned: they live here in localStorage and never sync to the
// backend. Instead each task carries a snapshot of the reminder-shaping values
// (timezone, language, snooze) in its sync payload, so the backend can compute and
// fire reminders without holding any user settings of its own.
export const SETTINGS_STORAGE_KEY = "pocketmind.settings.v1";

const TIMEZONE_ALIASES: Record<string, string> = {
  "Europe/Kiev": "Europe/Kyiv",
  "Europe/Uzhgorod": "Europe/Kyiv",
  "Europe/Zaporozhye": "Europe/Kyiv",
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Asia/Rangoon": "Asia/Yangon",
};

// Auto-detect the user's IANA timezone, normalizing legacy aliases to the
// canonical names returned by Intl.supportedValuesOf. Falls back to Europe/Kyiv.
export function detectTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return "Europe/Kyiv";
    return TIMEZONE_ALIASES[tz] ?? tz;
  } catch {
    return "Europe/Kyiv";
  }
}

export const DEFAULT_SETTINGS: UserSettings = {
  language: "en",
  timezone: detectTimezone(),
  default_snooze_minutes: 15,
  default_quick_delay_minutes: 10,
  default_deadline_reminder_mode: "daily_at_time",
  default_deadline_reminder_time_local: "09:00",
  default_deadline_reminder_interval_hours: 4,
  default_waiting_reminder_mode: "daily_at_time",
  default_waiting_reminder_time_local: "10:00",
  default_waiting_reminder_interval_hours: 4,
  default_recurring_reminder_time_local: "09:00",
};

export function readStoredSettings(): Partial<UserSettings> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<UserSettings>) : null;
  } catch {
    return null;
  }
}

export function writeStoredSettings(settings: UserSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

// Full, defaults-merged settings. Used both by the React provider's initial state
// and by the task repository when stamping each sync payload with its snapshot.
export function getEffectiveSettings(): UserSettings {
  return { ...DEFAULT_SETTINGS, ...(readStoredSettings() ?? {}) };
}
