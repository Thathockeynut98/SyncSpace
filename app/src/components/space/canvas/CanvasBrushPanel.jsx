import { useEffect, useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { PALETTE, STAMPS } from '@/lib/canvasPaint';
import { BUILT_IN_TIPS } from '@/lib/canvasTips';
import TipSwatch from './TipSwatch';

function Slider({ label, value, display, min, max, step, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
        {label}
        <span className="tabular-nums text-slate-300">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full cursor-pointer accent-indigo-400"
      />
    </label>
  );
}

export default function CanvasBrushPanel({
  color,
  onColor,
  width,
  onWidth,
  opacity,
  onOpacity,
  stamp,
  onStamp,
  showStamps,
  stencilSize,
  onStencilSize,
  showStencils,
  tipId,
  onTip,
  textures,
  onUpload,
  uploading,
  showTips,
}) {
  const fileRef = useRef(null);
  const [recent, setRecent] = useState([]);

  // Every colour the brush ends up with gets remembered, however it was picked.
  useEffect(() => {
    if (!color) return;
    setRecent((prev) =>
      [color, ...prev.filter((item) => item.toLowerCase() !== color.toLowerCase())].slice(0, 10)
    );
  }, [color]);

  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-3">
      <p className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        Colour
        <span
          className="h-4 w-4 rounded-full ring-1 ring-white/25"
          style={{ backgroundColor: color }}
        />
      </p>
      <div className="grid grid-cols-10 gap-1.5">
        {PALETTE.map((tone) => (
          <button
            key={tone}
            type="button"
            onClick={() => onColor(tone)}
            title={tone}
            className={`aspect-square w-full rounded-full transition-transform ${
              tone.toLowerCase() === color.toLowerCase()
                ? 'scale-110 ring-2 ring-white/80'
                : 'opacity-80 hover:scale-105 hover:opacity-100'
            }`}
            style={{ backgroundColor: tone }}
          />
        ))}
      </div>
      <label className="mt-2 flex cursor-pointer items-center justify-between rounded-xl border border-white/8 px-2 py-1.5 text-[11px] text-slate-300">
        Pick any colour
        <input
          type="color"
          value={color}
          onChange={(event) => onColor(event.target.value)}
          className="h-5 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
        />
      </label>

      <div className="mt-3 border-t border-white/8 pt-2.5">
        <p className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-slate-400">Recent colours</p>
        <div className="flex flex-wrap gap-1.5">
          {(recent.length ? recent : [color]).map((tone) => (
            <button
              key={tone}
              type="button"
              onClick={() => onColor(tone)}
              title={tone}
              className={`h-6 w-6 rounded-full transition-transform ${
                tone.toLowerCase() === color.toLowerCase()
                  ? 'scale-110 ring-2 ring-white/80'
                  : 'opacity-80 hover:scale-105 hover:opacity-100'
              }`}
              style={{ backgroundColor: tone }}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        <Slider
          label="Brush size"
          value={width}
          display={`${width}px`}
          min={1}
          max={120}
          step={1}
          onChange={onWidth}
        />
        <Slider
          label="Opacity"
          value={Math.round(opacity * 100)}
          display={`${Math.round(opacity * 100)}%`}
          min={5}
          max={100}
          step={5}
          onChange={(value) => onOpacity(value / 100)}
        />
        {showStencils && (
          <Slider
            label="Stencil size"
            value={stencilSize}
            display={`${stencilSize}px`}
            min={80}
            max={620}
            step={20}
            onChange={onStencilSize}
          />
        )}
      </div>

      {showTips && (
        <div className="mt-3 border-t border-white/8 pt-2.5">
          <p className="mb-1.5 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-slate-400">
            Brush tip
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1 rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-fuchsia-200 transition-colors hover:bg-fuchsia-400/20 disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              {uploading ? 'Adding' : 'Upload'}
            </button>
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) onUpload(file);
            }}
          />
          <div className="grid grid-cols-4 gap-1">
            {BUILT_IN_TIPS.map((item) => (
              <TipSwatch
                key={item.id}
                id={item.id}
                label={item.label}
                color={color}
                active={tipId === item.id}
                onClick={() => onTip(item.id)}
              />
            ))}
            {textures.map((item) => (
              <TipSwatch
                key={item.id}
                id={item.id}
                label={item.name}
                color={color}
                active={tipId === item.id}
                onClick={() => onTip(item.id)}
              />
            ))}
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
            {textures.length
              ? 'Your own textures paint in the colour you pick.'
              : 'Upload a png of a texture to paint with it.'}
          </p>
        </div>
      )}

      {showStencils && (
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          Tap the page to place it, then pour colour inside the lines.
        </p>
      )}

      {showStamps && (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-slate-400">Stamp</p>
          <div className="grid grid-cols-6 gap-1">
            {STAMPS.map((glyph) => (
              <button
                key={glyph}
                type="button"
                onClick={() => onStamp(glyph)}
                className={`grid aspect-square place-items-center rounded-lg text-base transition-colors ${
                  glyph === stamp ? 'bg-fuchsia-400/20 ring-1 ring-fuchsia-300/50' : 'hover:bg-white/8'
                }`}
              >
                {glyph}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}