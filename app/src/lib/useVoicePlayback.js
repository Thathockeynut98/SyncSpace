import { useCallback, useEffect, useRef, useState } from 'react';
import { signFile } from '@/lib/spaceData';

// One player for a whole list of notes: starting a note stops whichever one was
// playing, and signed links are fetched once per note and kept.
export default function useVoicePlayback(onError) {
  const [playingId, setPlayingId] = useState(null);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);
  const urlsRef = useRef(new Map());

  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    []
  );

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setPlayingId(null);
    setProgress(0);
  }, []);

  const play = useCallback(
    async (note) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (playingId === note.id) {
        stop();
        return;
      }

      let url = urlsRef.current.get(note.id);
      if (!url) {
        url = await signFile(note.file_uri);
        if (!url) {
          onError?.('That note could not be opened.');
          return;
        }
        urlsRef.current.set(note.id, url);
      }

      audio.src = url;
      audio.currentTime = 0;
      setProgress(0);
      setPlayingId(note.id);
      audio.play().catch(() => {
        setPlayingId(null);
        onError?.('That note did not play. Try again.');
      });
    },
    [onError, playingId, stop]
  );

  const seek = useCallback((fraction) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = fraction * audio.duration;
    setProgress(fraction);
  }, []);

  // Drops the cached link once a note is gone.
  const forget = useCallback((id) => {
    urlsRef.current.delete(id);
  }, []);

  const handleTimeUpdate = (event) => {
    const audio = event.target;
    setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
  };

  const handleEnded = () => {
    setPlayingId(null);
    setProgress(0);
  };

  return {
    audioRef,
    playingId,
    progress,
    play,
    stop,
    seek,
    forget,
    handleTimeUpdate,
    handleEnded,
  };
}