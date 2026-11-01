import { Pause, Play, X } from 'lucide-react';
import { shortDay } from '@/lib/time';

function clock(value) {
  const total = Math.max(0, Math.round(value || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// One voice note, playable in place.
export default function VoiceNoteRow({ note, mine, playing, progress, onPlay, onRemove }) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-2xl border px-2.5 py-2 transition-colors ${
        playing ? 'border-indigo-400/40 bg-indigo-500/10' : 'border-white/8 bg-white/[0.03]'
      }`}
    >
      <button
        onClick={onPlay}
        title={playing ? 'Pause' : 'Play'}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-glow transition-transform hover:scale-105"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[11px] font-medium text-slate-200">
            {mine ? 'You' : note.author_name || 'Them'}
            <span className="text-slate-500"> · {shortDay(note.created_date)}</span>
          </p>
          <span className="shrink-0 text-[10px] tabular-nums text-slate-500">
            {clock(note.duration_seconds)}
          </span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400"
            style={{ width: `${Math.min(100, (playing ? progress : 0) * 100)}%` }}
          />
        </div>
      </div>

      {onRemove && (
        <button
          onClick={onRemove}
          title="Delete note"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}