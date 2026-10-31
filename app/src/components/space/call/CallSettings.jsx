import { Gauge, HeadphoneOff, Headphones, MicOff, Sparkles, SlidersHorizontal } from 'lucide-react';
import { VOICE_PRESETS } from '@/lib/voiceChain';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import MicLevel from './MicLevel';
import MicTest from './MicTest';

function slider(label, min, max, step, value, onChange) {
  return (
    <input
      aria-label={label}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full cursor-pointer accent-indigo-400"
    />
  );
}

export default function CallSettings({ voice, level, muted, deafened, onChange, onDeafen }) {
  const bass = Number.isFinite(voice.bass) ? voice.bass : 2;
  const isolation = voice.isolation !== false;
  const gateOn = voice.gateOn !== false;
  const gate = Number.isFinite(voice.gate) ? voice.gate : -48;
  const sensitivity = Number.isFinite(voice.sensitivity) ? voice.sensitivity : 100;
  const suppressOn = voice.suppressOn !== false;
  const suppress = Number.isFinite(voice.suppress) ? voice.suppress : 55;
  const preset = typeof voice.preset === 'string' && voice.preset in VOICE_PRESETS ? voice.preset : 'natural';
  const autoLevel = voice.autoLevel !== false;

  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-left">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-300" />
        <p className="text-xs font-semibold text-slate-100">Voice settings</p>
        <span className="ml-auto text-[10px] text-muted-foreground">Saved on this device</span>
      </div>

      <div className="mt-3">
        <span className="text-[11px] font-medium text-slate-200">Voice profile</span>
        <div className="mt-1.5 grid grid-cols-4 gap-1.5">
          {Object.entries(VOICE_PRESETS).map(([id, profile]) => (
            <button
              key={id}
              type="button"
              onClick={() =>
                onChange({ preset: id, bass: profile.bass, clarity: profile.clarity, air: profile.air })
              }
              className={cn(
                'rounded-lg border px-1 py-1.5 text-[10px] font-medium transition',
                preset === id
                  ? 'border-indigo-300/40 bg-indigo-400/15 text-indigo-100'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/[0.08]'
              )}
            >
              {profile.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-medium text-slate-200">Input sensitivity</span>
          <span className="text-[10px] text-muted-foreground">{sensitivity}%</span>
        </div>
        {slider('Input sensitivity', 0, 200, 5, sensitivity, (next) => onChange({ sensitivity: next }))}
        <MicLevel level={level} muted={muted} />
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          How hard your mic is driven before anything else. Turn it up for a quiet headset, down if your voice
          distorts or the room comes through too loud.
        </p>
      </div>

      <div className="mt-3 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
        <Gauge className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', autoLevel ? 'text-indigo-300' : 'text-slate-500')} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-slate-200">Auto level</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
            {autoLevel
              ? 'Your voice is held at one steady distance, so a whisper across the room arrives as clearly as a voice at the mic.'
              : 'Off. Your voice arrives exactly as loud as it is in the room.'}
          </p>
        </div>
        <Switch
          checked={autoLevel}
          onCheckedChange={(next) => onChange({ autoLevel: next })}
          aria-label="Auto level"
        />
      </div>

      <MicTest voice={voice} />

      <div className="mt-3 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
        <Sparkles
          className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', isolation ? 'text-indigo-300' : 'text-slate-500')}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-slate-200">Voice isolation</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
            {isolation
              ? 'Only the range of your voice travels. Fans, traffic and hiss stay out.'
              : 'Off. Everything your mic hears is sent, room and all.'}
          </p>
        </div>
        <Switch
          checked={isolation}
          onCheckedChange={(next) => onChange({ isolation: next })}
          aria-label="Voice isolation"
        />
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-200">Noise suppression</span>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {suppressOn ? `${suppress}%` : 'Off'}
          </span>
          <Switch
            checked={suppressOn}
            onCheckedChange={(next) => onChange({ suppressOn: next })}
            aria-label="Noise suppression"
          />
        </div>
        <div className={suppressOn ? undefined : 'opacity-40'}>
          {slider('Noise suppression strength', 0, 100, 5, suppress, (next) => onChange({ suppress: next }))}
        </div>
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Eases fan hum, keyboards and room hiss down under your voice instead of cutting it off, so it never
          sounds choppy.
        </p>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-200">Noise gate</span>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {gateOn ? `${gate} dB` : 'Off'}
          </span>
          <Switch
            checked={gateOn}
            onCheckedChange={(next) => onChange({ gateOn: next })}
            aria-label="Noise gate"
          />
        </div>
        <div className={gateOn ? undefined : 'opacity-40'}>
          {slider('Noise gate level', -70, -20, 1, gate, (next) => onChange({ gate: next }))}
        </div>
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Anything quieter than this never leaves your mic. Raise it for a noisy room, lower it if your words
          keep getting cut off.
        </p>
      </div>

      <div className="mt-3.5 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-medium text-slate-200">Their volume</span>
          <span className="text-[10px] text-muted-foreground">
            {voice.their === 0 ? 'Silent' : `${voice.their.toFixed(1)}×`}
          </span>
        </div>
        {slider('Their volume', 0, 2, 0.1, voice.their, (their) => onChange({ their }))}
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          How loud they arrive on your end. Turn them up past 1× to lift a soft connection, or all the way down
          to a whisper.
        </p>
      </div>

      <div className="mt-3.5 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-medium text-slate-200">Mic loudness</span>
          <span className="text-[10px] text-muted-foreground">{voice.loudness.toFixed(1)}×</span>
        </div>
        {slider('Mic loudness', 0.5, 3, 0.1, voice.loudness, (loudness) => onChange({ loudness }))}
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          How loud your voice arrives on their end. The bar moves with your mic right now.
        </p>
      </div>

      <div className="mt-3.5 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-medium text-slate-200">Bass</span>
          <span className="text-[10px] text-muted-foreground">
            {bass === 0 ? 'Flat' : `${bass > 0 ? '+' : ''}${bass.toFixed(1)} dB`}
          </span>
        </div>
        {slider('Bass', -12, 12, 0.5, voice.bass, (bassValue) => onChange({ bass: bassValue }))}
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Body in your voice before it reaches them. Turn it down to stay thin and clear, up for a deeper,
          warmer sound.
        </p>
      </div>

      <button
        type="button"
        onClick={onDeafen}
        className={cn(
          'mt-4 flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors',
          deafened
            ? 'border-rose-400/30 bg-rose-500/15 text-rose-100'
            : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
        )}
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10">
          {deafened ? <HeadphoneOff className="h-3.5 w-3.5" /> : <Headphones className="h-3.5 w-3.5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold">
            {deafened ? 'Deafened' : 'Deafen for privacy'}
          </span>
          <span className="mt-0.5 block text-[10px] leading-relaxed text-muted-foreground">
            {deafened
              ? 'You cannot hear them and your mic is off.'
              : 'Stop hearing them and mute your mic, without leaving the call.'}
          </span>
        </span>
        {muted && !deafened && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[9px] text-rose-200">
            <MicOff className="h-2.5 w-2.5" />
            Mic off
          </span>
        )}
      </button>
    </div>
  );
}