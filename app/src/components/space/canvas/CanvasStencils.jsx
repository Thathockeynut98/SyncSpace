import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Shapes } from 'lucide-react';
import StencilPreview from './StencilPreview';
import { STENCIL_GROUPS, STENCILS, findStencil } from '@/lib/canvasStencils';

export default function CanvasStencils({ stencilId, onPick, filled, onFilled, active }) {
  const [group, setGroup] = useState('all');
  const [query, setQuery] = useState('');
  const current = findStencil(stencilId);

  const items = useMemo(() => {
    const search = query.trim().toLowerCase();
    const pool = group === 'all' ? STENCILS : STENCIL_GROUPS.find((entry) => entry.id === group)?.items || [];
    if (!search) return pool;
    return pool.filter((item) => item.label.toLowerCase().includes(search));
  }, [group, query]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Stencils and colouring pages"
          className={`flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-[11px] font-medium transition-colors ${
            active
              ? 'bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-glow'
              : 'text-slate-400 hover:bg-white/8 hover:text-slate-100'
          }`}
        >
          <Shapes className="h-4 w-4" />
          <span className="hidden lg:inline">Stencils</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[21rem] border-white/10 bg-slate-950/95 p-3 text-slate-200 shadow-soft backdrop-blur-xl"
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Colouring pages
          </p>
          <div className="flex items-center gap-0.5 rounded-lg bg-white/5 p-0.5">
            {[
              { id: false, label: 'Outline' },
              { id: true, label: 'Solid' },
            ].map((mode) => (
              <button
                key={mode.label}
                type="button"
                onClick={() => onFilled(mode.id)}
                className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-colors ${
                  filled === mode.id
                    ? 'bg-white/15 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <label className="mb-2 flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-2 py-1.5">
          <Search className="h-3.5 w-3.5 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the library"
            className="w-full bg-transparent text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none"
          />
        </label>

        <div className="mb-2 flex gap-1 overflow-x-auto pb-1">
          {[{ id: 'all', label: 'All' }, ...STENCIL_GROUPS].map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setGroup(entry.id)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                group === entry.id
                  ? 'bg-fuchsia-400/20 text-fuchsia-100 ring-1 ring-fuchsia-300/40'
                  : 'bg-white/5 text-slate-400 hover:text-slate-100'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="grid max-h-64 grid-cols-5 gap-1 overflow-y-auto pr-1">
          {items.map((item) => {
            const selected = stencilId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onPick(item.id)}
                title={item.label}
                aria-label={item.label}
                className={`grid aspect-square place-items-center rounded-lg transition-colors ${
                  selected
                    ? 'bg-fuchsia-400/20 text-fuchsia-100 ring-1 ring-fuchsia-300/50'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`}
              >
                <StencilPreview
                  stencil={item}
                  size={34}
                  color={selected ? '#f5d0fe' : '#cbd5e1'}
                />
              </button>
            );
          })}
          {!items.length && (
            <p className="col-span-5 py-6 text-center text-[11px] text-slate-500">
              Nothing matches that search.
            </p>
          )}
        </div>

        <p className="mt-2 flex items-center justify-between border-t border-white/8 pt-2 text-[11px] text-slate-500">
          <span>
            In use: <span className="text-slate-300">{current?.label}</span>
          </span>
          <span>{items.length} of {STENCILS.length}</span>
        </p>
      </PopoverContent>
    </Popover>
  );
}