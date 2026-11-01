import { BookMarked } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CodexSectionNav({ sections, total, active, onSelect }) {
  const items = [{ section: 'all', label: 'Whole codex', count: total }, ...sections];

  return (
    <>
      {/* phones: a scrollable strip */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
        {items.map((item) => (
          <button
            key={item.section}
            onClick={() => onSelect(item.section)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              active === item.section
                ? 'border-transparent bg-gradient-to-r from-indigo-500 to-violet-500 text-white'
                : 'border-white/8 bg-white/5 text-slate-300 hover:text-white'
            )}
          >
            {item.label || item.section}
            <span className={cn('text-[10px]', active === item.section ? 'text-white/70' : 'text-slate-500')}>
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {/* desktop: the codex spine */}
      <aside className="glass-panel hidden h-fit rounded-3xl border border-white/8 p-3 lg:block">
        <div className="mb-2 flex items-center gap-2 px-2 py-1.5">
          <BookMarked className="h-4 w-4 text-amber-300" />
          <span className="font-heading text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Sections
          </span>
        </div>
        <nav className="max-h-[62vh] space-y-0.5 overflow-y-auto pr-1">
          {items.map((item) => (
            <button
              key={item.section}
              onClick={() => onSelect(item.section)}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-colors',
                active === item.section
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              )}
            >
              <span className="truncate capitalize">{item.label || item.section}</span>
              <span className="shrink-0 text-[11px] text-slate-500">{item.count}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}