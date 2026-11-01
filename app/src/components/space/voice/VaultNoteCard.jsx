import { Pause, Play, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clockTime } from '@/lib/time';

const BAR_COUNT = 34;

// Each note gets its own steady shape, so the list reads like sound rather than
// identical placeholders. Same note, same bars, on both phones.
function barsFor(id = '') {
  let seed = 7;
  for (let i = 0; i < id.length; i += 1) seed = (seed * 31 + id.charCodeAt(i)) % 99991;
  return Array.from({ length: BAR_COUNT }, () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return 0.24 + (seed / 2147483648) * 0.76;
  });
}

function clock(value) {
  const total = Math.max(0, Math.round(value || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// One saved recording: press play, or tap anywhere on the bars to jump there.
export default function VaultNoteCard({ note, mine, playing, progress, onPlay, onSeek, onRemove }) {
  const bars = barsFor(note.id);
  const total = Math.max(0, Math.round(note.duration_seconds || 0));
  const filled = playing ? progress * BAR_COUNT : 0;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors',
        playing ? 'border-indigo-400/40 bg-indigo-500/10' : 'border-white/8 bg-white/[0.03]'
      )}
    >
      <button
        onClick={onPlay}
        title={playing ? 'Pause' : 'Play'}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-glow transition-transform hover:scale-105"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>

      <div className="min-w-0 flex-1">
        <div
          role="presentation"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            onSeek(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)));
          }}
          className="flex h-8 cursor-pointer items-center gap-[2px]"
        >
          {bars.map((height, index) => (
            <span
              key={index}
              className={cn(
                'flex-1 rounded-full transition-colors',
                index < filled ? 'bg-gradient-to-t from-indigo-400 to-fuchsia-400' : 'bg-white/15'
              )}
              style={{ height: `${Math.round(height * 100)}%` }}
            />
          ))}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="truncate text-[11px] text-slate-400">
            {mine ? 'You' : note.author_name || 'Them'}
            <span className="text-slate-600"> · {clockTime(note.created_date)}</span>
          </p>
          <span className="shrink-0 text-[10px] tabular-nums text-slate-500">
            {playing ? `${clock(progress * total)} / ` : ''}
            {clock(total)}
          </span>
        </div>
      </div>

      {onRemove && (
        <button
          onClick={onRemove}
          title="Delete note"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}