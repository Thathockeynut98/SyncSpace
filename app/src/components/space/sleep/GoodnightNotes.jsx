import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, MoonStar } from 'lucide-react';
import { displayName } from '@/lib/spaceData';
import { decryptText, encryptText, spaceKey } from '@/lib/spaceCrypto';
import { clockTime, shortDay } from '@/lib/time';

const LIMIT = 180;

export default function GoodnightNotes({ space, user }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const page = await base44.entities.Goodnight.filter(
      { space_id: space.id },
      { sort: '-created_date', limit: 20 }
    );
    const key = await spaceKey(space);
    const opened = await Promise.all(
      page.items.map(async (item) => {
        try {
          return { ...item, body: await decryptText(key, item.cipher, item.iv) };
        } catch (err) {
          return { ...item, body: 'Could not be opened here.' };
        }
      })
    );
    setNotes(opened);
    setLoading(false);
  }, [space]);

  useEffect(() => {
    load();
    return base44.entities.Goodnight.subscribe((event) => {
      if (!event?.data || event.data.space_id === space.id) load();
    });
  }, [load, space.id]);

  const send = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setError('');
    try {
      const key = await spaceKey(space);
      const { cipher, iv } = await encryptText(key, text);
      await base44.entities.Goodnight.create({
        space_id: space.id,
        cipher,
        iv,
        author_name: displayName(user),
        author_id: user.id,
      });
      setDraft('');
    } catch (err) {
      setError('That did not save. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass-card rounded-3xl p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <MoonStar className="h-4 w-4 text-violet-200" />
        <h3 className="font-heading text-sm font-semibold tracking-tight text-white">
          Goodnight notes
        </h3>
        <p className="ml-auto text-[11px] text-muted-foreground">Left before sleep, just for the two of you</p>
      </div>

      <form onSubmit={send} className="mt-3 flex items-center gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={LIMIT}
          placeholder="Sleep well, I will see you in the morning…"
          className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-violet-300/40"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-xs font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Say goodnight
        </button>
      </form>
      {error && <p className="mt-2 text-[11px] text-rose-300">{error}</p>}

      <div className="mt-4 max-h-56 space-y-2 overflow-y-auto pr-1">
        {loading ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Opening your notes…</p>
        ) : notes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/12 px-4 py-5 text-center text-xs leading-relaxed text-muted-foreground">
            No goodnight left yet. Say the first one before the lights go out.
          </p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-2.5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[11px] font-medium text-violet-200">
                  {note.author_name || 'Them'}
                  {note.author_id === user.id && <span className="text-slate-500"> · you</span>}
                </p>
                <p className="shrink-0 text-[10px] text-slate-500">
                  {shortDay(note.created_date)} · {clockTime(note.created_date)}
                </p>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-100">
                {note.body}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}