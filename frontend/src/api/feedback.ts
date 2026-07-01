import { apiRequest, apiUpload } from "./client";

export type FeedbackKind = "rating" | "bug";

export interface FeedbackPayload {
  kind: FeedbackKind;
  rating?: number | null;
  message?: string | null;
}

export function submitFeedback(payload: FeedbackPayload): Promise<{ id: number }> {
  return apiRequest<{ id: number }>("/feedback", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function uploadFeedbackScreenshot(feedbackId: number, file: File): Promise<{ ok: boolean }> {
  const form = new FormData();
  form.append("file", file, file.name);
  return apiUpload<{ ok: boolean }>(`/feedback/${feedbackId}/screenshot`, form);
}
