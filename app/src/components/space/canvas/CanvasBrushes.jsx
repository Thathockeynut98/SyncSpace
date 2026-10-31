import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Brush } from 'lucide-react';
import { TOOLS } from '@/lib/canvasTools';

const PICKER_IDS = [
  'pen',
  'pencil',
  'marker',
  'calligraphy',
  'charcoal',
  'watercolor',
  'neon',
  'rainbow',
];
const PICKER = TOOLS.filter((item) => PICKER_IDS.includes(item.id));

export default function CanvasBrushes({ tool, onTool }) {
  const current = PICKER.find((item) => item.id === tool);
  const CurrentIcon = current ? current.icon : Brush;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Brushes"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-2.5 text-[11px] font-medium text-slate-100 transition-colors hover:bg-white/10"
        >
          <CurrentIcon className="h-4 w-4" />
          <span className="hidden md:inline">{current ? current.label : 'Brushes'}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[15rem] border-white/10 bg-slate-950/95 p-2.5 text-slate-200 shadow-soft backdrop-blur-xl"
      >
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Brushes
        </p>
        <div className="grid grid-cols-2 gap-1">
          {PICKER.map((item) => {
            const Icon = item.icon;
            const active = item.id === tool;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTool(item.id)}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors ${
                  active
                    ? 'bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-glow'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}