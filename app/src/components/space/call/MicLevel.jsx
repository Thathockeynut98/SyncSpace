import { cn } from '@/lib/utils';

// A thin live bar showing how loud the mic is right now, after input sensitivity,
// so the sensitivity and gate sliders have something real to be judged against.
export default function MicLevel({ level, muted }) {
  const percent = Math.round(Math.min(1, Math.max(0, level)) * 100);

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-100 ease-out',
          muted ? 'bg-white/20' : percent > 78 ? 'bg-rose-400' : percent > 35 ? 'bg-emerald-400' : 'bg-indigo-400'
        )}
        style={{ width: `${muted ? 0 : percent}%` }}
      />
    </div>
  );
}