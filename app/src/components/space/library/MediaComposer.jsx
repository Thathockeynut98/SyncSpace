import { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Link2, Plus, Upload } from 'lucide-react';
import { displayName, readVideoDuration } from '@/lib/spaceData';
import { kindForFile, kindForLink, readLink } from '@/lib/mediaKinds';
import { linkTitle } from '@/lib/videoLinks';

export default function MediaComposer({ space, user, onAdded }) {
  const [busy, setBusy] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState('');
  const fileRef = useRef(null);

  const upload = async (files) => {
    const picked = Array.from(files || []);
    if (!picked.length) return;
    setBusy(true);
    setError('');
    try {
      for (const file of picked.slice(0, 10)) {
        const kind = kindForFile(file);
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
        const duration =
          kind === 'audio' || kind === 'video' ? await readVideoDuration(file) : 0;
        const record = await base44.entities.Media.create({
          space_id: space.id,
          title: (file.name || 'Untitled').replace(/\.[^.]+$/, '').slice(0, 120) || 'Untitled',
          kind,
          source: 'upload',
          file_uri,
          duration_seconds: duration,
          added_by_name: displayName(user),
          added_by_id: user.id,
        });
        onAdded(record);
      }
    } catch (err) {
      setError('That did not go through. Try a smaller file or a different format.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const addLink = async (event) => {
    event.preventDefault();
    const parsed = readLink(link);
    if (!parsed) {
      setError('That does not look like a link. Paste the whole address.');
      return;
    }
    setAddingLink(true);
    setError('');
    try {
      const record = await base44.entities.Media.create({
        space_id: space.id,
        title: linkTitle(parsed).slice(0, 120),
        kind: kindForLink(parsed),
        source: 'link',
        url: parsed.url,
        added_by_name: displayName(user),
        added_by_id: user.id,
      });
      setLink('');
      onAdded(record);
    } catch (err) {
      setError('That link could not be saved. Try again.');
    } finally {
      setAddingLink(false);
    }
  };

  return (
    <section className="glass-card rounded-3xl p-4 shadow-soft sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-sm font-semibold tracking-tight text-white">
            Put something in
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Songs, videos, pictures, links, files — kept for whenever you want it again.
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          accept="audio/*,video/*,image/*,.pdf,.epub,.txt,.doc,.docx"
          onChange={(event) => upload(event.target.files)}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? 'Uploading…' : 'Upload files'}
        </button>
      </div>

      <form onSubmit={addLink} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="Or paste a link — a song, a video, an article"
            className="w-full rounded-xl border border-white/10 bg-slate-950/40 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-400/50"
          />
        </div>
        <button
          type="submit"
          disabled={addingLink || !link.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-3 py-2 text-sm font-medium text-indigo-100 transition-colors hover:bg-indigo-500/25 disabled:opacity-50"
        >
          {addingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Save link
        </button>
      </form>

      {error && (
        <p className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">
        Uploaded files stay private to the two of you (stored privately).
      </p>
    </section>
  );
}