import { useState } from 'react';
import { Check, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const MODES = [
  {
    id: 'auto',
    label: 'Automatic',
    hint: 'Adapts to the line on its own',
  },
  {
    id: 'quality',
    label: 'High quality',
    hint: 'Full 1440p share, 1080p camera',
  },
  {
    id: 'performance',
    label: 'Performance',
    hint: 'Smaller, lighter picture for a choppy line',
  },
];

const SHORT = { auto: 'Auto', quality: 'High quality', performance: 'Performance' };

// A small menu in the call window for holding the picture at full size, or letting
// it drop so the call keeps going on a line that cannot carry it.
export default function CallQualityMenu({ quality, onChange }) {
  const [open, setOpen] = useState(false);
  const active = MODES.find((mode) => mode.id === quality) || MODES[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Picture quality"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-slate-200 transition-colors hover:bg-white/10"
        >
          <Gauge className="h-3 w-3 text-indigo-300" />
          {SHORT[active.id]}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 border-white/10 bg-slate-950/95 p-1.5">
        <p className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Picture quality
        </p>
        {MODES.map((mode) => {
          const on = mode.id === active.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                onChange(mode.id);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
                on ? 'bg-indigo-500/15' : 'hover:bg-white/5'
              )}
            >
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center">
                {on && <Check className="h-3.5 w-3.5 text-indigo-300" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-medium text-slate-100">{mode.label}</span>
                <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                  {mode.hint}
                </span>
              </span>
            </button>
          );
        })}
        <p className="mt-1.5 border-t border-white/10 px-2 pb-0.5 pt-2 text-[10px] leading-snug text-muted-foreground">
          Your voices always keep their own room, whatever the picture is doing.
        </p>
      </PopoverContent>
    </Popover>
  );
}