import { ListOrdered, Play, X } from 'lucide-react';
import { formatDuration } from '@/lib/spaceData';
import { linkHost } from '@/lib/videoLinks';

export default function WatchQueue({ items, onPlay, onRemove }) {
  return (
    <section className="glass-card rounded-3xl p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-heading text-sm font-semibold tracking-tight text-white">
          <ListOrdered className="h-4 w-4 text-indigo-300" />
          Up next
        </h3>
        <span className="text-xs text-muted-foreground">{items.length} queued</span>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-xs leading-relaxed text-muted-foreground">
          Nothing lined up. Queue a video and it will be waiting for both of you.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {items.map((video, index) => {
            const first = index === 0;
            return (
              <li
                key={video.id}
                className={`group flex items-center gap-3 rounded-2xl border p-2.5 transition-colors ${
                  first
                    ? 'border-indigo-400/30 bg-indigo-500/10'
                    : 'border-white/6 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                    first ? 'bg-indigo-400/20 text-indigo-100' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {index + 1}
                </span>
                <button onClick={() => onPlay(video)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium text-slate-100">{video.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {first ? 'Up next · ' : ''}
                    {video.source === 'link'
                      ? linkHost(video.url)
                      : video.duration_seconds
                        ? formatDuration(video.duration_seconds)
                        : 'your video'}
                  </p>
                </button>
                <button
                  onClick={() => onPlay(video)}
                  title="Watch this now"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-slate-300 transition-colors hover:bg-indigo-500/25 hover:text-indigo-100"
                >
                  <Play className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onRemove(video)}
                  title="Take out of the queue"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}