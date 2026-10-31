import { FileText, ImageIcon, Link2, Music2, Play, Trash2 } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { KIND_LABEL } from '@/lib/mediaKinds';
import { formatDuration } from '@/lib/spaceData';
import { linkHost } from '@/lib/videoLinks';

const ICONS = {
  audio: Music2,
  video: Play,
  image: ImageIcon,
  link: Link2,
  file: FileText,
};

function Equalizer() {
  return (
    <span className="flex h-4 items-end gap-[3px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] animate-waveform rounded-full bg-indigo-300"
          style={{ height: '100%', animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  );
}

export default function MediaTile({ item, thumbUrl, mine, active, playing, onOpen, onRemove }) {
  const Icon = ICONS[item.kind] || FileText;
  const meta = [
    KIND_LABEL[item.kind] || 'File',
    item.duration_seconds ? formatDuration(item.duration_seconds) : null,
    item.source === 'link' ? linkHost(item.url) : null,
    item.added_by_name || 'one of you',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className={`group overflow-hidden rounded-2xl border transition-colors hover:bg-white/[0.06] ${
        active
          ? 'border-indigo-400/40 bg-indigo-500/10'
          : 'border-white/6 bg-white/[0.03] hover:border-indigo-400/25'
      }`}
    >
      <button onClick={() => onOpen(item)} className="block w-full text-left">
        <div className="relative grid aspect-[16/10] place-items-center overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
          {item.kind === 'image' && thumbUrl ? (
            <Image src={thumbUrl} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/20">
              {active && playing ? <Equalizer /> : <Icon className="h-5 w-5 text-indigo-200" />}
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="truncate text-sm font-medium text-slate-100">{item.title}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{meta}</p>
        </div>
      </button>
      {mine && (
        <div className="flex justify-end px-3 pb-2">
          <button
            onClick={() => onRemove(item)}
            className="grid h-7 w-7 place-items-center rounded-full bg-white/8 text-slate-300 transition-colors hover:bg-rose-500/30 hover:text-white"
            title="Remove from the library"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}