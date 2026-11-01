import { Music2, X } from 'lucide-react';
import PlayerControls from './PlayerControls';
import { stopTrack } from '@/lib/libraryPlayer';
import { useLibraryPlayer } from '@/lib/useLibraryPlayer';
import { cn } from '@/lib/utils';

// Stays on screen on every tab, so a song keeps playing while you move around.
export default function LibraryBar({ onOpen, lifted }) {
  const player = useLibraryPlayer();
  if (!player.item) return null;

  const pct = player.duration ? Math.min(100, (player.position / player.duration) * 100) : 0;

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4 md:justify-end md:px-6',
        lifted
          ? 'bottom-[calc(9rem+env(safe-area-inset-bottom))] md:bottom-24'
          : 'bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-6'
      )}
    >
      <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border border-white/12 bg-slate-950/85 shadow-glow backdrop-blur-xl">
        <div className="flex items-center gap-2 p-2.5">
          <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
              <Music2 className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">
                {player.item.title}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {player.playing ? 'Playing together' : 'Paused'}
                {player.item.added_by_name ? ` · ${player.item.added_by_name}` : ''}
              </span>
            </span>
          </button>

          <PlayerControls
            playing={player.playing}
            repeat={player.repeat}
            shuffle={player.shuffle}
            compact
          />

          <button
            onClick={stopTrack}
            aria-label="Stop the song"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="h-0.5 bg-white/8">
          <div
            className="h-full bg-gradient-to-r from-indigo-400 to-fuchsia-400 transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}