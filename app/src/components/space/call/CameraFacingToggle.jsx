import { cn } from '@/lib/utils';

const OPTIONS = [
  { id: 'user', label: 'Front' },
  { id: 'environment', label: 'Back' },
];

// Only shows while the camera is on — picking a camera before there is a
// picture to swap would say nothing.
export default function CameraFacingToggle({ facing, onChange }) {
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-white/5 p-0.5"
      title="Choose which camera you send"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          aria-pressed={facing === option.id}
          className={cn(
            'rounded-full px-2.5 py-1.5 text-[11px] font-medium transition-colors',
            facing === option.id
              ? 'bg-emerald-500/20 text-emerald-100'
              : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}