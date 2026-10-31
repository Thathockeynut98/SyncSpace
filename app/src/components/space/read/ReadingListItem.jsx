import { BookOpen, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

function status(doc) {
  const total = doc.page_count || 0;
  const page = doc.last_page;
  if (page == null) return { label: doc.added_by_name ? `${doc.added_by_name} added it` : 'Not started', percent: 0, finished: false };
  if (total > 1 && page + 1 >= total) return { label: 'Finished together', percent: 100, finished: true };
  if (total > 1) {
    return {
      label: `Page ${page + 1} of ${total}`,
      percent: Math.min(100, Math.round(((page + 1) / total) * 100)),
      finished: false,
    };
  }
  return { label: 'Started', percent: 0, finished: false };
}

export default function ReadingListItem({ doc, active, onPick }) {
  const state = status(doc);

  return (
    <button
      type="button"
      onClick={() => onPick(doc.id)}
      className={cn(
        'w-full rounded-xl border px-3 py-2 text-left transition-colors',
        active
          ? 'border-primary/40 bg-primary/10'
          : 'border-transparent bg-white/[0.02] hover:bg-white/[0.06]'
      )}
    >
      <div className="flex items-center gap-2">
        {state.finished ? (
          <Check className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-primary' : 'text-emerald-300')} />
        ) : (
          <BookOpen className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-primary' : 'text-slate-500')} />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-slate-100">{doc.title}</span>
          <span className="block truncate text-[10px] text-muted-foreground">{state.label}</span>
        </span>
        {active && (
          <span className="shrink-0 rounded-full bg-primary/25 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
            Now
          </span>
        )}
      </div>

      {(doc.page_count || 0) > 1 && (
        <div className="ml-[1.4rem] mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400 transition-all"
            style={{ width: `${state.percent}%` }}
          />
        </div>
      )}
    </button>
  );
}