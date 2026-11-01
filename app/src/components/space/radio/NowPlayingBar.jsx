import { Loader2, Pause, Play, Radio, X } from 'lucide-react';
import { GENRE_LABEL, GENRE_TINT } from '@/lib/tuneinStations';
import { stopStation, toggleStation } from '@/lib/tuneinPlayer';
import { useTuneInPlayer } from '@/lib/useTuneIn';
import MediaVolumeSlider from '@/components/space/MediaVolumeSlider';
import { cn } from '@/lib/utils';

// Stays on screen on every tab, so a station keeps playing while you move around.
export default function NowPlayingBar({ onOpen, lifted }) {
  const player = useTuneInPlayer();
  if (!player.stationId) return null;

  const playing = player.status === 'playing';

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4 md:justify-start md:px-6',
        lifted
          ? 'bottom-[calc(9rem+env(safe-area-inset-bottom))] md:bottom-24'
          : 'bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-6'
      )}
    >
      <div className="pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-2xl border border-white/12 bg-slate-950/85 p-2.5 shadow-glow backdrop-blur-xl">
        <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
          <span
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white',
              GENRE_TINT[player.genre] || GENRE_TINT.pop
            )}
          >
            {playing ? <Radio className="h-4 w-4" /> : <Loader2 className={cn('h-4 w-4', player.status === 'loading' && 'animate-spin')} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-white">{player.name}</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {player.status === 'loading'
                ? 'Tuning in…'
                : playing
                  ? `${GENRE_LABEL[player.genre] || 'Station'} · playing`
                  : 'Paused'}
            </span>
          </span>
        </button>

        <button
          onClick={toggleStation}
          aria-label={playing ? 'Pause station' : 'Play station'}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-500/25 text-violet-100 transition-colors hover:bg-violet-500/40"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>

        <MediaVolumeSlider className="mr-0.5 hidden sm:flex" />

        <button
          onClick={stopStation}
          aria-label="Stop station"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}