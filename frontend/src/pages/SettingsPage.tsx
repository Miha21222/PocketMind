import { useEffect, useMemo, useState } from "react";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { useToast } from "../contexts/ToastContext";
import { UserSettings } from "../types/settings";

const SNOOZE_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const QUICK_DELAY_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240];
const INTERVAL_OPTIONS = [1, 2, 3, 4, 6, 8, 12, 24];

function buildSettingsPatch(current: UserSettings, draft: UserSettings): Partial<UserSettings> {
  const patch: Partial<UserSettings> = {};
  if (current.language !== draft.language) patch.language = draft.language;
  if (current.timezone !== draft.timezone) patch.timezone = draft.timezone;
  if (current.default_snooze_minutes !== draft.default_snooze_minutes) {
    patch.default_snooze_minutes = draft.default_snooze_minutes;
  }
  if (current.default_quick_delay_minutes !== draft.default_quick_delay_minutes) {
    patch.default_quick_delay_minutes = draft.default_quick_delay_minutes;
  }
  if (current.default_deadline_reminder_mode !== draft.default_deadline_reminder_mode) {
    patch.default_deadline_reminder_mode = draft.default_deadline_reminder_mode;
  }
  if (current.default_deadline_reminder_time_local !== draft.default_deadline_reminder_time_local) {
    patch.default_deadline_reminder_time_local = draft.default_deadline_reminder_time_local;
  }
  if (current.default_deadline_reminder_interval_hours !== draft.default_deadline_reminder_interval_hours) {
    patch.default_deadline_reminder_interval_hours = draft.default_deadline_reminder_interval_hours;
  }
  if (current.default_waiting_reminder_mode !== draft.default_waiting_reminder_mode) {
    patch.default_waiting_reminder_mode = draft.default_waiting_reminder_mode;
  }
  if (current.default_waiting_reminder_time_local !== draft.default_waiting_reminder_time_local) {
    patch.default_waiting_reminder_time_local = draft.default_waiting_reminder_time_local;
  }
  if (current.default_waiting_reminder_interval_hours !== draft.default_waiting_reminder_interval_hours) {
    patch.default_waiting_reminder_interval_hours = draft.default_waiting_reminder_interval_hours;
  }
  if (current.default_recurring_reminder_time_local !== draft.default_recurring_reminder_time_local) {
    patch.default_recurring_reminder_time_local = draft.default_recurring_reminder_time_local;
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

  const visibleTimezones = useMemo(() => {
    const query = draft.timezone.trim().toLowerCase();
    if (!query) return timezoneOptions.slice(0, 80);
    return timezoneOptions.filter((item) => item.toLowerCase().includes(query)).slice(0, 80);
  }, [timezoneOptions, draft.timezone]);

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
          {t("language")}
          <select value={draft.language} onChange={(event) => setDraft((prev) => ({ ...prev, language: event.target.value as "en" | "ru" }))}>
            <option value="en">English</option>
            <option value="ru">Русский</option>
          </select>
        </label>

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
          {t("defaultDeadlineReminderMode")}
          <select
            value={draft.default_deadline_reminder_mode}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                default_deadline_reminder_mode: event.target.value as "none" | "daily_at_time" | "every_n_hours",
              }))
            }
          >
            <option value="none">{t("reminderModeNone")}</option>
            <option value="daily_at_time">{t("reminderModeDaily")}</option>
            <option value="every_n_hours">{t("reminderModeInterval")}</option>
          </select>
        </label>

        <label>
          {t("defaultDeadlineReminderTime")}
          <input
            type="time"
            value={draft.default_deadline_reminder_time_local}
            onChange={(event) => setDraft((prev) => ({ ...prev, default_deadline_reminder_time_local: event.target.value }))}
          />
        </label>

        <label>
          {t("defaultDeadlineReminderInterval")}
          <select
            value={String(draft.default_deadline_reminder_interval_hours)}
            onChange={(event) => setDraft((prev) => ({ ...prev, default_deadline_reminder_interval_hours: Number(event.target.value) }))}
          >
            {INTERVAL_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("defaultWaitingReminderMode")}
          <select
            value={draft.default_waiting_reminder_mode}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                default_waiting_reminder_mode: event.target.value as "none" | "daily_at_time" | "every_n_hours",
              }))
            }
          >
            <option value="none">{t("reminderModeNone")}</option>
            <option value="daily_at_time">{t("reminderModeDaily")}</option>
            <option value="every_n_hours">{t("reminderModeInterval")}</option>
          </select>
        </label>

        <label>
          {t("defaultWaitingReminderTime")}
          <input
            type="time"
            value={draft.default_waiting_reminder_time_local}
            onChange={(event) => setDraft((prev) => ({ ...prev, default_waiting_reminder_time_local: event.target.value }))}
          />
        </label>

        <label>
          {t("defaultWaitingReminderInterval")}
          <select
            value={String(draft.default_waiting_reminder_interval_hours)}
            onChange={(event) => setDraft((prev) => ({ ...prev, default_waiting_reminder_interval_hours: Number(event.target.value) }))}
          >
            {INTERVAL_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("defaultRecurringReminderTime")}
          <input
            type="time"
            value={draft.default_recurring_reminder_time_local}
            onChange={(event) => setDraft((prev) => ({ ...prev, default_recurring_reminder_time_local: event.target.value }))}
          />
        </label>

        <label>
          {t("timezone")}
          <input
            value={draft.timezone}
            onChange={(event) => setDraft((prev) => ({ ...prev, timezone: event.target.value }))}
            list="timezone-options"
          />
          <datalist id="timezone-options">
            {visibleTimezones.map((timezone) => (
              <option key={timezone} value={timezone} />
            ))}
          </datalist>
        </label>

        <button type="button" disabled={isSaving} onClick={handleSave}>
          {isSaving ? t("saving") : t("saveSettings")}
        </button>
      </div>
    </section>
  );
}
