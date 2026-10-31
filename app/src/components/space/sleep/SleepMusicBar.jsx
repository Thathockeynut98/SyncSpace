import { useEffect, useState } from 'react';
import { Loader2, Moon, Pause, Play, X } from 'lucide-react';
import {
  pauseSleepTrack,
  playSleepTrack,
  stopSleepPlaying,
  subscribeSleepPlayback,
} from '@/lib/sleepPlayback';
import { cn } from '@/lib/utils';

// Stays on screen on every tab, so the sleep soundtrack keeps playing while you
// move around the space — and can be paused from wherever you end up.
export default function SleepMusicBar({ onOpen, lifted }) {
  const [playback, setPlayback] = useState({ trackId: null, title: '', playing: false, loading: false });

  useEffect(() => subscribeSleepPlayback(setPlayback), []);

  if (!playback.trackId) return null;

  const resume = () =>
    playSleepTrack({
      id: playback.trackId,
      title: playback.title,
      file_uri: playback.file_uri,
    });

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4 md:px-6',
        lifted
          ? 'bottom-[calc(13.25rem+env(safe-area-inset-bottom))] md:bottom-24'
          : 'bottom-[calc(8.75rem+env(safe-area-inset-bottom))] md:bottom-6'
      )}
    >
      <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border border-white/12 bg-slate-950/85 shadow-glow backdrop-blur-xl">
        <div className="flex items-center gap-2.5 p-2.5">
          <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
              <Moon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">
                {playback.title || 'Sleep soundtrack'}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {playback.loading ? 'Starting…' : playback.playing ? 'Playing for both of you' : 'Paused'}
              </span>
            </span>
          </button>

          <button
            onClick={playback.playing ? pauseSleepTrack : resume}
            aria-label={playback.playing ? 'Pause the soundtrack' : 'Play the soundtrack'}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-slate-200 transition-colors hover:bg-white/10"
          >
            {playback.loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : playback.playing ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </button>

          <button
            onClick={() => stopSleepPlaying()}
            aria-label="Stop the soundtrack"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}