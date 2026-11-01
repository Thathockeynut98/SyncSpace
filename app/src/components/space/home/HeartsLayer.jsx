import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart } from 'lucide-react';

const BURST_MS = 4200;

export default function HeartsLayer({ space, user }) {
  const [bursts, setBursts] = useState([]);

  useEffect(
    () =>
      base44.entities.Heart.subscribe((event) => {
        const data = event?.data;
        if (event?.type !== 'create' || !data) return;
        if (data.space_id !== space.id || data.from_id === user.id) return;
        const id = data.id || crypto.randomUUID();
        setBursts((previous) => (previous.some((item) => item.id === id) ? previous : [...previous, { id, from: data.from_name || 'They' }]));
        setTimeout(() => {
          setBursts((previous) => previous.filter((item) => item.id !== id));
        }, BURST_MS);
      }),
    [space.id, user.id]
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {bursts.map((burst) => (
          <motion.div
            key={burst.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            <div className="absolute left-1/2 top-24 -translate-x-1/2 rounded-full border border-rose-300/30 bg-rose-500/15 px-4 py-1.5 text-xs font-medium text-rose-100 backdrop-blur-md">
              <span className="mr-1.5 inline-flex items-center gap-1">
                <Heart className="h-3 w-3" fill="currentColor" />
              </span>
              {burst.from} is thinking of you
            </div>
            {Array.from({ length: 10 }).map((_, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 0, x: 0, scale: 0.5 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: -220 - Math.random() * 200,
                  x: (Math.random() - 0.5) * 320,
                  scale: 0.9 + Math.random() * 0.6,
                }}
                transition={{ duration: 2.6 + Math.random() * 1.2, delay: index * 0.07, ease: 'easeOut' }}
                className="absolute bottom-1/3 left-1/2 text-2xl"
              >
                {['💗', '💖', '💕', '🩷'][index % 4]}
              </motion.span>
            ))}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}