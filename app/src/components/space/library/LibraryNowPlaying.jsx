import { Music2, X } from 'lucide-react';
import PlayerControls from './PlayerControls';
import MediaVolumeSlider from '@/components/space/MediaVolumeSlider';
import { stopTrack } from '@/lib/libraryPlayer';
import { useLibraryPlayer } from '@/lib/useLibraryPlayer';
import { formatDuration } from '@/lib/spaceData';

export default function LibraryNowPlaying() {
  const player = useLibraryPlayer();
  if (!player.item) return null;

  const pct = player.duration ? Math.min(100, (player.position / player.duration) * 100) : 0;

  return (
    <section className="glass-card rounded-3xl p-4 shadow-soft sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/20">
            <Music2 className="h-5 w-5 text-indigo-200" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-heading text-sm font-semibold tracking-tight text-white">
              {player.item.title}
            </h3>
            <p className="truncate text-[11px] text-muted-foreground">
              {player.playing ? 'Playing for both of you' : 'Paused for both of you'}
              {player.item.added_by_name ? ` · ${player.item.added_by_name}` : ''}
            </p>
          </div>
        </div>
        <button
          onClick={stopTrack}
          aria-label="Close the player"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/8 text-slate-300 transition-colors hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {formatDuration(player.position)} / {formatDuration(player.duration || player.item.duration_seconds)}
        </span>
        <div className="flex items-center gap-2">
          <MediaVolumeSlider className="hidden sm:flex" />
          <PlayerControls playing={player.playing} repeat={player.repeat} shuffle={player.shuffle} />
        </div>
      </div>
      {player.error && (
        <p className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {player.error}
        </p>
      )}
    </section>
  );
}