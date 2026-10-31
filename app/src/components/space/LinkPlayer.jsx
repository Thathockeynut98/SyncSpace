import { ExternalLink, Globe } from 'lucide-react';
import { linkHost } from '@/lib/videoLinks';

export default function LinkPlayer({ video, url }) {
  return (
    <section className="glass-card flex min-h-[18rem] flex-col items-center justify-center gap-3 rounded-3xl p-8 text-center shadow-soft">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/20">
        <Globe className="h-6 w-6 text-indigo-200" />
      </div>
      <h2 className="font-heading text-lg font-semibold tracking-tight text-white">{video.title}</h2>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        {linkHost(url)} will not play inside the room, so open it in its own tab — you both have the same link
        and can press play at the same moment.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/15 px-4 py-2 text-sm font-medium text-indigo-100 transition-colors hover:bg-indigo-500/25"
      >
        <ExternalLink className="h-4 w-4" />
        Open the link
      </a>
    </section>
  );
}