import { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, Layers, Pencil, Plus, Trash2 } from 'lucide-react';

export default function CanvasLayers({
  layers,
  activeId,
  onSelect,
  onAdd,
  onRemove,
  onMove,
  onToggle,
  onOpacity,
  onRename,
}) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState('');

  const startRename = (layer) => {
    onSelect(layer.id);
    setEditingId(layer.id);
    setDraft(layer.name);
  };

  const commitRename = () => {
    const name = draft.trim().slice(0, 24);
    if (editingId && name) onRename(editingId, name);
    setEditingId(null);
  };

  const top = [...layers].reverse();
  const active = layers.find((layer) => layer.id === activeId) || layers[0];

  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          <Layers className="h-3.5 w-3.5" />
          Layers
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2 py-1 text-[10px] font-semibold text-slate-200 transition-colors hover:bg-white/15"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      <div className="space-y-1">
        {top.map((layer) => {
          const selected = layer.id === activeId;
          const index = layers.findIndex((item) => item.id === layer.id);
          return (
            <div
              key={layer.id}
              className={`flex items-center gap-1 rounded-xl px-1.5 py-1 transition-colors ${
                selected ? 'bg-indigo-400/15 ring-1 ring-indigo-300/30' : 'hover:bg-white/5'
              }`}
            >
              <button
                type="button"
                onClick={() => onToggle(layer.id)}
                title={layer.hidden ? 'Show this layer' : 'Hide this layer'}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-slate-400 hover:text-slate-100"
              >
                {layer.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              {editingId === layer.id ? (
                <input
                  autoFocus
                  value={draft}
                  maxLength={24}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commitRename();
                    if (event.key === 'Escape') setEditingId(null);
                  }}
                  className="min-w-0 flex-1 rounded-md border border-indigo-300/40 bg-slate-950/70 px-1.5 py-0.5 text-xs text-white outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(layer.id)}
                  onDoubleClick={() => startRename(layer)}
                  className={`min-w-0 flex-1 truncate text-left text-xs ${
                    selected ? 'text-white' : 'text-slate-300'
                  } ${layer.hidden ? 'opacity-50' : ''}`}
                  title="Double tap to rename"
                >
                  {layer.name}
                  <span className="ml-1 text-[10px] text-slate-500">{layer.strokes.length}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => startRename(layer)}
                title="Name this layer"
                className="grid h-6 w-6 place-items-center rounded-lg text-slate-500 hover:text-slate-100"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onMove(layer.id, 1)}
                disabled={index === layers.length - 1}
                title="Bring up"
                className="grid h-6 w-6 place-items-center rounded-lg text-slate-500 hover:text-slate-100 disabled:opacity-20"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMove(layer.id, -1)}
                disabled={index === 0}
                title="Send down"
                className="grid h-6 w-6 place-items-center rounded-lg text-slate-500 hover:text-slate-100 disabled:opacity-20"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(layer.id)}
                disabled={layers.length === 1}
                title="Delete this layer"
                className="grid h-6 w-6 place-items-center rounded-lg text-slate-500 hover:text-rose-300 disabled:opacity-20"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {active && (
        <label className="mt-2 block border-t border-white/6 pt-2">
          <span className="mb-1 flex items-center justify-between text-[10px] text-slate-400">
            Layer strength
            <span className="tabular-nums text-slate-300">{Math.round(active.opacity * 100)}%</span>
          </span>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={Math.round(active.opacity * 100)}
            onChange={(event) => onOpacity(active.id, Number(event.target.value) / 100)}
            className="w-full cursor-pointer accent-indigo-400"
          />
        </label>
      )}
    </div>
  );
}