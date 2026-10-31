import { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Mic } from 'lucide-react';
import VaultNoteCard from './VaultNoteCard';
import useVoicePlayback from '@/lib/useVoicePlayback';
import { asDate } from '@/lib/time';

const PAGE = 20;

function dayKey(value) {
  const date = asDate(value);
  if (!date) return 'unknown';
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(value) {
  const date = asDate(value);
  if (!date) return 'Earlier';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(date) === dayKey(today)) return 'Today';
  if (dayKey(date) === dayKey(yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Everything the two of you have whispered into the recorder, kept in one place
// and playable long after it was sent.
export default function VoiceNoteVault({ space, user }) {
  const [notes, setNotes] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState('');

  const player = useVoicePlayback(setError);

  const load = useCallback(
    async (nextCursor = null) => {
      const options = { sort: '-created_date', limit: PAGE };
      if (nextCursor) options.cursor = nextCursor;
      const page = await base44.entities.VoiceNote.filter({ space_id: space.id }, options);
      const items = page.items || [];
      setNotes((previous) => (nextCursor ? [...previous, ...items] : items));
      setCursor(page.next_cursor || null);
      setHasMore(Boolean(page.has_more));
    },
    [space.id]
  );

  useEffect(() => {
    let cancelled = false;
    load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    const unsubscribe = base44.entities.VoiceNote.subscribe((event) => {
      if (!event?.data || event.data.space_id === space.id) load();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [load, space.id]);

  const loadMore = async () => {
    if (!cursor || moreLoading) return;
    setMoreLoading(true);
    try {
      await load(cursor);
    } finally {
      setMoreLoading(false);
    }
  };

  const remove = async (note) => {
    player.forget(note.id);
    if (player.playingId === note.id) player.stop();
    setNotes((previous) => previous.filter((item) => item.id !== note.id));
    await base44.entities.VoiceNote.delete(note.id);
  };

  const groups = useMemo(() => {
    const ordered = new Map();
    notes.forEach((note) => {
      const key = dayKey(note.created_date);
      if (!ordered.has(key)) {
        ordered.set(key, { key, label: dayLabel(note.created_date), items: [] });
      }
      ordered.get(key).items.push(note);
    });
    return [...ordered.values()];
  }, [notes]);

  return (
    <div className="space-y-4">
      <section className="glass-card relative overflow-hidden rounded-3xl p-5 shadow-soft sm:p-6">
        <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-indigo-300">
              Kept just for the two of you
            </p>
            <h2 className="mt-1.5 font-heading text-2xl font-semibold tracking-tight text-white">
              Voice Note Vault
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Every whisper, good morning and goodnight you have sent each other.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-300">
            {notes.length}
            {hasMore ? '+' : ''} saved
          </span>
        </div>
      </section>

      {error && (
        <p className="rounded-2xl border border-amber-400/25 bg-amber-400/10 px-3.5 py-2.5 text-[11px] text-amber-200">
          {error}
        </p>
      )}

      {loading ? (
        <div className="glass-card flex items-center justify-center gap-2 rounded-3xl p-8 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Opening the vault…
        </div>
      ) : notes.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 rounded-3xl p-10 text-center shadow-soft">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/20 text-indigo-200">
            <Mic className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-white">Nothing in the vault yet</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Record a note from Home and it will be kept here, ready to hear again.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.key} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                  {group.label}
                </h3>
                <span className="text-[10px] text-slate-600">{group.items.length}</span>
              </div>
              <div className="space-y-2">
                {group.items.map((note) => (
                  <VaultNoteCard
                    key={note.id}
                    note={note}
                    mine={note.author_id === user.id}
                    playing={player.playingId === note.id}
                    progress={player.progress}
                    onPlay={() => player.play(note)}
                    onSeek={player.seek}
                    onRemove={note.author_id === user.id ? () => remove(note) : null}
                  />
                ))}
              </div>
            </section>
          ))}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={moreLoading}
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-60"
            >
              {moreLoading ? 'Fetching…' : 'Load older notes'}
            </button>
          )}
        </div>
      )}

      <audio
        ref={player.audioRef}
        className="hidden"
        onTimeUpdate={player.handleTimeUpdate}
        onEnded={player.handleEnded}
      />
    </div>
  );
}