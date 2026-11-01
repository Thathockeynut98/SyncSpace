import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Plus, X } from 'lucide-react';
import { displayName } from '@/lib/spaceData';
import { decryptText, encryptText, spaceKey } from '@/lib/spaceCrypto';
import { shortDay } from '@/lib/time';

const NOTE_TONES = {
  amber: 'border-amber-300/20 bg-amber-300/[0.07]',
  fuchsia: 'border-fuchsia-300/20 bg-fuchsia-300/[0.07]',
  emerald: 'border-emerald-300/20 bg-emerald-300/[0.07]',
  sky: 'border-sky-300/20 bg-sky-300/[0.07]',
  rose: 'border-rose-300/20 bg-rose-300/[0.07]',
  violet: 'border-violet-300/20 bg-violet-300/[0.07]',
  teal: 'border-teal-300/20 bg-teal-300/[0.07]',
  lime: 'border-lime-300/20 bg-lime-300/[0.07]',
};

const SWATCH = {
  amber: 'bg-amber-300',
  fuchsia: 'bg-fuchsia-300',
  emerald: 'bg-emerald-300',
  sky: 'bg-sky-300',
  rose: 'bg-rose-300',
  violet: 'bg-violet-300',
  teal: 'bg-teal-300',
  lime: 'bg-lime-300',
};

const TONES = ['amber', 'fuchsia', 'emerald', 'sky', 'rose', 'violet', 'teal', 'lime'];

// The little things left for each other, right where the space opens so they are
// the first thing seen rather than buried under the canvas.
export default function LeftForYou({ space, user }) {
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState('');
  const [tone, setTone] = useState('amber');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const page = await base44.entities.Note.filter(
      { space_id: space.id },
      { sort: '-created_date', limit: 60 }
    );
    const key = await spaceKey(space);
    const opened = await Promise.all(
      page.items.map(async (note) => {
        if (!note.cipher || !note.iv) return { ...note, body: note.text || '' };
        try {
          return { ...note, body: await decryptText(key, note.cipher, note.iv) };
        } catch (error) {
          return { ...note, body: 'Could not be opened here.' };
        }
      })
    );
    setNotes(opened);
  }, [space]);

  useEffect(() => {
    load();
    return base44.entities.Note.subscribe((event) => {
      if (!event?.data || event.data.space_id === space.id) load();
    });
  }, [load, space.id]);

  const add = async (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      const key = await spaceKey(space);
      const { cipher, iv } = await encryptText(key, text.trim().slice(0, 600));
      await base44.entities.Note.create({
        space_id: space.id,
        cipher,
        iv,
        color: tone,
        author_name: displayName(user),
        author_id: user.id,
      });
      setText('');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (note) => {
    await base44.entities.Note.delete(note.id);
    setNotes((previous) => previous.filter((item) => item.id !== note.id));
  };

  return (
    <section className="glass-card rounded-3xl p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-heading text-sm font-semibold tracking-tight text-white">Left for you</h3>
        <span className="text-xs text-muted-foreground">{notes.length} notes</span>
      </div>

      <form onSubmit={add} className="mb-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={2}
          placeholder="Leave something on the fridge…"
          className="w-full resize-none bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {TONES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTone(value)}
                className={`h-5 w-5 rounded-full transition-transform ${SWATCH[value]} ${
                  value === tone ? 'scale-110 ring-2 ring-white/70' : 'opacity-70 hover:opacity-100'
                }`}
              />
            ))}
          </div>
          <button
            type="submit"
            disabled={saving || !text.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Pin it
          </button>
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {notes.map((note, index) => (
          <div
            key={note.id}
            className={`group relative rounded-2xl border p-3.5 ${NOTE_TONES[note.color] || NOTE_TONES.amber} ${
              index % 2 === 0 ? 'rotate-[-0.8deg]' : 'rotate-[0.9deg]'
            }`}
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{note.body}</p>
            <p className="mt-3 text-[11px] text-slate-400">
              {note.author_name || 'Them'} · {shortDay(note.created_date)}
            </p>
            {note.author_id === user.id && (
              <button
                onClick={() => remove(note)}
                className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-slate-400 opacity-0 transition-all hover:bg-black/30 hover:text-white group-hover:opacity-100"
                title="Remove note"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {!notes.length && (
        <p className="rounded-2xl border border-dashed border-white/12 px-4 py-8 text-center text-xs text-muted-foreground">
          Nothing pinned yet. The first note is always the hardest.
        </p>
      )}
    </section>
  );
}