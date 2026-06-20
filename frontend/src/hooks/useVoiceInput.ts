import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeVoice } from "../api/voice";

export type VoiceStatus = "idle" | "recording" | "transcribing";

export interface VoiceInput {
  status: VoiceStatus;
  activeField: string | null;
  error: boolean;
  toggle: (field: string, onResult: (text: string) => void) => void;
}

// Records mic audio via MediaRecorder, sends it to the backend Whisper endpoint,
// and routes the transcript to whichever field requested it. Captures audio
// natively, so it works in Telegram WebViews where browser SpeechRecognition is
// unavailable.
//
// A single shared stream is used for every field (title, description, ...) and
// acquired once, so Telegram only prompts for mic access once per form session;
// it is released when the form unmounts.
export function useVoiceInput(language?: string): VoiceInput {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [activeField, setActiveField] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onResultRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const acquireStream = useCallback(async (): Promise<MediaStream> => {
    if (streamRef.current && streamRef.current.active) {
      return streamRef.current;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    return stream;
  }, []);

  const start = useCallback(
    async (field: string, onResult: (text: string) => void) => {
      setError(false);
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        setError(true);
        return;
      }
      try {
        const stream = await acquireStream();
        const recorder = new MediaRecorder(stream);
        chunksRef.current = [];
        onResultRef.current = onResult;
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.onstop = async () => {
          // Keep the stream alive for the next recording — do not stop its tracks here.
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          setStatus("transcribing");
          try {
            const text = await transcribeVoice(blob, language);
            if (text) onResultRef.current?.(text);
          } catch {
            setError(true);
          } finally {
            setStatus("idle");
            setActiveField(null);
          }
        };
        recorderRef.current = recorder;
        recorder.start();
        setStatus("recording");
        setActiveField(field);
      } catch {
        setError(true);
        setStatus("idle");
        setActiveField(null);
        streamRef.current = null;
      }
    },
    [acquireStream, language],
  );

  const toggle = useCallback(
    (field: string, onResult: (text: string) => void) => {
      if (status === "recording") {
        if (activeField === field) {
          recorderRef.current?.stop();
        }
        return;
      }
      if (status === "idle") {
        void start(field, onResult);
      }
    },
    [status, activeField, start],
  );

  return { status, activeField, error, toggle };
}
