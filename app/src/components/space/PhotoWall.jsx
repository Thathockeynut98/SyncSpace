import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, ImagePlus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { displayName, signFile } from '@/lib/spaceData';
import { decryptText, encryptText, spaceKey } from '@/lib/spaceCrypto';
import { monthYear } from '@/lib/time';

export default function PhotoWall({ space, user }) {
  const [photos, setPhotos] = useState([]);
  const [urls, setUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState('');
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    const page = await base44.entities.Photo.filter(
      { space_id: space.id },
      { sort: '-created_date', limit: 80 }
    );
    const items = page.items;
    const key = await spaceKey(space);
    const opened = await Promise.all(
      items.map(async (item) => {
        if (!item.cipher || !item.iv) return { ...item, body: item.caption || '' };
        try {
          return { ...item, body: await decryptText(key, item.cipher, item.iv) };
        } catch (err) {
          return { ...item, body: 'Could not be opened here.' };
        }
      })
    );
    setPhotos(opened);
    const signed = await Promise.all(
      items.map(async (item) => {
        try {
          return [item.id, await signFile(item.file_uri)];
        } catch (err) {
          return [item.id, null];
        }
      })
    );
    setUrls(Object.fromEntries(signed));
    setLoading(false);
  }, [space]);

  useEffect(() => {
    load();
    return base44.entities.Photo.subscribe((event) => {
      if (!event?.data || event.data.space_id === space.id) load();
    });
  }, [load, space.id]);

  const upload = async (files) => {
    const picked = Array.from(files || []);
    if (!picked.length) return;
    setBusy(true);
    setError('');
    try {
      for (const file of picked.slice(0, 12)) {
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
        await base44.entities.Photo.create({
          space_id: space.id,
          file_uri,
          added_by_name: displayName(user),
          added_by_id: user.id,
        });
      }
      await load();
    } catch (err) {
      setError('Some of those did not upload. Try a smaller batch.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const remove = async (photo) => {
    await base44.entities.Photo.delete(photo.id);
    setPhotos((previous) => previous.filter((item) => item.id !== photo.id));
  };

  const saveCaption = async (photo) => {
    const caption = draft.trim().slice(0, 200);
    setEditingId(null);
    const key = await spaceKey(space);
    const { cipher, iv } = await encryptText(key, caption);
    await base44.entities.Photo.update(photo.id, { cipher, iv, caption: '' });
    setPhotos((previous) =>
      previous.map((item) => (item.id === photo.id ? { ...item, body: caption, cipher, iv } : item))
    );
  };

  return (
    <section className="glass-card rounded-3xl p-4 shadow-soft sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight text-white">Our wall</h2>
          <p className="text-xs text-muted-foreground">
            {loading
              ? 'Bringing them back…'
              : `${photos.length} ${photos.length === 1 ? 'moment' : 'moments'}, every one of them ours`}
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => upload(event.target.files)}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {busy ? 'Uploading…' : 'Add photos'}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      )}

      <p className="mb-4 text-[11px] text-muted-foreground">
        Photos stay private to the two of you (stored privately), and the words under them are
        scrambled before they are saved.
      </p>

      {photos.length > 0 && (
        <div className="columns-2 gap-3 [column-fill:_balance] md:columns-3">
          {photos.map((photo) => (
            <figure
              key={photo.id}
              className="group relative mb-3 break-inside-avoid overflow-hidden rounded-2xl border border-white/6"
            >
              {urls[photo.id] ? (
                <Image
                  src={urls[photo.id]}
                  alt={photo.body || 'A moment of ours'}
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              ) : (
                <div className="grid aspect-square place-items-center bg-white/[0.03]">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent p-3 pt-10">
                {editingId === photo.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => event.key === 'Enter' && saveCaption(photo)}
                      placeholder="A few words"
                      className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-2 py-1 text-xs text-white outline-none"
                    />
                    <button
                      onClick={() => saveCaption(photo)}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/15 text-white"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-white">
                        {photo.body || <span className="text-slate-400">Add a few words</span>}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {monthYear(photo.created_date)}{' '}
                        · {photo.added_by_name || 'Them'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => {
                          setEditingId(photo.id);
                          setDraft(photo.body || '');
                        }}
                        className="grid h-7 w-7 place-items-center rounded-full bg-white/12 text-white transition-colors hover:bg-white/25"
                        title="Edit caption"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {photo.added_by_id === user.id && (
                        <button
                          onClick={() => remove(photo)}
                          className="grid h-7 w-7 place-items-center rounded-full bg-white/12 text-white transition-colors hover:bg-rose-500/40"
                          title="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </figure>
          ))}
        </div>
      )}

      {!loading && !photos.length && (
        <button
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-14 transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/5"
        >
          <ImagePlus className="h-6 w-6 text-indigo-300" />
          <span className="text-sm font-medium text-slate-200">Put the first photo up</span>
          <span className="text-xs text-muted-foreground">
            Everything you add lands on their wall too
          </span>
        </button>
      )}
    </section>
  );
}