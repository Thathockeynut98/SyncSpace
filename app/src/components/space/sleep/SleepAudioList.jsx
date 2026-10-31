import { Loader2, Pause, Play, Trash2 } from 'lucide-react';

export default function SleepAudioList({ tracks, playback, onToggle, onRemove }) {
  if (!tracks.length) return null;

  return (
    <div className="mt-3 space-y-2">
      {tracks.map((track, index) => {
        const active = playback.trackId === track.id;
        const playing = active && playback.playing;
        return (
          <div
            key={track.id}
            className={`flex items-center gap-3 rounded-2xl border p-2.5 transition-colors ${
              active ? 'border-violet-400/25 bg-violet-500/[0.09]' : 'border-white/6 bg-white/[0.03]'
            }`}
          >
            <button
              onClick={() => onToggle(track)}
              title={playing ? 'Pause' : 'Play'}
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors ${
                active ? 'bg-violet-500/25 text-violet-100' : 'bg-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              {active && playback.loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : playing ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-100">{track.title || `Track ${index + 1}`}</p>
              <p className="truncate text-[10px] text-slate-500">
                {track.added_by_name ? `added by ${track.added_by_name}` : 'added by you'}
              </p>
            </div>

            <button
              onClick={() => onRemove(track)}
              title="Remove"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-white/5 hover:text-rose-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}