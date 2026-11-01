import { Headphones, Mic, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMicTest } from '@/lib/useMicTest';
import MicLevel from './MicLevel';

// A private rehearsal: your mic is played back on this device through the exact
// chain the call uses, so you can tune the sliders by ear before you say hello.
export default function MicTest({ voice }) {
  const { testing, level, error, start, stop } = useMicTest(voice);

  return (
    <div className="mt-3 rounded-xl border border-indigo-400/20 bg-indigo-500/[0.07] p-3">
      <div className="flex items-center gap-2">
        <Mic className={cn('h-3.5 w-3.5', testing ? 'text-emerald-300' : 'text-indigo-300')} />
        <p className="text-[11px] font-semibold text-slate-100">Test your mic</p>
        <button
          type="button"
          onClick={testing ? stop : start}
          className={cn(
            'ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors',
            testing
              ? 'bg-rose-500/20 text-rose-100 hover:bg-rose-500/30'
              : 'bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white hover:opacity-90'
          )}
        >
          {testing ? <Square className="h-2.5 w-2.5" /> : <Headphones className="h-3 w-3" />}
          {testing ? 'Stop' : 'Hear my mic'}
        </button>
      </div>

      <div className="mt-2.5">
        <MicLevel level={level} muted={false} />
      </div>

      {error ? (
        <p className="mt-2 text-[10px] leading-relaxed text-rose-200">{error}</p>
      ) : (
        <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground">
          <Headphones className="mt-0.5 h-3 w-3 shrink-0 text-indigo-300/70" />
          <span>
            {testing
              ? 'You are hearing yourself through the same chain they will. Move the sliders and hear each one land.'
              : 'Plays your voice back on this device only, nothing is sent. Wear headphones so the mic does not pick the playback back up.'}
          </span>
        </p>
      )}
    </div>
  );
}