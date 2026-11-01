import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useMemories } from '@/lib/useMemories';
import MemoryComposer from './MemoryComposer';
import MemoryCard from './MemoryCard';

export default function MemoryWall({ space, user }) {
  const { memories, urls, loading, add, remove } = useMemories(space, user);
  const [expanded, setExpanded] = useState(false);

  const shown = expanded ? memories : memories.slice(0, 4);

  return (
    <section className="glass-card rounded-3xl p-4 shadow-soft sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 font-heading text-lg font-semibold tracking-tight text-white">
            <Heart className="h-4 w-4 text-fuchsia-300" />
            Remember this
          </h2>
          <p className="text-xs text-muted-foreground">
            {loading
              ? 'Bringing them back…'
              : memories.length
                ? `${memories.length} ${memories.length === 1 ? 'moment' : 'moments'} you kept for each other`
                : 'Little things worth not losing, saved for the two of you'}
          </p>
        </div>
      </div>

      <MemoryComposer onAdd={add} />

      {shown.length > 0 && (
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {shown.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              photoUrl={urls[memory.id]}
              onRemove={remove}
            />
          ))}
        </div>
      )}

      {memories.length > 4 && (
        <button
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 text-[11px] text-indigo-200/80 transition-colors hover:text-indigo-100"
        >
          {expanded ? 'Show fewer' : `Show all ${memories.length}`}
        </button>
      )}
    </section>
  );
}