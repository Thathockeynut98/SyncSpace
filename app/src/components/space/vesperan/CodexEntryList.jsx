import { Loader2, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

function groupBySection(items) {
  const groups = [];
  items.forEach((item) => {
    const last = groups[groups.length - 1];
    if (last && last.section === item.section) last.items.push(item);
    else groups.push({ section: item.section, items: [item] });
  });
  return groups;
}

export default function CodexEntryList({ items, loading, showSection, hasMore, more, onMore }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Opening the codex…
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Moon className="h-6 w-6 text-slate-600" />
        <p className="text-sm text-slate-400">Nothing in the codex answers to that.</p>
        <p className="text-xs text-slate-500">Try an English word, or a Vesperan one.</p>
      </div>
    );
  }

  const groups = showSection ? groupBySection(items) : [{ section: null, items }];

  return (
    <div>
      {groups.map((group) => (
        <div key={group.section || 'results'} className="mb-5 last:mb-0">
          {group.section && (
            <p className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <span className="capitalize">{group.section}</span>
              <span className="h-px flex-1 bg-white/8" />
            </p>
          )}
          <ul>
            {group.items.map((item) => (
              <li
                key={item.id}
                className="flex items-baseline justify-between gap-4 border-b border-white/5 py-2.5 last:border-0"
              >
                <span className="min-w-0 break-words text-sm text-slate-300">{item.english}</span>
                <span className="shrink-0 text-right font-heading text-sm font-semibold text-amber-300">
                  {item.vesperan}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {hasMore && (
        <div className="pt-2 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMore}
            disabled={more}
            className="text-slate-300 hover:bg-white/5 hover:text-white"
          >
            {more ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            More entries
          </Button>
        </div>
      )}
    </div>
  );
}