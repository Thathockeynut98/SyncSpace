import { useEffect, useRef } from 'react';
import { drawTipSample } from '@/lib/canvasTips';

export default function TipSwatch({ id, label, color, active, onClick }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    drawTipSample(canvas.getContext('2d'), id, color, canvas.width, canvas.height);
  }, [id, color]);

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`overflow-hidden rounded-lg border text-left transition-colors ${
        active
          ? 'border-fuchsia-300/60 bg-fuchsia-400/15'
          : 'border-white/8 bg-white/[0.02] hover:border-white/20'
      }`}
    >
      <canvas ref={ref} width={64} height={28} className="block h-7 w-full" />
      <span className="block truncate px-1 pb-0.5 text-[9px] text-slate-400">{label}</span>
    </button>
  );
}