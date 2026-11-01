import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { LibraryBig, Search } from 'lucide-react';
import MediaComposer from './MediaComposer';
import MediaTile from './MediaTile';
import MediaViewer from './MediaViewer';
import LibraryNowPlaying from './LibraryNowPlaying';
import MediaVolumeSlider from '@/components/space/MediaVolumeSlider';
import { playItem } from '@/lib/libraryPlayer';
import { useLibraryPlayer } from '@/lib/useLibraryPlayer';
import { signFile } from '@/lib/spaceData';

const FILTERS = [
  { id: 'all', label: 'Everything' },
  { id: 'audio', label: 'Songs' },
  { id: 'video', label: 'Videos' },
  { id: 'image', label: 'Pictures' },
  { id: 'link', label: 'Links' },
  { id: 'file', label: 'Files' },
];

export default function MediaLibrary({ space, user }) {
  const [items, setItems] = useState([]);
  const [urls, setUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);
  const player = useLibraryPlayer();

  const load = useCallback(async () => {
    const page = await base44.entities.Media.filter(
      { space_id: space.id },
      { sort: '-created_date', limit: 100 }
    );
    setItems(page.items);
    setLoading(false);
  }, [space.id]);

  useEffect(() => {
    load();
    return base44.entities.Media.subscribe((event) => {
      if (!event?.data || event.data.space_id === space.id) load();
    });
  }, [load, space.id]);

  // Picture thumbnails need a signed link up front; everything else is signed when opened.
  useEffect(() => {
    const missing = items.filter(
      (item) => item.kind === 'image' && item.source === 'upload' && !urls[item.id]
    );
    if (!missing.length) return;
    let cancelled = false;
    (async () => {
      const signed = await Promise.all(
        missing.map(async (item) => {
          try {
            return [item.id, await signFile(item.file_uri)];
          } catch (err) {
            return [item.id, null];
          }
        })
      );
      if (!cancelled) setUrls((previous) => ({ ...previous, ...Object.fromEntries(signed) }));
    })();
    return () => {
      cancelled = true;
    };
  }, [items, urls]);

  // Songs start in the shared player; everything else opens in the viewer.
  const openItem = async (item) => {
    if (item.kind === 'audio') {
      playItem(item);
      return;
    }
    setOpenId(item.id);
    if (item.source === 'link') {
      setUrls((previous) => ({ ...previous, [item.id]: item.url }));
      return;
    }
    if (urls[item.id]) return;
    try {
      const url = await signFile(item.file_uri);
      setUrls((previous) => ({ ...previous, [item.id]: url }));
    } catch (err) {
      setUrls((previous) => ({ ...previous, [item.id]: null }));
    }
  };

  const remove = async (item) => {
    if (openId === item.id) setOpenId(null);
    setItems((previous) => previous.filter((entry) => entry.id !== item.id));
    await base44.entities.Media.delete(item.id);
  };

  const present = FILTERS.filter(
    (entry) => entry.id === 'all' || items.some((item) => item.kind === entry.id)
  );
  const query = search.trim().toLowerCase();
  const visible = items.filter((item) => {
    const matchesKind = filter === 'all' || item.kind === filter;
    if (!matchesKind) return false;
    if (!query) return true;
    return (
      (item.title || '').toLowerCase().includes(query) ||
      (item.added_by_name || '').toLowerCase().includes(query)
    );
  });
  const open = items.find((item) => item.id === openId) || null;

  return (
    <div className="space-y-4">
      <MediaComposer
        space={space}
        user={user}
        onAdded={(record) => {
          setItems((previous) => [record, ...previous.filter((item) => item.id !== record.id)]);
        }}
      />

      <LibraryNowPlaying />

      <section className="glass-card rounded-3xl p-4 shadow-soft sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight text-white">
              Our library
            </h2>
            <p className="text-xs text-muted-foreground">
              {loading
                ? 'Opening the shelves…'
                : query
                  ? `${visible.length} ${visible.length === 1 ? 'match' : 'matches'} for “${search.trim()}”`
                  : `${items.length} ${items.length === 1 ? 'thing' : 'things'} you both can reach any time`}
            </p>
          </div>
          <MediaVolumeSlider className="rounded-full border border-white/10 bg-slate-950/40 px-2.5 py-1.5" />
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a song, video, picture…"
              className="w-full rounded-full border border-white/10 bg-slate-950/40 py-1.5 pl-9 pr-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-indigo-400/50"
            />
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-1">
            {present.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setFilter(entry.id)}
                className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                  filter === entry.id
                    ? 'border-indigo-400/40 bg-indigo-500/20 text-indigo-100'
                    : 'border-white/8 bg-white/[0.03] text-slate-400 hover:text-slate-200'
                }`}
              >
                {entry.label}
              </button>
            ))}
        </div>

        {visible.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => (
              <MediaTile
                key={item.id}
                item={item}
                thumbUrl={urls[item.id]}
                mine={item.added_by_id === user.id}
                active={player.item?.id === item.id}
                playing={player.playing}
                onOpen={openItem}
                onRemove={remove}
              />
            ))}
          </div>
        ) : (
          !loading && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-14 text-center">
              <LibraryBig className="h-6 w-6 text-indigo-300" />
              <span className="text-sm font-medium text-slate-200">
                {items.length ? (query ? 'Nothing matches that' : 'Nothing here yet') : 'The shelves are empty'}
              </span>
              <span className="max-w-xs text-xs text-muted-foreground">
                {items.length && query
                  ? 'Try a different word, or clear the search to see everything.'
                  : 'Upload a song or a video, or paste a link above — it stays here for both of you.'}
              </span>
            </div>
          )
        )}

        {visible.length > 0 && (
          <p className="mt-4 text-[11px] text-muted-foreground">
            Songs play for both of you and keep going while you move around — videos, pictures and links
            open from their tile.
          </p>
        )}
      </section>

      {open && (
        <MediaViewer item={open} url={urls[open.id]} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}