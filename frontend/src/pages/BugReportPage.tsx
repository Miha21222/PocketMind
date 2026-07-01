import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Paperclip, X } from "lucide-react";
import { submitFeedback, uploadFeedbackScreenshot } from "../api/feedback";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { useToast } from "../contexts/ToastContext";
import { hapticNotification } from "../utils/haptics";

const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024; // 8 MB, mirrors the backend limit

export function BugReportPage() {
  const { t } = useAppSettings();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [description, setDescription] = useState("");
  const [descriptionError, setDescriptionError] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState<string | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => submitFeedback({ kind: "bug", message: description.trim() }),
  });

  const clearScreenshot = () => {
    if (screenshotPreviewUrl) URL.revokeObjectURL(screenshotPreviewUrl);
    setScreenshot(null);
    setScreenshotPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setScreenshotError(t("errorScreenshotType"));
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      setScreenshotError(t("errorScreenshotTooLarge"));
      return;
    }

    setScreenshotError(null);
    if (screenshotPreviewUrl) URL.revokeObjectURL(screenshotPreviewUrl);
    setScreenshot(file);
    setScreenshotPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!description.trim()) {
      setDescriptionError(true);
      return;
    }
    setDescriptionError(false);
    try {
      const { id } = await mutation.mutateAsync();
      hapticNotification("success");
      if (screenshot) {
        try {
          await uploadFeedbackScreenshot(id, screenshot);
        } catch {
          showToast({ tone: "error", message: t("feedbackScreenshotUploadFailed") });
          navigate("/settings", { replace: true });
          return;
        }
      }
      showToast({ tone: "success", message: t("feedbackSent") });
      navigate("/settings", { replace: true });
    } catch {
      hapticNotification("error");
      showToast({ tone: "error", message: t("feedbackSendError") });
    }
  };

  return (
    <section className="grid-section">
      <form className="task-form" onSubmit={handleSubmit}>
        <label>
          {t("bugDescriptionLabel")}
          <textarea
            rows={6}
            className="description-textarea"
            placeholder={t("bugDescriptionPlaceholder")}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          {descriptionError ? <span className="text-sm text-red-600">{t("errorBugDescriptionRequired")}</span> : null}
        </label>

        <div className="feedback-screenshot-field">
          <span className="field-label">{t("screenshotFieldLabel")}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="feedback-screenshot-input"
            onChange={handleFileChange}
          />
          {screenshotPreviewUrl ? (
            <div className="feedback-screenshot-preview">
              <img src={screenshotPreviewUrl} alt="" />
              <button
                type="button"
                className="icon-btn ghost-danger"
                aria-label={t("removeScreenshot")}
                title={t("removeScreenshot")}
                onClick={clearScreenshot}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button type="button" className="link-btn ghost" onClick={() => fileInputRef.current?.click()}>
              <Paperclip size={18} aria-hidden="true" />
              {t("attachScreenshot")}
            </button>
          )}
          {screenshotError ? <span className="text-sm text-red-600">{screenshotError}</span> : null}
        </div>

        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? t("saving") : t("send")}
        </button>
      </form>
    </section>
  );
}
