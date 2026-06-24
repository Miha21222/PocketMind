import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Mic, Square } from "lucide-react";
import { z } from "zod";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { useVoiceInput, type VoiceInput } from "../hooks/useVoiceInput";
import { TranslationKey } from "../i18n/translations";
import { TaskReminderMode, TaskType } from "../types/task";
import { estimateTextareaRows } from "./textareaAutosize";

function VoiceRecorderModal({
  voice,
  t,
  onInsert,
  onClose,
}: {
  voice: VoiceInput;
  t: (key: TranslationKey) => string;
  onInsert: (text: string) => void;
  onClose: () => void;
}) {
  const recording = voice.status === "recording";
  const transcribing = voice.status === "transcribing";

  const handleClose = () => {
    voice.cancel();
    onClose();
  };

  const handleToggle = () => {
    if (recording) {
      voice.stop();
    } else if (voice.status === "idle") {
      voice.start((text) => {
        const trimmed = text.trim();
        if (trimmed) onInsert(trimmed);
        onClose();
      });
    }
  };

  const statusText = voice.error
    ? t("voiceUnavailable")
    : recording
      ? t("voiceRecording")
      : transcribing
        ? t("voiceTranscribing")
        : t("voiceTapToRecord");

  return (
    <div className="voice-modal-overlay" onClick={handleClose} role="presentation">
      <div className="voice-modal" onClick={(event) => event.stopPropagation()}>
        <div className="voice-modal-title">{t("voiceInput")}</div>
        <button
          type="button"
          className={`voice-record-btn${recording ? " is-recording" : ""}`}
          onClick={handleToggle}
          disabled={transcribing}
          aria-label={recording ? t("voiceRecording") : t("voiceTapToRecord")}
        >
          {transcribing ? <Loader2 size={40} className="animate-spin" /> : recording ? <Square size={40} /> : <Mic size={40} />}
        </button>
        <div className="voice-modal-status">{statusText}</div>
        <button type="button" className="ghost voice-modal-close" onClick={handleClose}>
          {t("voiceCancel")}
        </button>
      </div>
    </div>
  );
}

export interface TaskFormValues {
  title: string;
  description: string;
  type: TaskType;
  deadline_at: string;
  recurrence_rule: string;
  reminder_mode: TaskReminderMode;
  reminder_time_local: string;
  reminder_interval_hours: number;
}

interface TaskFormProps {
  initial?: Partial<TaskFormValues>;
  onSubmit: (values: TaskFormValues) => Promise<void>;
}

const taskFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(255, "Title is too long"),
    description: z.string().max(5000, "Description is too long"),
    type: z.enum(["quick", "deadline", "no_deadline", "recurring", "waiting"]),
    deadline_at: z.string(),
    recurrence_rule: z.string(),
    reminder_mode: z.enum(["none", "daily_at_time", "every_n_hours"]),
    reminder_time_local: z.string(),
    reminder_interval_hours: z.number().int().min(1).max(24),
  })
  .superRefine((values, ctx) => {
    if (values.type === "recurring" && !values.recurrence_rule) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Recurrence is required for recurring task",
        path: ["recurrence_rule"],
      });
    }
    if (values.type === "deadline" && !values.deadline_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Deadline is required for deadline tasks",
        path: ["deadline_at"],
      });
    }
    if ((values.type === "deadline" || values.type === "waiting") && values.reminder_mode === "daily_at_time" && !values.reminder_time_local) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Time is required",
        path: ["reminder_time_local"],
      });
    }
    if (values.type === "recurring" && !values.reminder_time_local) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reminder time is required",
        path: ["reminder_time_local"],
      });
    }
  });

export function TaskForm({ initial, onSubmit }: TaskFormProps) {
  const { t, settings } = useAppSettings();
  const formDefaults = useMemo<TaskFormValues>(
    () => ({
      title: "",
      description: "",
      type: "quick",
      deadline_at: "",
      recurrence_rule: "",
      reminder_mode: settings.default_deadline_reminder_mode,
      reminder_time_local: settings.default_deadline_reminder_time_local,
      reminder_interval_hours: settings.default_deadline_reminder_interval_hours,
    }),
    [settings.default_deadline_reminder_interval_hours, settings.default_deadline_reminder_mode, settings.default_deadline_reminder_time_local],
  );
  const { register, handleSubmit, watch, formState, setValue, getValues } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: { ...formDefaults, ...initial },
  });
  const selectedType = watch("type");
  const selectedReminderMode = watch("reminder_mode");
  const descriptionField = register("description");
  const {
    ref: descriptionRegisterRef,
    onBlur: handleDescriptionBlur,
    onChange: handleDescriptionChange,
    ...descriptionInputProps
  } = descriptionField;
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const [descriptionRows, setDescriptionRows] = useState(4);
  const descriptionValue = watch("description");

  const updateDescriptionRows = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    setDescriptionRows(estimateTextareaRows(textarea.value, textarea.clientWidth));
  };

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => updateDescriptionRows(descriptionRef.current));
    return () => window.cancelAnimationFrame(frameId);
  }, [descriptionValue]);

  const voice = useVoiceInput(settings.language);
  const [voiceTarget, setVoiceTarget] = useState<"title" | "description" | null>(null);
  const appendToField = (field: "title" | "description") => (text: string) => {
    const current = getValues(field).trim();
    setValue(field, current ? `${current} ${text}` : text, { shouldValidate: true });
  };
  const prevTypeRef = useRef<TaskType | null>(null);

  useEffect(() => {
    if (prevTypeRef.current === null) {
      prevTypeRef.current = selectedType;
      return;
    }
    if (prevTypeRef.current === selectedType) return;
    prevTypeRef.current = selectedType;

    if (selectedType === "deadline") {
      setValue("reminder_mode", settings.default_deadline_reminder_mode);
      setValue("reminder_time_local", settings.default_deadline_reminder_time_local);
      setValue("reminder_interval_hours", settings.default_deadline_reminder_interval_hours);
    } else if (selectedType === "waiting") {
      setValue("reminder_mode", settings.default_waiting_reminder_mode);
      setValue("reminder_time_local", settings.default_waiting_reminder_time_local);
      setValue("reminder_interval_hours", settings.default_waiting_reminder_interval_hours);
    } else if (selectedType === "recurring") {
      setValue("reminder_time_local", settings.default_recurring_reminder_time_local);
    } else if (selectedType === "quick") {
      setValue("reminder_mode", "none");
    }
  }, [
    selectedType,
    setValue,
    settings.default_deadline_reminder_interval_hours,
    settings.default_deadline_reminder_mode,
    settings.default_deadline_reminder_time_local,
    settings.default_recurring_reminder_time_local,
    settings.default_waiting_reminder_interval_hours,
    settings.default_waiting_reminder_mode,
    settings.default_waiting_reminder_time_local,
  ]);

  return (
    <form
      className="task-form rounded-soft bg-white p-4 shadow-card"
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values);
      })}
    >
      <label>
        {t("title")}
        <div className="voice-field is-input">
          <input {...register("title")} />
          <button
            type="button"
            className="voice-mic"
            onClick={() => setVoiceTarget("title")}
            aria-label={t("voiceInput")}
            title={t("voiceInput")}
          >
            <Mic size={18} />
          </button>
        </div>
        {formState.errors.title ? <span className="text-sm text-red-600">{formState.errors.title.message}</span> : null}
      </label>
      <label>
        {t("description")}
        <div className="voice-field">
          <textarea
            rows={descriptionRows}
            className="description-textarea"
            {...descriptionInputProps}
            onChange={(event) => {
              void handleDescriptionChange(event);
              updateDescriptionRows(event.currentTarget);
            }}
            onBlur={(event) => {
              void handleDescriptionBlur(event);
              updateDescriptionRows(event.currentTarget);
            }}
            onFocus={(event) => updateDescriptionRows(event.currentTarget)}
            onInput={(event) => updateDescriptionRows(event.currentTarget)}
            ref={(element) => {
              descriptionRegisterRef(element);
              descriptionRef.current = element;
              updateDescriptionRows(element);
            }}
          />
          <button
            type="button"
            className="voice-mic"
            onClick={() => setVoiceTarget("description")}
            aria-label={t("voiceInput")}
            title={t("voiceInput")}
          >
            <Mic size={18} />
          </button>
        </div>
        {formState.errors.description ? <span className="text-sm text-red-600">{formState.errors.description.message}</span> : null}
      </label>
      <label>
        {t("type")}
        <select {...register("type")}>
          <option value="quick">{t("quick")}</option>
          <option value="deadline">{t("deadline")}</option>
          <option value="no_deadline">{t("noDeadline")}</option>
          <option value="recurring">{t("recurring")}</option>
          <option value="waiting">{t("waiting")}</option>
        </select>
      </label>

      {selectedType === "quick" && (
        <p className="field-hint">
          {t("quickAutoReminderHint")} {settings.default_quick_delay_minutes} {t("minutes")}
        </p>
      )}

      {selectedType === "deadline" && (
        <label>
          {t("deadlineLabel")}
          <input type="datetime-local" {...register("deadline_at")} />
          <span className="field-hint">{t("timezone")}: {settings.timezone}</span>
        </label>
      )}

      {selectedType === "waiting" && (
        <label>
          {t("deadlineOptional")}
          <input type="datetime-local" {...register("deadline_at")} />
          <span className="field-hint">{t("timezone")}: {settings.timezone}</span>
        </label>
      )}

      {(selectedType === "deadline" || selectedType === "waiting") && (
        <>
          <label>
            {t("reminderMode")}
            <select {...register("reminder_mode")}>
              <option value="none">{t("reminderModeNone")}</option>
              <option value="daily_at_time">{t("reminderModeDaily")}</option>
              <option value="every_n_hours">{t("reminderModeInterval")}</option>
            </select>
          </label>

          {selectedReminderMode === "daily_at_time" && (
            <label>
              {t("reminderAtTime")}
              <input type="time" {...register("reminder_time_local")} />
            </label>
          )}

          {selectedReminderMode === "every_n_hours" && (
            <label>
              {t("remindEveryHours")}
              <input type="number" min={1} max={24} {...register("reminder_interval_hours", { valueAsNumber: true })} />
            </label>
          )}
        </>
      )}

      {selectedType === "recurring" && (
        <>
          <label>
            {t("recurrence")}
            <select {...register("recurrence_rule")}>
              <option value="">{t("selectRecurrence")}</option>
              <option value="RRULE:FREQ=DAILY">{t("daily")}</option>
              <option value="RRULE:FREQ=WEEKLY;BYDAY=MO">{t("weeklyMon")}</option>
              <option value="RRULE:FREQ=MONTHLY">{t("monthly")}</option>
            </select>
            {formState.errors.recurrence_rule ? (
              <span className="text-sm text-red-600">{formState.errors.recurrence_rule.message}</span>
            ) : null}
          </label>

          <label>
            {t("reminderAtTime")}
            <input type="time" {...register("reminder_time_local")} />
          </label>
        </>
      )}

      <button type="submit" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? t("saving") : t("saveTask")}
      </button>

      {voiceTarget ? (
        <VoiceRecorderModal
          voice={voice}
          t={t}
          onInsert={appendToField(voiceTarget)}
          onClose={() => setVoiceTarget(null)}
        />
      ) : null}
    </form>
  );
}
