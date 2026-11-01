import { Trash2 } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { shortDay } from '@/lib/time';

export default function MemoryCard({ memory, photoUrl, onRemove }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03]">
      {photoUrl && (
        <Image
          src={photoUrl}
          alt={memory.body ? memory.body.slice(0, 60) : 'A memory'}
          fittingType="fill"
          className="h-36 w-full object-cover"
        />
      )}
      <div className="p-3">
        {memory.body && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{memory.body}</p>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          {memory.author_name || 'One of us'} · {shortDay(memory.created_date)}
        </p>
      </div>
      <button
        onClick={() => onRemove(memory)}
        aria-label="Forget this memory"
        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-slate-950/70 text-slate-400 opacity-0 backdrop-blur transition-opacity hover:text-rose-300 group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </article>
  );
}