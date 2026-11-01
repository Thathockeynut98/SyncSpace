import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link2, ListPlus, Loader2, Play, Trash2, Upload } from 'lucide-react';
import LinkPlayer from './LinkPlayer';
import VideoPlayer from './VideoPlayer';
import WatchQueue from './WatchQueue';
import YouTubePlayer from './YouTubePlayer';
import WatchSizeControl from './watch/WatchSizeControl';
import MediaVolumeSlider from './MediaVolumeSlider';
import PictureQualityControl from './watch/PictureQualityControl';
import { cn } from '@/lib/utils';
import { displayName, formatDuration, readVideoDuration, signFile } from '@/lib/spaceData';
import { useWatchSize } from '@/lib/watchSize';
import { linkHost, linkTitle, parseLink } from '@/lib/videoLinks';

// How wide the picture is allowed to be, chosen on this device.
const LAYOUTS = {
  standard: 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]',
  large: 'lg:grid-cols-[minmax(0,2.8fr)_minmax(0,1fr)]',
  cinema: 'lg:grid-cols-1',
};

function Equalizer() {
  return (
    <span className="flex h-4 items-end gap-[3px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] animate-waveform rounded-full bg-indigo-300"
          style={{ height: '100%', animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  );
}

export default function WatchTogether({ space, user, room }) {
  const { on, send, seat, roomState } = room;
  const [watchSize] = useWatchSize();
  const [videos, setVideos] = useState([]);
  const [urls, setUrls] = useState({});
  const [signedAt, setSignedAt] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const [lineUpNext, setLineUpNext] = useState(true);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  // Videos this device just saved, and the private links they were opened with.
  const pendingRef = useRef(new Set());
  const signedRef = useRef({});

  const load = useCallback(async () => {
    const page = await base44.entities.Video.filter(
      { space_id: space.id },
      { sort: '-created_date', limit: 60 }
    );
    const items = page.items;
    // A refresh that began just before an upload finished must not drop the new video.
    setVideos((previous) => {
      const known = new Set(items.map((item) => item.id));
      const fresh = previous.filter((item) => pendingRef.current.has(item.id));
      fresh.forEach((item) => {
        if (known.has(item.id)) pendingRef.current.delete(item.id);
      });
      return [...fresh.filter((item) => !known.has(item.id)), ...items];
    });
    // Files already open keep the link they were signed with, so the picture never reloads.
    const missing = items.filter(
      (item) => item.source !== 'link' && item.file_uri && !signedRef.current[item.id]
    );
    const signed = await Promise.all(
      missing.map(async (item) => {
        try {
          return [item.id, await signFile(item.file_uri)];
        } catch (err) {
          return [item.id, null];
        }
      })
    );
    signed.forEach(([id, url]) => {
      if (url) signedRef.current[id] = url;
    });
    setUrls({ ...signedRef.current });
    setSignedAt((previous) => {
      const next = { ...previous };
      items.forEach((item) => {
        if (!next[item.id]) next[item.id] = Date.now();
      });
      return next;
    });
    setLoading(false);
  }, [space.id]);

  // Links to private files last an hour, so a long film gets a fresh link before it lapses.
  useEffect(() => {
    if (!selectedId) return undefined;
    const interval = window.setInterval(async () => {
      if (Date.now() - (signedAt[selectedId] || 0) < 45 * 60000) return;
      const video = videos.find((item) => item.id === selectedId);
      if (!video || video.source === 'link') return;
      const url = await signFile(video.file_uri);
      signedRef.current[video.id] = url;
      setUrls({ ...signedRef.current });
      setSignedAt((previous) => ({ ...previous, [video.id]: Date.now() }));
    }, 10 * 60000);
    return () => window.clearInterval(interval);
  }, [selectedId, signedAt, videos]);

  useEffect(() => {
    load();
    return base44.entities.Video.subscribe((event) => {
      if (!event?.data || event.data.space_id === space.id) load();
    });
  }, [load, space.id]);

  // Follow the other person's choice of video.
  useEffect(
    () =>
      on('playback', (message) => {
        if (message.from === seat) return;
        if (message.videoId) setSelectedId(message.videoId);
      }),
    [on, seat]
  );

  // Catch up with whatever was playing when you arrive.
  useEffect(() => {
    const active = roomState?.playback?.videoId;
    if (active && videos.some((video) => video.id === active)) {
      setSelectedId((previous) => previous || active);
    }
  }, [roomState, videos]);

  // A saved video opens right away instead of waiting to be picked from the list.
  useEffect(() => {
    if (selectedId || !videos.length) return;
    setSelectedId(videos[0].id);
  }, [videos, selectedId]);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const duration = await readVideoDuration(file);
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const record = await base44.entities.Video.create({
        space_id: space.id,
        title: file.name.replace(/\.[^.]+$/, '').slice(0, 120),
        file_uri,
        duration_seconds: duration,
        added_by_name: displayName(user),
        added_by_id: user.id,
      });
      const url = await signFile(file_uri);
      pendingRef.current.add(record.id);
      signedRef.current[record.id] = url;
      setVideos((previous) =>
        previous.some((item) => item.id === record.id) ? previous : [record, ...previous]
      );
      setUrls({ ...signedRef.current });
      setSelectedId(record.id);
      send({ type: 'playback', action: 'load', videoId: record.id, time: 0 });
    } catch (err) {
      setError('That upload did not go through. Try a smaller file or a different format.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const addLink = async (event) => {
    event.preventDefault();
    const parsed = parseLink(linkInput);
    if (!parsed) {
      setError('That does not look like a link. Paste the whole address.');
      return;
    }
    setAddingLink(true);
    setError('');
    try {
      const record = await base44.entities.Video.create({
        space_id: space.id,
        title: linkTitle(parsed),
        source: 'link',
        url: parsed.url,
        queued: lineUpNext,
        queue_order: lineUpNext ? nextQueueOrder() : 0,
        added_by_name: displayName(user),
        added_by_id: user.id,
      });
      pendingRef.current.add(record.id);
      setVideos((previous) =>
        previous.some((item) => item.id === record.id) ? previous : [record, ...previous]
      );
      setLinkInput('');
      if (!lineUpNext) {
        setSelectedId(record.id);
        send({ type: 'playback', action: 'load', videoId: record.id, time: 0 });
      }
    } catch (err) {
      setError('That link could not be saved. Try again.');
    } finally {
      setAddingLink(false);
    }
  };

  const remove = async (video) => {
    await base44.entities.Video.delete(video.id);
    setVideos((previous) => previous.filter((item) => item.id !== video.id));
    if (selectedId === video.id) setSelectedId(null);
  };

  const select = async (video) => {
    setSelectedId(video.id);
    send({ type: 'playback', action: 'load', videoId: video.id, time: 0 });
    // A link that lapsed gets a fresh one straight away instead of spinning.
    if (video.source !== 'link' && video.file_uri && !signedRef.current[video.id]) {
      try {
        const url = await signFile(video.file_uri);
        if (url) {
          signedRef.current[video.id] = url;
          setUrls({ ...signedRef.current });
        }
      } catch (err) {
        // leave the spinner up; the next refresh will try again
      }
    }
  };

  const queue = videos
    .filter((video) => video.queued)
    .sort((a, b) => (a.queue_order || 0) - (b.queue_order || 0));

  const nextQueueOrder = () =>
    videos.reduce((max, item) => (item.queued ? Math.max(max, item.queue_order || 0) : max), 0) + 1;

  const enqueue = async (video) => {
    const order = nextQueueOrder();
    await base44.entities.Video.update(video.id, { queued: true, queue_order: order });
    setVideos((previous) =>
      previous.map((item) =>
        item.id === video.id ? { ...item, queued: true, queue_order: order } : item
      )
    );
  };

  const dequeue = async (video) => {
    await base44.entities.Video.update(video.id, { queued: false, queue_order: 0 });
    setVideos((previous) =>
      previous.map((item) =>
        item.id === video.id ? { ...item, queued: false, queue_order: 0 } : item
      )
    );
  };

  const playFromQueue = (video) => {
    select(video);
    dequeue(video);
  };

  const selected = videos.find((video) => video.id === selectedId) || null;
  const selectedLink = selected?.source === 'link' ? parseLink(selected.url) : null;

  return (
    <div className={cn('grid gap-5', LAYOUTS[watchSize] || LAYOUTS.standard)}>
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <WatchSizeControl />
          <div className="flex items-center gap-2">
            <PictureQualityControl />
            <MediaVolumeSlider className="rounded-full border border-white/10 bg-slate-950/40 px-2.5 py-1.5" />
          </div>
        </div>
      {selected ? (
        selected.source === 'link' ? (
          selectedLink?.kind === 'youtube' ? (
            <YouTubePlayer video={selected} linkId={selectedLink.id} room={room} mySeat={seat} />
          ) : selectedLink?.kind === 'file' ? (
            <VideoPlayer video={selected} url={selectedLink.url} room={room} mySeat={seat} />
          ) : (
            <LinkPlayer video={selected} url={selectedLink?.url || selected.url} />
          )
        ) : urls[selected.id] ? (
          <VideoPlayer video={selected} url={urls[selected.id]} room={room} mySeat={seat} />
        ) : (
          <section className="glass-card grid min-h-[18rem] place-items-center rounded-3xl p-4 shadow-soft">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-300" />
          </section>
        )
      ) : (
        <section className="glass-card flex min-h-[18rem] flex-col items-center justify-center gap-3 rounded-3xl p-8 text-center shadow-soft">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/20">
            <Play className="h-6 w-6 text-indigo-200" />
          </div>
          <h2 className="font-heading text-lg font-semibold tracking-tight text-white">
            {loading ? 'Getting your videos…' : 'Nothing on tonight yet'}
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Add a video and you will both watch it on your own screens, held together, second for
            second.
          </p>
        </section>
      )}

        <WatchQueue items={queue} onPlay={playFromQueue} onRemove={dequeue} />
      </div>

      <section className="glass-card flex flex-col rounded-3xl p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold tracking-tight text-white">Our videos</h3>
          <span className="text-xs text-muted-foreground">{videos.length} saved</span>
        </div>

        {error && (
          <p className="mb-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </p>
        )}

        <div className="flex max-h-[26rem] flex-col gap-2 overflow-y-auto pr-1">
          {videos.map((video) => (
            <div
              key={video.id}
              className={`group flex items-center gap-3 rounded-2xl border p-2.5 transition-colors ${
                video.id === selectedId
                  ? 'border-indigo-400/30 bg-indigo-500/10'
                  : 'border-white/6 bg-white/[0.03] hover:bg-white/[0.06]'
              }`}
            >
              <button onClick={() => select(video)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <div className="grid h-12 w-16 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900">
                  {video.id === selectedId ? (
                    <Equalizer />
                  ) : video.source === 'link' ? (
                    <Link2 className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-200" />
                  ) : (
                    <Play className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-200" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-100">{video.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {video.source === 'link'
                      ? `${linkHost(video.url)} · `
                      : video.duration_seconds
                        ? `${formatDuration(video.duration_seconds)} · `
                        : ''}
                    {video.added_by_name || 'one of you'}
                  </p>
                </div>
              </button>
              {!video.queued && (
                <button
                  onClick={() => enqueue(video)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:bg-indigo-500/20 hover:text-indigo-200"
                  title="Add to the watch queue"
                >
                  <ListPlus className="h-3.5 w-3.5" />
                </button>
              )}
              {video.added_by_id === user.id && (
                <button
                  onClick={() => remove(video)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 opacity-0 transition-all hover:bg-rose-500/15 hover:text-rose-300 group-hover:opacity-100"
                  title="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={addLink} className="mt-3">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 transition-colors focus-within:border-indigo-400/40">
            <Link2 className="h-4 w-4 shrink-0 text-indigo-300" />
            <input
              value={linkInput}
              onChange={(event) => setLinkInput(event.target.value)}
              placeholder="Paste a YouTube or video link"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={addingLink || !linkInput.trim()}
              className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:bg-white/20 disabled:opacity-50"
            >
              {addingLink ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>

        <label className="mt-2 flex cursor-pointer select-none items-center gap-2 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={lineUpNext}
            onChange={(event) => setLineUpNext(event.target.checked)}
            className="h-3.5 w-3.5 accent-indigo-400"
          />
          Line it up in the watch queue
        </label>

        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => upload(event.target.files?.[0])}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="mt-3 flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/5 disabled:opacity-70"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-indigo-300" />
          ) : (
            <Upload className="h-5 w-5 text-indigo-300" />
          )}
          <span className="text-sm font-medium text-slate-200">
            {uploading ? 'Uploading — big files take a minute' : 'Add a video'}
          </span>
          <span className="text-[11px] text-muted-foreground">
            From your phone or laptop (stored privately)
          </span>
        </button>
      </section>
    </div>
  );
}