import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Link2, Loader2 } from 'lucide-react';
import { paginate, readingTime } from '@/lib/readingText';
import { signFile } from '@/lib/spaceData';
import ReaderBookmarks from './ReaderBookmarks';

export default function ReaderPane({ doc, page, onPage, onPages, onBookmark, onUnbookmark }) {
  const [pages, setPages] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setPages(null);
    setError('');

    if (doc.body) {
      setPages(paginate(doc.body));
      return () => {
        cancelled = true;
      };
    }

    const run = async () => {
      try {
        const url = await signFile(doc.file_uri);
        const response = await fetch(url);
        const text = await response.text();
        if (!cancelled) setPages(paginate(text));
      } catch (err) {
        if (!cancelled) setError('This text could not be opened.');
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [doc.id, doc.body, doc.file_uri]);

  useEffect(() => {
    if (pages) onPages?.(doc.id, pages.length);
  }, [pages, doc.id, onPages]);

  const total = pages?.length || 0;
  const current = Math.min(Math.max(0, page), Math.max(0, total - 1));
  const body = pages ? pages[current] : '';
  const firstLine = (body || '').split('\n').map((line) => line.trim()).find(Boolean) || '';
  const suggestion = firstLine.length > 0 && firstLine.length <= 48 ? firstLine : `Page ${current + 1}`;

  return (
    <div className="glass-card flex min-h-[22rem] flex-col rounded-3xl p-4 shadow-soft sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-heading text-base font-semibold text-white">{doc.title}</h3>
          <p className="text-[11px] text-muted-foreground">
            {pages ? `Page ${current + 1} of ${total} · about ${readingTime(body)} min` : 'Opening the page…'}
          </p>
          {doc.url && (
            <a
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 inline-flex max-w-full items-center gap-1 text-[10px] text-indigo-300 transition-colors hover:text-indigo-200"
              title="Open the original page"
            >
              <Link2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{doc.url.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <ReaderBookmarks
            doc={doc}
            page={current}
            suggestion={suggestion}
            onJump={onPage}
            onAdd={onBookmark}
            onRemove={onUnbookmark}
          />
          <button
            onClick={() => onPage(Math.max(0, current - 1))}
            disabled={!pages || current === 0}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-40"
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPage(Math.min(total - 1, current + 1))}
            disabled={!pages || current >= total - 1}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-40"
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!pages && !error && (
        <div className="grid flex-1 place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
        </div>
      )}

      {error && <p className="text-sm text-rose-200">{error}</p>}

      {pages && (
        <article className="flex-1 overflow-y-auto pr-1">
          <p className="whitespace-pre-wrap font-body text-[15px] leading-[1.85] text-slate-100">{body}</p>
        </article>
      )}

      {pages && total > 1 && (
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400 transition-all"
            style={{ width: `${((current + 1) / total) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}