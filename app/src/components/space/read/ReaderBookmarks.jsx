import { useState } from 'react';
import { Bookmark, BookmarkPlus, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export default function ReaderBookmarks({ doc, page, suggestion, onJump, onAdd, onRemove }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');

  const bookmarks = [...(doc.bookmarks || [])].sort((a, b) => a.page - b.page);
  const here = bookmarks.find((mark) => mark.page === page);

  const save = (event) => {
    event.preventDefault();
    onAdd((label || suggestion || `Page ${page + 1}`).slice(0, 60));
    setLabel('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'grid h-8 w-8 place-items-center rounded-full border transition-colors',
            bookmarks.length
              ? 'border-indigo-400/30 bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25'
              : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
          )}
          title="Chapter bookmarks"
        >
          {here ? <Bookmark className="h-4 w-4 fill-current" /> : <Bookmark className="h-4 w-4" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 border-white/10 bg-slate-950/95 p-3 shadow-soft">
        <p className="mb-2 font-heading text-xs font-semibold text-white">Chapter bookmarks</p>

        <form onSubmit={save} className="flex items-center gap-1.5">
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={suggestion || `Name this spot · page ${page + 1}`}
            maxLength={60}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-slate-100 placeholder:text-muted-foreground focus:border-indigo-400/40 focus:outline-none"
          />
          <button
            type="submit"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-indigo-400/30 bg-indigo-500/20 text-indigo-200 transition-colors hover:bg-indigo-500/30"
            title={`Save page ${page + 1}`}
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
          </button>
        </form>

        <div className="mt-2 flex max-h-56 flex-col gap-1 overflow-y-auto">
          {!bookmarks.length && (
            <p className="px-1 py-2 text-[11px] leading-relaxed text-muted-foreground">
              Save the start of a chapter and it stays here for the two of you.
            </p>
          )}
          {bookmarks.map((mark) => (
            <div
              key={mark.id}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2 py-1.5',
                mark.page === page ? 'bg-indigo-500/15' : 'bg-white/[0.03]'
              )}
            >
              <button
                onClick={() => {
                  onJump(mark.page);
                  setOpen(false);
                }}
                className="min-w-0 flex-1 text-left"
                title={`Go to page ${mark.page + 1}`}
              >
                <span className="block truncate text-[11px] font-medium text-slate-100">{mark.label}</span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  Page {mark.page + 1}
                  {mark.author_name ? ` · ${mark.author_name}` : ''}
                </span>
              </button>
              <button
                onClick={() => onRemove(mark.id)}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-500 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
                title="Remove bookmark"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}