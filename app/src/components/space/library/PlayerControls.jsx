import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import {
  nextTrack,
  previousTrack,
  setRepeatMode,
  setShuffle,
  togglePlay,
} from '@/lib/libraryPlayer';
import { cn } from '@/lib/utils';

const NEXT_REPEAT = { off: 'all', all: 'one', one: 'off' };

export default function PlayerControls({ playing, repeat, shuffle, compact = false }) {
  const button = compact ? 'h-8 w-8' : 'h-10 w-10';

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setShuffle(!shuffle)}
        aria-label={shuffle ? 'Turn shuffle off' : 'Shuffle the songs'}
        className={cn(
          'grid place-items-center rounded-full transition-colors',
          button,
          shuffle ? 'bg-indigo-500/25 text-indigo-100' : 'text-slate-400 hover:bg-white/8 hover:text-white'
        )}
      >
        <Shuffle className="h-3.5 w-3.5" />
      </button>

      <button
        onClick={previousTrack}
        aria-label="Previous song"
        className={cn('grid place-items-center rounded-full text-slate-300 transition-colors hover:bg-white/10 hover:text-white', button)}
      >
        <SkipBack className="h-4 w-4" />
      </button>

      <button
        onClick={togglePlay}
        aria-label={playing ? 'Pause for both of you' : 'Play for both of you'}
        className={cn(
          'grid place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-glow transition-transform hover:scale-105',
          compact ? 'h-9 w-9' : 'h-11 w-11'
        )}
      >
        {playing ? (
          <Pause className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
        ) : (
          <Play className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
        )}
      </button>

      <button
        onClick={() => nextTrack()}
        aria-label="Next song"
        className={cn('grid place-items-center rounded-full text-slate-300 transition-colors hover:bg-white/10 hover:text-white', button)}
      >
        <SkipForward className="h-4 w-4" />
      </button>

      <button
        onClick={() => setRepeatMode(NEXT_REPEAT[repeat] || 'off')}
        aria-label="Change repeat"
        className={cn(
          'grid place-items-center rounded-full transition-colors',
          button,
          repeat === 'off'
            ? 'text-slate-400 hover:bg-white/8 hover:text-white'
            : 'bg-indigo-500/25 text-indigo-100'
        )}
      >
        {repeat === 'one' ? <Repeat1 className="h-3.5 w-3.5" /> : <Repeat className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}