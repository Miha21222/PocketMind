import { useCallback, useRef, useState } from "react";
import { transcribeVoice } from "../api/voice";

export type VoiceStatus = "idle" | "recording" | "transcribing";

interface VoiceInput {
  status: VoiceStatus;
  error: boolean;
  toggle: () => void;
}

// Records mic audio via MediaRecorder, sends it to the backend Whisper endpoint,
// and hands the transcript back through `onText`. Captures audio natively, so it
// works in Telegram WebViews where the browser SpeechRecognition API does not.
export function useVoiceInput(onText: (text: string) => void, language?: string): VoiceInput {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    setError(false);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setStatus("transcribing");
        try {
          const text = await transcribeVoice(blob, language);
          if (text) onText(text);
        } catch {
          setError(true);
        } finally {
          setStatus("idle");
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setStatus("recording");
    } catch {
      setError(true);
      setStatus("idle");
    }
  }, [language, onText]);

  const toggle = useCallback(() => {
    if (status === "recording") {
      recorderRef.current?.stop();
    } else if (status === "idle") {
      void start();
    }
  }, [status, start]);

  return { status, error, toggle };
}
