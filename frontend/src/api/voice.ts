import { apiUpload } from "./client";

interface TranscribeResponse {
  text: string;
}

export async function transcribeVoice(blob: Blob, language?: string): Promise<string> {
  const form = new FormData();
  form.append("file", blob, "voice.webm");
  const query = language ? `?language=${encodeURIComponent(language)}` : "";
  const response = await apiUpload<TranscribeResponse>(`/voice/transcribe${query}`, form);
  return response.text;
}
