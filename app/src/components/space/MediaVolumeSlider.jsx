import { useEffect, useState } from 'react';
import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { getMediaVolume, setMediaVolume, subscribeMediaVolume } from '@/lib/mediaVolume';
import { cn } from '@/lib/utils';

// One slider for every sound that plays in the space, so what you set here holds
// for the songs, the stations and the sleep soundtrack alike.
export default function MediaVolumeSlider({ className }) {
  const [level, setLevel] = useState(getMediaVolume);

  useEffect(() => subscribeMediaVolume(setLevel), []);

  const Icon = level === 0 ? VolumeX : level < 0.5 ? Volume1 : Volume2;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        onClick={() => setMediaVolume(level === 0 ? 0.85 : 0)}
        aria-label={level === 0 ? 'Turn the sound back on' : 'Mute the sound'}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
      <input
        type="range"
        min="0"
        max="100"
        value={Math.round(level * 100)}
        onChange={(event) => setMediaVolume(Number(event.target.value) / 100)}
        aria-label="How loud the media plays"
        className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/12 accent-violet-400 sm:w-20"
      />
    </div>
  );
}