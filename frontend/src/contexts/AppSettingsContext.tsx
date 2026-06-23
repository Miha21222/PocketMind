import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getMySettings, updateMySettings } from "../api/settings";
import { translations, TranslationKey } from "../i18n/translations";
import { AppLanguage, UserSettings } from "../types/settings";

type AppSettingsContextValue = {
  settings: UserSettings;
  pending: boolean;
  t: (key: TranslationKey) => string;
  setLanguage: (language: AppLanguage) => Promise<void>;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  timezoneOptions: string[];
};

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
function detectTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return "Europe/Kyiv";
    return TIMEZONE_ALIASES[tz] ?? tz;
  } catch {
    return "Europe/Kyiv";
  }
}

const DEFAULT_SETTINGS: UserSettings = {
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

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

// Collapse legacy aliases (e.g. Europe/Kiev) to their canonical name and drop
// duplicates, so the picker shows one consistent spelling regardless of what
// the runtime's Intl returns.
function canonicalizeZones(zones: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const zone of zones) {
    const canonical = TIMEZONE_ALIASES[zone] ?? zone;
    if (!seen.has(canonical)) {
      seen.add(canonical);
      result.push(canonical);
    }
  }
  return result;
}

function detectTimezoneOptions(): string[] {
  const fallback = [
    "Europe/Kyiv",
    "Europe/Warsaw",
    "Europe/London",
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Los_Angeles",
    "Asia/Tbilisi",
  ];
  const supportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
  let zones = fallback;
  if (supportedValuesOf) {
    try {
      const all = supportedValuesOf("timeZone");
      if (all.length > 0) zones = all;
    } catch {
      zones = fallback;
    }
  }
  return canonicalizeZones(zones);
}

type ProviderProps = {
  initialSettings?: UserSettings | null;
};

export function AppSettingsProvider({ children, initialSettings }: PropsWithChildren<ProviderProps>) {
  const [settings, setSettings] = useState<UserSettings>({ ...DEFAULT_SETTINGS, ...(initialSettings ?? {}) });
  const settingsQuery = useQuery({
    queryKey: ["settings", "me"],
    queryFn: getMySettings,
    enabled: !initialSettings,
  });
  useEffect(() => {
    if (settingsQuery.data) {
      setSettings({ ...DEFAULT_SETTINGS, ...settingsQuery.data });
    }
  }, [settingsQuery.data]);
  const timezoneOptions = useMemo(() => detectTimezoneOptions(), []);
  const updateMutation = useMutation({
    mutationFn: (patch: Partial<UserSettings>) =>
      updateMySettings({
        language: patch.language,
        timezone: patch.timezone,
        default_snooze_minutes: patch.default_snooze_minutes,
        default_quick_delay_minutes: patch.default_quick_delay_minutes,
        default_deadline_reminder_mode: patch.default_deadline_reminder_mode,
        default_deadline_reminder_time_local: patch.default_deadline_reminder_time_local,
        default_deadline_reminder_interval_hours: patch.default_deadline_reminder_interval_hours,
        default_waiting_reminder_mode: patch.default_waiting_reminder_mode,
        default_waiting_reminder_time_local: patch.default_waiting_reminder_time_local,
        default_waiting_reminder_interval_hours: patch.default_waiting_reminder_interval_hours,
        default_recurring_reminder_time_local: patch.default_recurring_reminder_time_local,
      }),
    onSuccess: (fresh) => setSettings(fresh),
  });

  const value = useMemo<AppSettingsContextValue>(
    () => ({
      settings,
      pending: updateMutation.isPending,
      t: (key: TranslationKey) => translations[settings.language]?.[key] ?? translations.en[key] ?? key,
      setLanguage: async (language: AppLanguage) => {
        const prev = settings;
        setSettings({ ...settings, language });
        try {
          await updateMutation.mutateAsync({ language });
        } catch {
          setSettings(prev);
          throw new Error("language_save_failed");
        }
      },
      updateSettings: async (patch: Partial<UserSettings>) => {
        const prev = settings;
        setSettings({ ...settings, ...patch });
        try {
          await updateMutation.mutateAsync(patch);
        } catch {
          setSettings(prev);
          throw new Error("settings_save_failed");
        }
      },
      timezoneOptions,
    }),
    [settings, timezoneOptions, updateMutation],
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings(): AppSettingsContextValue {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error("useAppSettings must be used within AppSettingsProvider");
  }
  return context;
}
