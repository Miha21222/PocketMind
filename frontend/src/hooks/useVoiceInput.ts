import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeVoice } from "../api/voice";

export type VoiceStatus = "idle" | "recording" | "transcribing";

export interface VoiceInput {
  status: VoiceStatus;
  error: boolean;
  timedOut: boolean;
  start: (onResult: (text: string) => void) => void;
  stop: () => void;
  cancel: () => void;
}

// Normalized RMS level (0..1) above which incoming audio counts as speech.
const VOICE_THRESHOLD = 0.02;
// If no speech is detected within this long after starting, auto-cancel.
const LEADING_SILENCE_MS = 5000;
// Once speech has been heard, auto-stop after this long of renewed silence.
const TRAILING_SILENCE_MS = 1600;

const AudioContextCtor: typeof AudioContext | undefined =
  typeof window !== "undefined" ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext : undefined;

// Records mic audio via MediaRecorder and sends it to the backend Whisper
// endpoint. Captures audio natively, so it works in Telegram WebViews where
// browser SpeechRecognition is unavailable.
//
// The mic stream is acquired once and reused, so Telegram only prompts for
// access once per form session; it is released when the form unmounts.
export function useVoiceInput(language?: string): VoiceInput {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const onResultRef = useRef<((text: string) => void) | null>(null);
  const cancelledRef = useRef(false);

  // Voice-activity detection: lets recording start/stop without extra taps.
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const leadingTimerRef = useRef<number | null>(null);
  const trailingTimerRef = useRef<number | null>(null);
  const vadActiveRef = useRef(false);
  const voiceDetectedRef = useRef(false);

  const teardownVad = useCallback(() => {
    vadActiveRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (leadingTimerRef.current !== null) {
      window.clearTimeout(leadingTimerRef.current);
      leadingTimerRef.current = null;
    }
    if (trailingTimerRef.current !== null) {
      window.clearTimeout(trailingTimerRef.current);
      trailingTimerRef.current = null;
    }
    sourceRef.current?.disconnect();
    sourceRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      teardownVad();
      void audioContextRef.current?.close();
      audioContextRef.current = null;
    };
  }, [teardownVad]);

  const acquireStream = useCallback(async (): Promise<MediaStream> => {
    if (streamRef.current && streamRef.current.active) {
      return streamRef.current;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    return stream;
  }, []);

  const stopRecorder = useCallback(() => {
    teardownVad();
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, [teardownVad]);

  const handleTrailingSilence = useCallback(() => {
    stopRecorder();
  }, [stopRecorder]);

  const handleLeadingSilence = useCallback(() => {
    cancelledRef.current = true;
    stopRecorder();
    setTimedOut(true);
  }, [stopRecorder]);

  const startVad = useCallback(
    (stream: MediaStream) => {
      if (!AudioContextCtor) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextCtor();
      }
      const audioContext = audioContextRef.current;
      if (audioContext.state === "suspended") {
        void audioContext.resume();
      }
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;
      voiceDetectedRef.current = false;
      vadActiveRef.current = true;

      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        if (!vadActiveRef.current) return;
        analyser.getByteTimeDomainData(data);
        let sumSquares = 0;
        for (let i = 0; i < data.length; i += 1) {
          const normalized = (data[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / data.length);
        if (rms > VOICE_THRESHOLD) {
          if (!voiceDetectedRef.current) {
            voiceDetectedRef.current = true;
            if (leadingTimerRef.current !== null) {
              window.clearTimeout(leadingTimerRef.current);
              leadingTimerRef.current = null;
            }
          }
          if (trailingTimerRef.current !== null) {
            window.clearTimeout(trailingTimerRef.current);
          }
          trailingTimerRef.current = window.setTimeout(handleTrailingSilence, TRAILING_SILENCE_MS);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      leadingTimerRef.current = window.setTimeout(handleLeadingSilence, LEADING_SILENCE_MS);
    },
    [handleLeadingSilence, handleTrailingSilence],
  );

  const start = useCallback(
    (onResult: (text: string) => void) => {
      void (async () => {
        setError(false);
        setTimedOut(false);
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
            teardownVad();
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
          startVad(stream);
        } catch {
          setError(true);
          setStatus("idle");
          streamRef.current = null;
        }
      })();
    },
    [acquireStream, language, startVad, teardownVad],
  );

  const stop = useCallback(() => {
    if (status === "recording") {
      stopRecorder();
    }
  }, [status, stopRecorder]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    if (status === "recording") {
      stopRecorder();
    }
    setStatus("idle");
  }, [status, stopRecorder]);

  return { status, error, timedOut, start, stop, cancel };
}
