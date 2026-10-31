import { useCallback, useEffect, useRef } from 'react';
import {
  getSleepPlayback,
  pauseSleepTrack,
  playSleepTrack,
  stopSleepPlaying,
  subscribeSleepPlayback,
} from '@/lib/sleepPlayback';

// One sleep soundtrack for the two of you: whoever presses play, the other hears
// it too, on whatever tab they happen to be on.
export default function useSleepRoom({ room }) {
  const { send, on, connected, seat } = room;
  const muteUntil = useRef(0);
  const lastRef = useRef({ trackId: null, playing: false });

  const broadcast = useCallback(() => {
    if (!connected) return;
    const current = getSleepPlayback();
    send({
      type: 'sleep',
      action: 'state',
      from: seat,
      trackId: current.trackId,
      title: current.title,
      file_uri: current.file_uri,
      playing: current.playing,
      position: Math.round(current.position || 0),
    });
  }, [send, connected, seat]);

  // Anything that happens here gets passed to them.
  useEffect(
    () =>
      subscribeSleepPlayback((current) => {
        const last = lastRef.current;
        if (current.trackId === last.trackId && current.playing === last.playing) return;
        lastRef.current = { trackId: current.trackId, playing: current.playing };
        if (Date.now() < muteUntil.current) return;
        broadcast();
      }),
    [broadcast]
  );

  const apply = useCallback((message) => {
    const current = getSleepPlayback();

    if (!message.trackId) {
      if (current.trackId) stopSleepPlaying();
      return;
    }

    if (current.trackId === message.trackId) {
      if (!message.playing) {
        if (current.playing) pauseSleepTrack();
        return;
      }
      // Already hearing the same sound: leave it running rather than jump it back.
      if (current.playing) return;
    } else if (!message.playing) {
      return;
    }

    playSleepTrack(
      { id: message.trackId, title: message.title, file_uri: message.file_uri },
      { position: (Number(message.position) || 0) + 0.4 }
    );
  }, []);

  // And anything that happens there lands here.
  useEffect(
    () =>
      on('sleep', (message) => {
        if (!message || message.from === seat) return;
        muteUntil.current = Date.now() + 1500;
        apply(message);
      }),
    [on, seat, apply]
  );

  // Ask what is playing the moment you arrive.
  useEffect(() => {
    if (!connected) return;
    send({ type: 'sleep', action: 'ask', from: seat });
  }, [connected, send, seat]);
}