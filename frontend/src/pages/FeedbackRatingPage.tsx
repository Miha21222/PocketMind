import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { submitFeedback } from "../api/feedback";
import { useAppSettings } from "../contexts/AppSettingsContext";
import { useToast } from "../contexts/ToastContext";
import { hapticNotification, hapticSelection } from "../utils/haptics";

const RATING_VALUES = [1, 2, 3, 4, 5];

export function FeedbackRatingPage() {
  const { t } = useAppSettings();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [ratingError, setRatingError] = useState(false);

  const mutation = useMutation({
    mutationFn: () => submitFeedback({ kind: "rating", rating, message: comment.trim() || null }),
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (rating === null) {
      setRatingError(true);
      return;
    }
    setRatingError(false);
    try {
      await mutation.mutateAsync();
      hapticNotification("success");
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
        <div className="feedback-rating-field">
          <span className="field-label">{t("feedbackRatingLabel")}</span>
          <div className="feedback-star-row" role="radiogroup" aria-label={t("feedbackRatingLabel")}>
            {RATING_VALUES.map((value) => (
              <button
                key={value}
                type="button"
                className="icon-btn ghost"
                role="radio"
                aria-checked={rating === value}
                aria-label={String(value)}
                onClick={() => {
                  hapticSelection();
                  setRating(value);
                  setRatingError(false);
                }}
              >
                <Star size={22} aria-hidden="true" fill={rating !== null && value <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          {ratingError ? <span className="text-sm text-red-600">{t("errorRatingRequired")}</span> : null}
        </div>

        <label>
          {t("feedbackCommentLabel")}
          <textarea
            rows={4}
            className="description-textarea"
            placeholder={t("feedbackCommentPlaceholder")}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </label>

        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? t("saving") : t("send")}
        </button>
      </form>
    </section>
  );
}
