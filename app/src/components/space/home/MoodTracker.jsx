import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, Loader2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOODS, dayKey, lastDays, moodById } from '@/lib/moods';
import { displayName } from '@/lib/spaceData';

export default function MoodTracker({ space, user, partnerName }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const [editingNote, setEditingNote] = useState(false);

  const load = useCallback(async () => {
    const page = await base44.entities.Mood.filter(
      { space_id: space.id },
      { sort: '-created_date', limit: 80 }
    );
    setRecords(page.items);
    setLoading(false);
  }, [space.id]);

  useEffect(() => {
    load();
    return base44.entities.Mood.subscribe((event) => {
      if (event?.data?.space_id === space.id) load();
    });
  }, [load, space.id]);

  const today = dayKey();
  const mine = records.find((row) => row.owner_id === user.id && row.day === today) || null;
  const theirs = records.find((row) => row.owner_id !== user.id && row.day === today) || null;
  const theirMood = moodById(theirs?.mood);

  useEffect(() => {
    setNote(mine?.note || '');
    setEditingNote(false);
  }, [mine?.id]);

  const pick = async (moodId) => {
    if (saving) return;
    setSaving(true);
    try {
      if (mine) {
        await base44.entities.Mood.update(mine.id, { mood: moodId });
        setRecords((previous) =>
          previous.map((row) => (row.id === mine.id ? { ...row, mood: moodId } : row))
        );
      } else {
        const created = await base44.entities.Mood.create({
          space_id: space.id,
          owner_id: user.id,
          owner_name: displayName(user),
          day: today,
          mood: moodId,
          note: '',
        });
        setRecords((previous) => [created, ...previous]);
      }
    } finally {
      setSaving(false);
    }
  };

  const saveNote = async () => {
    if (!mine) return;
    const text = note.trim().slice(0, 140);
    setEditingNote(false);
    if ((mine.note || '') === text) return;
    await base44.entities.Mood.update(mine.id, { note: text });
    setRecords((previous) =>
      previous.map((row) => (row.id === mine.id ? { ...row, note: text } : row))
    );
  };

  const week = lastDays(7).map((day) => ({
    ...day,
    mine: records.find((row) => row.owner_id === user.id && row.day === day.key) || null,
    theirs: records.find((row) => row.owner_id !== user.id && row.day === day.key) || null,
  }));

  const mineMood = moodById(mine?.mood);

  return (
    <section className="glass-card rounded-3xl p-4 shadow-soft sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-sm font-semibold text-white">How are you today?</h3>
          <p className="text-[11px] text-muted-foreground">A mood each, kept side by side.</p>
        </div>
        {saving && <Loader2 className="mt-1 h-3.5 w-3.5 shrink-0 animate-spin text-indigo-300" />}
      </div>

      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
        {MOODS.map((mood) => {
          const active = mine?.mood === mood.id;
          return (
            <button
              key={mood.id}
              onClick={() => pick(mood.id)}
              disabled={saving}
              className={cn(
                'flex flex-col items-center gap-1 rounded-2xl border bg-gradient-to-b px-1 py-2 text-[10px] transition-all disabled:opacity-60',
                mood.tone,
                active ? `${mood.ring} text-white shadow-glow` : 'border-white/8 text-slate-300 hover:border-white/20'
              )}
            >
              <span className="text-base leading-none">{mood.emoji}</span>
              <span className="truncate">{mood.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 space-y-2">
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">You</p>
          {mineMood ? (
            <div className="mt-0.5 flex items-start justify-between gap-2">
              <p className="min-w-0 text-xs text-slate-100">
                <span className="mr-1">{mineMood.emoji}</span>
                {mineMood.label}
                {mine?.note && !editingNote && (
                  <span className="ml-1 text-muted-foreground">· {mine.note}</span>
                )}
              </p>
              <button
                onClick={() => setEditingNote((value) => !value)}
                className="shrink-0 text-slate-500 transition-colors hover:text-slate-200"
                title="Add a word"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {loading ? 'Looking…' : 'Pick how the day feels.'}
            </p>
          )}
          {editingNote && mine && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') saveNote();
                  if (event.key === 'Escape') setEditingNote(false);
                }}
                maxLength={140}
                autoFocus
                placeholder="A few words about today…"
                className="min-w-0 flex-1 rounded-lg border border-white/12 bg-slate-950/60 px-2 py-1 text-[11px] text-white outline-none placeholder:text-slate-500"
              />
              <button
                onClick={saveNote}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-indigo-500/80 text-white"
                title="Save"
              >
                <Check className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{partnerName}</p>
          {theirMood ? (
            <p className="mt-0.5 text-xs text-slate-100">
              <span className="mr-1">{theirMood.emoji}</span>
              {theirMood.label}
              {theirs?.note && <span className="ml-1 text-muted-foreground">· {theirs.note}</span>}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {loading ? 'Looking…' : 'Has not checked in yet today.'}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {week.map((day) => {
          const mineDay = moodById(day.mine?.mood);
          const theirDay = moodById(day.theirs?.mood);
          return (
            <div
              key={day.key}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl border px-0.5 py-1',
                day.isToday ? 'border-indigo-400/30 bg-indigo-500/10' : 'border-white/6 bg-white/[0.02]'
              )}
              title={day.key}
            >
              <span className="text-[9px] uppercase text-slate-500">{day.letter}</span>
              <span className="text-[11px] leading-none">{mineDay?.emoji || '·'}</span>
              <span className="text-[11px] leading-none opacity-80">{theirDay?.emoji || '·'}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}