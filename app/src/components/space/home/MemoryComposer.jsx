import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Sparkles, X } from 'lucide-react';

export default function MemoryComposer({ onAdd }) {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const submit = async (event) => {
    event.preventDefault();
    if (busy || (!text.trim() && !file)) return;
    setBusy(true);
    setError('');
    try {
      await onAdd({ text, file });
      setText('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch {
      setError('That did not save. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Remember this… the night we stayed up talking until the sun came up."
        className="w-full resize-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
      />

      {file && (
        <div className="mt-1 flex items-center gap-2 rounded-xl bg-white/5 px-2.5 py-1.5 text-[11px] text-slate-300">
          <ImagePlus className="h-3.5 w-3.5 shrink-0 text-indigo-300" />
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          <button
            type="button"
            onClick={() => {
              setFile(null);
              if (fileRef.current) fileRef.current.value = '';
            }}
            className="shrink-0 text-slate-500 hover:text-slate-200"
            aria-label="Remove photo"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {error && <p className="mt-1 text-[11px] text-rose-300">{error}</p>}

      <div className="mt-2 flex items-center justify-between gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-300 transition-colors hover:bg-white/10"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          {file ? 'Change photo' : 'Add a photo'}
        </button>
        <button
          type="submit"
          disabled={busy || (!text.trim() && !file)}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-1.5 text-xs font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Remember this
        </button>
      </div>
    </form>
  );
}