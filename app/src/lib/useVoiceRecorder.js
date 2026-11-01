import { useCallback, useEffect, useRef, useState } from 'react';

const LIMIT = 30;

function bestMime() {
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return options.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || '';
}

// One tap to start, one tap to send. The microphone is opened only for as long
// as the recording lasts, and it never runs past the limit.
export default function useVoiceRecorder(onFinish, limit = LIMIT) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const lengthRef = useRef(0);
  const mountedRef = useRef(true);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  const release = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  // Leaving the page mid-recording drops it rather than sending half a thought.
  useEffect(
    () => () => {
      mountedRef.current = false;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      release();
    },
    [release]
  );

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }, []);

  const start = useCallback(async () => {
    if (recorderRef.current) return;
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('This browser cannot record audio.');
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError('Your microphone needs permission to record.');
      return;
    }

    const mime = bestMime();
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recorderRef.current = recorder;
    streamRef.current = stream;
    chunksRef.current = [];
    lengthRef.current = 0;

    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const type = recorder.mimeType || mime || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      recorderRef.current = null;
      release();
      setRecording(false);
      setSeconds(0);
      if (!mountedRef.current) return;
      if (blob.size > 800) finishRef.current?.(blob, lengthRef.current);
      else setError('Nothing was caught — try again a little closer.');
    };

    recorder.start();
    setRecording(true);
    setSeconds(0);
    const startedAt = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      lengthRef.current = elapsed;
      setSeconds(elapsed);
      if (elapsed >= limit) stop();
    }, 200);
  }, [limit, release, stop]);

  return { recording, seconds, error, start, stop, limit };
}