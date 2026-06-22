import { useEffect, useMemo, useState } from "react";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { useToast } from "../contexts/ToastContext";
import { UserSettings } from "../types/settings";

const SNOOZE_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const QUICK_DELAY_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240];

function buildSettingsPatch(current: UserSettings, draft: UserSettings): Partial<UserSettings> {
  const patch: Partial<UserSettings> = {};
  if (current.timezone !== draft.timezone) patch.timezone = draft.timezone;
  if (current.default_snooze_minutes !== draft.default_snooze_minutes) {
    patch.default_snooze_minutes = draft.default_snooze_minutes;
  }
  if (current.default_quick_delay_minutes !== draft.default_quick_delay_minutes) {
    patch.default_quick_delay_minutes = draft.default_quick_delay_minutes;
  }
  return patch;
}

export function SettingsPage() {
  const { settings, t, updateSettings, timezoneOptions } = useAppSettings();
  const { showToast } = useToast();
  const [draft, setDraft] = useState<UserSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const timezoneSelectOptions = useMemo(
    () => (timezoneOptions.includes(draft.timezone) ? timezoneOptions : [draft.timezone, ...timezoneOptions]),
    [timezoneOptions, draft.timezone],
  );

  const handleSave = async () => {
    const patch = buildSettingsPatch(settings, draft);
    if (Object.keys(patch).length === 0) {
      showToast({ tone: "info", message: t("settingsSaved") });
      return;
    }

    setIsSaving(true);
    try {
      await updateSettings(patch);
      showToast({ tone: "success", message: t("settingsSaved") });
    } catch {
      setDraft(settings);
      showToast({ tone: "error", message: t("settingsSaveError") });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="grid-section">
      <div className="tasks-title-pill">{t("settings")}</div>
      <div className="task-form">
        <label>
          {t("defaultSnooze")}
          <select
            value={String(draft.default_snooze_minutes)}
            onChange={(event) => setDraft((prev) => ({ ...prev, default_snooze_minutes: Number(event.target.value) }))}
          >
            {SNOOZE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("defaultQuickDelay")}
          <select
            value={String(draft.default_quick_delay_minutes)}
            onChange={(event) => setDraft((prev) => ({ ...prev, default_quick_delay_minutes: Number(event.target.value) }))}
          >
            {QUICK_DELAY_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("timezone")}
          <select
            value={draft.timezone}
            onChange={(event) => setDraft((prev) => ({ ...prev, timezone: event.target.value }))}
          >
            {timezoneSelectOptions.map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezone}
              </option>
            ))}
          </select>
        </label>

        <button type="button" disabled={isSaving} onClick={handleSave}>
          {isSaving ? t("saving") : t("saveSettings")}
        </button>
      </div>
    </section>
  );
}
