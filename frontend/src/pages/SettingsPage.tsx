import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bug, Star } from "lucide-react";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { useToast } from "../contexts/ToastContext";
import { hapticImpact, hapticNotification, useHapticsEnabled } from "../utils/haptics";
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
  const [hapticsEnabled, setHapticsEnabled] = useHapticsEnabled();
  const [draftHapticsEnabled, setDraftHapticsEnabled] = useState(hapticsEnabled);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    setDraftHapticsEnabled(hapticsEnabled);
  }, [hapticsEnabled]);

  const settingsPatch = useMemo(() => buildSettingsPatch(settings, draft), [settings, draft]);
  const hasSettingsChanges = Object.keys(settingsPatch).length > 0;
  const hasHapticsChanges = draftHapticsEnabled !== hapticsEnabled;
  const hasUnsavedChanges = hasSettingsChanges || hasHapticsChanges;

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const timezoneSelectOptions = useMemo(
    () => (timezoneOptions.includes(draft.timezone) ? timezoneOptions : [draft.timezone, ...timezoneOptions]),
    [timezoneOptions, draft.timezone],
  );

  const handleSave = async () => {
    if (!hasUnsavedChanges) {
      showToast({ tone: "info", message: t("settingsSaved") });
      return;
    }

    setIsSaving(true);
    try {
      if (hasSettingsChanges) {
        await updateSettings(settingsPatch);
      }
      if (hasHapticsChanges) {
        setHapticsEnabled(draftHapticsEnabled);
      }
      hapticNotification("success");
      showToast({ tone: "success", message: t("settingsSaved") });
    } catch {
      setDraft(settings);
      setDraftHapticsEnabled(hapticsEnabled);
      hapticNotification("error");
      showToast({ tone: "error", message: t("settingsSaveError") });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setDraft(settings);
    setDraftHapticsEnabled(hapticsEnabled);
    hapticImpact("light");
  };

  const toggleHaptics = () => {
    setDraftHapticsEnabled((current) => !current);
  };

  return (
    <section className="grid-section">
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

        <div className="settings-toggle-row">
          <span>{t("haptics")}</span>
          <button
            type="button"
            role="switch"
            aria-checked={draftHapticsEnabled}
            aria-label={t("haptics")}
            className={`toggle-switch${draftHapticsEnabled ? " on" : ""}`}
            onClick={toggleHaptics}
          >
            <span className="toggle-knob" aria-hidden="true" />
          </button>
        </div>

        <div className="section-card-divider" />

        <div className="settings-support-links">
          <span className="filter-subgroup-title">{t("feedbackSupport")}</span>
          <Link to="/settings/feedback" className="link-btn ghost">
            <Star size={20} aria-hidden="true" />
            {t("rateExperience")}
          </Link>
          <Link to="/settings/bug-report" className="link-btn ghost">
            <Bug size={20} aria-hidden="true" />
            {t("reportBug")}
          </Link>
        </div>

        {hasUnsavedChanges ? (
          <div className="settings-unsaved-alert" role="status">
            <div>
              <strong>{t("unsavedSettingsTitle")}</strong>
              <p>{t("unsavedSettingsBody")}</p>
            </div>
            <div className="settings-unsaved-actions">
              <button type="button" disabled={isSaving} onClick={handleSave}>
                {isSaving ? t("saving") : t("save")}
              </button>
              <button type="button" className="ghost" disabled={isSaving} onClick={handleDiscard}>
                {t("discard")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
