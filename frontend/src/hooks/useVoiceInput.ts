import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeVoice } from "../api/voice";

export type VoiceStatus = "idle" | "recording" | "transcribing";

export interface VoiceInput {
  status: VoiceStatus;
  error: boolean;
  start: (onResult: (text: string) => void) => void;
  stop: () => void;
  cancel: () => void;
}

// Records mic audio via MediaRecorder and sends it to the backend Whisper
// endpoint. Captures audio natively, so it works in Telegram WebViews where
// browser SpeechRecognition is unavailable.
//
// The mic stream is acquired once and reused, so Telegram only prompts for
// access once per form session; it is released when the form unmounts.
export function useVoiceInput(language?: string): VoiceInput {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onResultRef = useRef<((text: string) => void) | null>(null);
  const cancelledRef = useRef(false);

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
    (onResult: (text: string) => void) => {
      void (async () => {
        setError(false);
        cancelledRef.current = false;
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
            if (cancelledRef.current) {
              setStatus("idle");
              return;
            }
            const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
            setStatus("transcribing");
            try {
              const text = await transcribeVoice(blob, language);
              if (!cancelledRef.current) onResultRef.current?.(text);
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
          streamRef.current = null;
        }
      })();
    },
    [acquireStream, language],
  );

  const stop = useCallback(() => {
    if (status === "recording") {
      recorderRef.current?.stop();
    }
  }, [status]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    if (status === "recording") {
      recorderRef.current?.stop();
    }
    setStatus("idle");
  }, [status]);

  return { status, error, start, stop, cancel };
}
