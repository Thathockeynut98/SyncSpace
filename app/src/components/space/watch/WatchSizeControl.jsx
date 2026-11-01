import { Maximize2, MonitorPlay, RectangleHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WATCH_SIZES, useWatchSize } from '@/lib/watchSize';

const ICONS = {
  standard: RectangleHorizontal,
  large: Maximize2,
  cinema: MonitorPlay,
};

// How much of the screen the film is allowed to take. Kept on this device, so one
// of you can fill a laptop while the other keeps the list in reach.
export default function WatchSizeControl() {
  const [size, setSize] = useWatchSize();

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Video size</span>
      <div className="inline-flex items-center gap-1 rounded-2xl border border-white/8 bg-white/5 p-1">
        {WATCH_SIZES.map((option) => {
          const Icon = ICONS[option.id];
          const active = size === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSize(option.id)}
              title={option.hint}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-medium transition-colors',
                active
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-glow'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}