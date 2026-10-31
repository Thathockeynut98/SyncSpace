import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Heart, Send } from 'lucide-react';
import { startOfToday } from '@/lib/moods';
import { displayName } from '@/lib/spaceData';

export default function ThinkingOfYou({ space, user, partnerName, partnerOnline }) {
  const [sentToday, setSentToday] = useState(0);
  const [theirsToday, setTheirsToday] = useState(0);
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);

  const load = useCallback(async () => {
    const since = startOfToday();
    const [mine, theirs] = await Promise.all([
      base44.entities.Heart.count({ space_id: space.id, from_id: user.id, created_date: { $gte: since } }),
      base44.entities.Heart.count({ space_id: space.id, created_date: { $gte: since } }),
    ]);
    setSentToday(Number(mine) || 0);
    setTheirsToday(Math.max(0, (Number(theirs) || 0) - (Number(mine) || 0)));
  }, [space.id, user.id]);

  useEffect(() => {
    load();
    return base44.entities.Heart.subscribe((event) => {
      if (event?.data?.space_id === space.id) load();
    });
  }, [load, space.id]);

  const sendHearts = async () => {
    if (sending) return;
    setSending(true);
    try {
      await base44.entities.Heart.create({
        space_id: space.id,
        from_id: user.id,
        from_name: displayName(user),
      });
      setSentToday((value) => value + 1);
      setJustSent(true);
      setTimeout(() => setJustSent(false), 2200);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="glass-card flex flex-col items-center rounded-3xl p-5 text-center shadow-soft">
      <motion.button
        onClick={sendHearts}
        disabled={sending}
        whileTap={{ scale: 0.92 }}
        className="relative grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-rose-500 via-fuchsia-500 to-violet-500 text-white shadow-glow transition-transform hover:scale-[1.03] disabled:opacity-70"
        title="Thinking of you"
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/20" />
        <Heart className="relative h-10 w-10" fill="currentColor" strokeWidth={1.5} />
      </motion.button>

      <p className="mt-3 font-heading text-sm font-semibold text-white">
        {justSent ? 'Hearts on their way 💗' : 'Thinking of you'}
      </p>
      <p className="mt-1 max-w-[15rem] text-[11px] leading-relaxed text-muted-foreground">
        Tap whenever you miss {partnerName}. Hearts float across their screen.
      </p>

      <div className="mt-3 flex w-full items-center justify-between gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px]">
        <span className="flex items-center gap-1 text-slate-300">
          <Send className="h-3 w-3 text-rose-300" />
          You sent {sentToday}
        </span>
        <span className="flex items-center gap-1 text-slate-300">
          <Heart className="h-3 w-3 text-fuchsia-300" fill="currentColor" />
          {partnerName} sent {theirsToday}
        </span>
      </div>

      {!partnerOnline && (
        <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
          They are away right now. The hearts will still be here, counted, when they are back.
        </p>
      )}
    </section>
  );
}