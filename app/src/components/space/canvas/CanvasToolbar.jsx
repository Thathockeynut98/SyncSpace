import {
  Download,
  Eraser,
  Expand,
  FlipHorizontal2,
  FlipVertical2,
  Grid2x2,
  PaintBucket,
  PaintRoller,
  Redo2,
  Shrink,
  SprayCan,
  Stamp,
  Trash2,
  Undo2,
} from 'lucide-react';
import CanvasBrushes from './CanvasBrushes';
import CanvasStencils from './CanvasStencils';

const BAR_TOOLS = [
  { id: 'airbrush', label: 'Airbrush', icon: SprayCan },
  { id: 'roller', label: 'Roller', icon: PaintRoller },
  { id: 'eraser', label: 'Eraser', icon: Eraser },
  { id: 'fill', label: 'Fill bucket', icon: PaintBucket },
  { id: 'stamp', label: 'Stamps', icon: Stamp },
];

const MIRRORS = [
  { id: 'off', label: 'No mirror', icon: null },
  { id: 'v', label: 'Left and right', icon: FlipHorizontal2 },
  { id: 'h', label: 'Top and bottom', icon: FlipVertical2 },
  { id: 'quad', label: 'Four ways', icon: Grid2x2 },
];

function Tip({ label, children, className, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={className}
    >
      {children}
    </button>
  );
}

export default function CanvasToolbar({
  tool,
  onTool,
  mirror,
  onMirror,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onClear,
  stencilId,
  onStencil,
  stencilFilled,
  onStencilFilled,
  tall,
  onTall,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/6 bg-white/[0.03] px-2 py-2">
      <div className="flex flex-1 items-center gap-1 overflow-x-auto">
        <CanvasBrushes tool={tool} onTool={onTool} />

        {BAR_TOOLS.map((item) => {
          const Icon = item.icon;
          const active = tool === item.id;
          return (
            <Tip
              key={item.id}
              label={item.label}
              onClick={() => onTool(item.id)}
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors ${
                active
                  ? 'bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-glow'
                  : 'text-slate-400 hover:bg-white/8 hover:text-slate-100'
              }`}
            >
              <Icon className="h-4 w-4" />
            </Tip>
          );
        })}

        <span className="mx-1 h-6 w-px shrink-0 bg-white/10" />

        <CanvasStencils
          stencilId={stencilId}
          onPick={onStencil}
          filled={stencilFilled}
          onFilled={onStencilFilled}
          active={tool === 'stencil'}
        />
      </div>

      <Tip
        label={tall ? 'Back to the usual page' : 'More room to draw'}
        onClick={onTall}
        className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium transition-colors ${
          tall
            ? 'bg-indigo-400/20 text-indigo-200 ring-1 ring-indigo-300/40'
            : 'text-slate-400 hover:bg-white/8 hover:text-slate-100'
        }`}
      >
        {tall ? <Shrink className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{tall ? 'Usual page' : 'More room'}</span>
      </Tip>

      <span className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />

      <div className="flex items-center gap-1">
        {MIRRORS.map((item) => {
          const Icon = item.icon;
          const active = mirror === item.id;
          return (
            <Tip
              key={item.id}
              label={item.label}
              onClick={() => onMirror(item.id)}
              className={`grid h-8 w-8 place-items-center rounded-lg text-[10px] font-semibold transition-colors ${
                active
                  ? 'bg-fuchsia-400/20 text-fuchsia-200 ring-1 ring-fuchsia-300/40'
                  : 'text-slate-400 hover:bg-white/8 hover:text-slate-100'
              }`}
            >
              {Icon ? <Icon className="h-4 w-4" /> : '1x'}
            </Tip>
          );
        })}
      </div>

      <span className="mx-1 h-6 w-px bg-white/10" />

      <div className="flex items-center gap-1">
        <Tip
          label="Undo"
          onClick={onUndo}
          disabled={!canUndo}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
        >
          <Undo2 className="h-4 w-4" />
        </Tip>
        <Tip
          label="Redo"
          onClick={onRedo}
          disabled={!canRedo}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
        >
          <Redo2 className="h-4 w-4" />
        </Tip>
        <Tip
          label="Save to this device"
          onClick={onSave}
          className="grid h-8 w-8 place-items-center rounded-lg text-emerald-300 transition-colors hover:bg-emerald-400/15"
        >
          <Download className="h-4 w-4" />
        </Tip>
        <Tip
          label="Start the page over"
          onClick={onClear}
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
        >
          <Trash2 className="h-4 w-4" />
        </Tip>
      </div>
    </div>
  );
}