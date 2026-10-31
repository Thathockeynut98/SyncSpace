import { PAPERS } from '@/lib/canvasPaper';

export default function CanvasPaper({ value, onChange }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-3">
      <p className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        Paper
        <span
          className="h-4 w-4 rounded-full ring-1 ring-white/25"
          style={{ backgroundColor: value }}
        />
      </p>
      <div className="grid grid-cols-8 gap-1.5">
        {PAPERS.map((paper) => (
          <button
            key={paper.id}
            type="button"
            onClick={() => onChange(paper.value)}
            title={paper.label}
            className={`aspect-square w-full rounded-full transition-transform ${
              paper.value.toLowerCase() === value.toLowerCase()
                ? 'scale-110 ring-2 ring-white/80'
                : 'opacity-80 hover:scale-105 hover:opacity-100'
            }`}
            style={{ backgroundColor: paper.value }}
          />
        ))}
      </div>
      <label className="mt-2 flex cursor-pointer items-center justify-between rounded-xl border border-white/8 px-2 py-1.5 text-[11px] text-slate-300">
        Pick any colour
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-5 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
        />
      </label>
    </div>
  );
}