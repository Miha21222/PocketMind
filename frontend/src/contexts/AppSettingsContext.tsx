import { createContext, PropsWithChildren, useContext, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { translations, TranslationKey } from "../i18n/translations";
import { AppLanguage, UserSettings } from "../types/settings";
import { getEffectiveSettings, writeStoredSettings } from "../features/settings/localSettings";
import { TASKS_SYNC_QUERY_KEY } from "../features/tasks/cache";

// Settings are client-owned and live in localStorage only — they never sync to
// the backend. Each task instead carries a snapshot of the reminder-shaping
// values in its own sync payload (see localTaskRepository), so changing a setting
// is a pure local write with no awaited request and no failure path.

type AppSettingsContextValue = {
  settings: UserSettings;
  pending: boolean;
  t: (key: TranslationKey) => string;
  setLanguage: (language: AppLanguage) => Promise<void>;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  timezoneOptions: string[];
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

// Curated short list of timezones for the picker (Europe + CIS/Caucasus
// focus). The user's actual detected/saved zone is always prepended in the
// Settings page, so picking an off-list zone still works.
const COMMON_TIMEZONES = [
  "UTC",
  "Europe/Kyiv",
  "Europe/Warsaw",
  "Europe/Chisinau",
  "Europe/Minsk",
  "Europe/Moscow",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/London",
  "Europe/Athens",
  "Europe/Istanbul",
  "Asia/Tbilisi",
  "Asia/Yerevan",
  "Asia/Baku",
  "Asia/Almaty",
  "Asia/Tashkent",
];

export function AppSettingsProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<UserSettings>(() => getEffectiveSettings());
  const timezoneOptions = COMMON_TIMEZONES;

  const value = useMemo<AppSettingsContextValue>(() => {
    const persist = (next: UserSettings) => {
      setSettings(next);
      writeStoredSettings(next);
      // Tasks embed a settings snapshot when they sync; re-sync so a changed
      // value (e.g. a new timezone) propagates to already-stored tasks now
      // rather than waiting for the next app open.
      void queryClient.invalidateQueries({ queryKey: TASKS_SYNC_QUERY_KEY });
    };

    return {
      settings,
      pending: false,
      t: (key: TranslationKey) => translations[settings.language]?.[key] ?? translations.en[key] ?? key,
      setLanguage: async (language: AppLanguage) => persist({ ...settings, language }),
      updateSettings: async (patch: Partial<UserSettings>) => persist({ ...settings, ...patch }),
      timezoneOptions,
    };
  }, [settings, timezoneOptions, queryClient]);

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings(): AppSettingsContextValue {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error("useAppSettings must be used within AppSettingsProvider");
  }
  return context;
}
