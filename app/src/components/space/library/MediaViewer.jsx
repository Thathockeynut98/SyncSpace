import { ExternalLink, Loader2, X } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { KIND_LABEL } from '@/lib/mediaKinds';
import { linkHost } from '@/lib/videoLinks';

function MediaBody({ item, url }) {
  if (!url) {
    return (
      <div className="grid min-h-[14rem] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-300" />
      </div>
    );
  }

  if (item.kind === 'audio') {
    return (
      <div className="flex min-h-[10rem] flex-col items-center justify-center gap-4 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/10 p-6">
        <div className="flex h-10 items-end gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="w-1.5 animate-waveform rounded-full bg-indigo-300"
              style={{ height: '100%', animationDelay: `${i * 0.14}s` }}
            />
          ))}
        </div>
        <audio src={url} controls autoPlay className="w-full max-w-md" />
      </div>
    );
  }

  if (item.kind === 'video') {
    return <video src={url} controls autoPlay className="w-full rounded-2xl bg-black" />;
  }

  if (item.kind === 'image') {
    return (
      <Image src={url} alt={item.title} fittingType="fit" className="max-h-[70vh] w-full rounded-2xl" />
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/[0.04] p-8 text-center">
      <p className="text-sm text-muted-foreground">
        {linkHost(url)} opens in its own tab — you both keep the same link.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/15 px-4 py-2 text-sm font-medium text-indigo-100 transition-colors hover:bg-indigo-500/25"
      >
        <ExternalLink className="h-4 w-4" />
        Open it
      </a>
    </div>
  );
}

export default function MediaViewer({ item, url, onClose }) {
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 p-4 shadow-soft sm:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-heading text-base font-semibold tracking-tight text-white">
              {item.title}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {KIND_LABEL[item.kind] || 'File'}
              {item.added_by_name ? ` · ${item.added_by_name}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/8 text-slate-300 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <MediaBody item={item} url={url} />
      </div>
    </div>
  );
}