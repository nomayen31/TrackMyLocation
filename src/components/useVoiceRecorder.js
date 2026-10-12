import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useVoiceRecorder — records a voice note with MediaRecorder and resolves it as
 * a data URL, ready to send as an `audio` attachment.
 *
 * Returns `{ recording, seconds, error, start, stop, cancel }`.
 * `stop()` resolves to `{ data, mime, duration }` or `null`.
 */
export default function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');

  const session = useRef(null); // { recorder, stream }
  const chunks = useRef([]);
  const timer = useRef(null);
  const startedAt = useRef(0);

  const cleanup = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    const current = session.current;
    if (current) {
      try {
        current.stream.getTracks().forEach((track) => track.stop());
      } catch {
        // already stopped
      }
    }
    session.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async () => {
    setError('');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Voice recording is not supported in this browser.');
      return false;
    }
    if (typeof MediaRecorder === 'undefined') {
      setError('Voice recording is not supported in this browser.');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunks.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunks.current.push(event.data);
      };
      recorder.start();

      startedAt.current = Date.now();
      session.current = { recorder, stream };
      setRecording(true);
      setSeconds(0);
      timer.current = setInterval(
        () => setSeconds(Math.round((Date.now() - startedAt.current) / 1000)),
        200
      );
      return true;
    } catch {
      setError('Microphone permission denied.');
      return false;
    }
  }, []);

  const stop = useCallback(
    () =>
      new Promise((resolve) => {
        const current = session.current;
        if (!current) {
          resolve(null);
          return;
        }
        const { recorder, stream } = current;

        recorder.onstop = () => {
          const blob = new Blob(chunks.current, { type: recorder.mimeType || 'audio/webm' });
          const duration = (Date.now() - startedAt.current) / 1000;
          chunks.current = [];
          try {
            stream.getTracks().forEach((track) => track.stop());
          } catch {
            // already stopped
          }

          if (blob.size === 0) {
            resolve(null);
            return;
          }

          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              data: String(reader.result),
              mime: blob.type,
              duration: Math.round(duration * 10) / 10,
            });
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        };

        try {
          recorder.stop();
        } catch {
          resolve(null);
        }
        cleanup();
        setRecording(false);
        setSeconds(0);
      }),
    [cleanup]
  );

  const cancel = useCallback(() => {
    const current = session.current;
    if (current) {
      try {
        current.recorder.onstop = null;
        current.recorder.stop();
      } catch {
        // already stopped
      }
    }
    cleanup();
    setRecording(false);
    setSeconds(0);
  }, [cleanup]);

  return { recording, seconds, error, start, stop, cancel };
}
