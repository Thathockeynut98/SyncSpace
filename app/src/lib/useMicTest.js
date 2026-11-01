import { useCallback, useEffect, useRef, useState } from 'react';
import { applyMicSettings, buildVoiceChain, driveMic } from './voiceChain';

// Hearing yourself: the mic is run through the very same chain the call uses —
// sensitivity, shape, suppression, gate and loudness — and played back on this
// device only. Nothing is sent to the other person and nothing is stored.
export function useMicTest(voice) {
  const [testing, setTesting] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState('');
  const testRef = useRef(null);
  const lastVoiceRef = useRef(0);
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  const stop = useCallback(() => {
    const test = testRef.current;
    testRef.current = null;
    setTesting(false);
    setLevel(0);
    if (!test) return;
    try {
      test.mic.gain.disconnect();
      test.mic.gate.disconnect();
      test.mic.source.disconnect();
      test.mic.ctx.close();
    } catch (err) {
      // the graph is going away anyway
    }
    test.stream.getTracks().forEach((track) => track.stop());
  }, []);

  const start = useCallback(async () => {
    if (testRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser will not let the test use a microphone. Try Chrome or Safari.');
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      setError('This browser cannot play the test back. Try Chrome or Safari.');
      return;
    }
    setError('');

    // The audio context is opened right on the click. Asking the browser for the
    // microphone can take a while, and a context created after that wait is not
    // allowed to start, which would leave the playback silent.
    const ctx = new AudioCtx({ sampleRate: 48000, latencyHint: 'interactive' });
    ctx.resume().catch(() => {});

    try {
      // The same constraints as the call, so the test sounds like the line.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: voiceRef.current.suppressOn !== false,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
        },
      });
      const mic = buildVoiceChain(ctx, stream, voiceRef.current);
      // Tapped before the gate, so the test is never silent while you get your
      // level right; the gate still runs and shows on the meter.
      mic.gain.connect(ctx.destination);
      await ctx.resume().catch(() => {});
      testRef.current = { stream, mic };
      setTesting(true);
    } catch (err) {
      ctx.close().catch(() => {});
      setError(
        err?.name === 'NotAllowedError'
          ? 'Your microphone is blocked. Allow it in the browser and try again.'
          : 'The microphone could not be opened. Check that nothing else is holding it.'
      );
    }
  }, []);

  // While the test is running, every slider takes effect immediately — the point
  // is to hear the change, not to restart it.
  useEffect(() => {
    const test = testRef.current;
    if (!test) return;
    applyMicSettings(test.mic, voice);
    test.stream.getAudioTracks().forEach((track) => {
      track.applyConstraints({ noiseSuppression: voice.suppressOn !== false }).catch(() => {});
    });
  }, [voice]);

  useEffect(() => {
    if (!testing) return undefined;
    const timer = window.setInterval(() => {
      const test = testRef.current;
      if (!test) return;
      if (test.mic.ctx.state === 'suspended') test.mic.ctx.resume().catch(() => {});
      const rms = driveMic(test.mic, voiceRef.current, lastVoiceRef);
      setLevel(Math.min(1, rms * 5));
    }, 100);
    return () => window.clearInterval(timer);
  }, [testing]);

  useEffect(() => stop, [stop]);

  return { testing, level, error, start, stop };
}