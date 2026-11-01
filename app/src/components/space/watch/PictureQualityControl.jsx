import { Check, ChevronDown, Gauge } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PICTURE_QUALITIES, usePictureQuality } from '@/lib/pictureQuality';
import { cn } from '@/lib/utils';

// How sharp the film is allowed to be. Kept on this device, so one of you can save
// data while the other keeps the picture at its best.
export default function PictureQualityControl({ className }) {
  const [qualityId, setQuality] = usePictureQuality();
  const active = PICTURE_QUALITIES.find((quality) => quality.id === qualityId) || PICTURE_QUALITIES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="How sharp the picture is"
          className={cn(
            'flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/40 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition-colors hover:text-white',
            className
          )}
        >
          <Gauge className="h-3.5 w-3.5" />
          {active.label}
          <ChevronDown className="h-3 w-3 text-slate-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {PICTURE_QUALITIES.map((quality) => (
          <DropdownMenuItem
            key={quality.id}
            onSelect={() => setQuality(quality.id)}
            className="flex items-start gap-2"
          >
            <span className="mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center">
              {quality.id === active.id && <Check className="h-3.5 w-3.5" />}
            </span>
            <span className="flex flex-col">
              <span className="text-sm">{quality.label}</span>
              <span className="text-[11px] leading-tight text-muted-foreground">{quality.hint}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}