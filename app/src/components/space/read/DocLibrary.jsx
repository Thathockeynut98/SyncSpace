import { useRef, useState } from 'react';
import { BookOpen, Link2, Loader2, Plus, Upload, X } from 'lucide-react';
import ReadingListItem from './ReadingListItem';

export default function DocLibrary({ docs, activeId, onPick, onAdd, onAddLink, busy, loading, error }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const fileRef = useRef(null);

  const submitLink = () => {
    if (!link.trim()) return;
    onAddLink({ url: link.trim(), title: title.trim() });
    setLink('');
    setTitle('');
    setOpen(false);
  };

  const submitText = () => {
    if (!text.trim()) return;
    onAdd({ title: title.trim() || 'Our read', text });
    setText('');
    setTitle('');
    setOpen(false);
  };

  const submitFile = (file) => {
    if (!file) return;
    onAdd({ title: (title.trim() || file.name.replace(/\.txt$/i, '')).slice(0, 80), file });
    setTitle('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <section className="glass-card rounded-3xl p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="font-heading text-sm font-semibold text-white">Reading list</h3>
          <p className="text-[11px] text-muted-foreground">
            {loading
              ? 'Looking…'
              : `${docs.length} ${docs.length === 1 ? 'read' : 'reads'} you're in together`}
          </p>
        </div>
        <button
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-200 transition-colors hover:bg-white/10"
        >
          {open ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {open ? 'Close' : 'Add'}
        </button>
      </div>

      {open && (
        <div className="mb-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What is it called?"
            className="mb-2 w-full rounded-lg border border-white/12 bg-slate-950/60 px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-slate-500"
          />
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={5}
            placeholder="Paste a chapter, a poem, a letter…"
            className="mb-2 w-full resize-none rounded-lg border border-white/12 bg-slate-950/60 px-2.5 py-2 text-xs leading-relaxed text-white outline-none placeholder:text-slate-500"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={submitText}
              disabled={busy || !text.trim()}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookOpen className="h-3.5 w-3.5" />}
              Start reading
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(event) => submitFile(event.target.files?.[0])}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              .txt
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={link}
              onChange={(event) => setLink(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitLink();
              }}
              placeholder="Paste a link to read together…"
              className="min-w-0 flex-1 rounded-lg border border-white/12 bg-slate-950/60 px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-slate-500"
            />
            <button
              onClick={submitLink}
              disabled={busy || !link.trim()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
              Link
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mb-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-2.5 py-1.5 text-[11px] text-rose-200">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        {docs.map((doc) => (
          <ReadingListItem
            key={doc.id}
            doc={doc}
            active={doc.id === activeId}
            onPick={onPick}
          />
        ))}
        {!loading && !docs.length && (
          <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-[11px] text-muted-foreground">
            Nothing on the shelf yet. Add a chapter for tonight.
          </p>
        )}
      </div>
    </section>

  );
}