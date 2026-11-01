import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Music2, Upload, X } from 'lucide-react';
import SleepAudioList from './SleepAudioList';
import SpotifySleepEmbed from './SpotifySleepEmbed';
import MediaVolumeSlider from '@/components/space/MediaVolumeSlider';
import { displayName } from '@/lib/spaceData';
import { pauseSleepTrack, playSleepTrack, stopSleepPlaying, subscribeSleepPlayback } from '@/lib/sleepPlayback';
import { spotifyEmbed } from '@/lib/spotifyEmbed';

const MODES = [
  { id: 'audio', label: 'Your audio' },
  { id: 'spotify', label: 'Spotify' },
];

export default function SleepSoundtrack({ space, user, startSignal, stopSignal }) {
  const [tracks, setTracks] = useState([]);
  const [spotify, setSpotify] = useState(null);
  const [playback, setPlayback] = useState({ trackId: null, playing: false, loading: false });
  const [mode, setMode] = useState('audio');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const handledStart = useRef(0);

  const load = useCallback(async () => {
    const page = await base44.entities.SleepTrack.filter(
      { space_id: space.id },
      { sort: 'created_date', limit: 60 }
    );
    const items = page.items || [];
    setTracks(items.filter((item) => item.kind === 'audio'));
    setSpotify(items.find((item) => item.kind === 'spotify') || null);
  }, [space.id]);

  useEffect(() => {
    load();
    return base44.entities.SleepTrack.subscribe((event) => {
      if (!event?.data || event.data.space_id === space.id) load();
    });
  }, [load, space.id]);

  useEffect(() => subscribeSleepPlayback(setPlayback), []);

  // Starting the shared countdown starts the soundtrack too.
  useEffect(() => {
    if (!startSignal || handledStart.current === startSignal) return;
    handledStart.current = startSignal;
    if (tracks[0]) playSleepTrack(tracks[0]);
  }, [startSignal, tracks]);

  const upload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length || busy) return;
    setBusy(true);
    setError('');
    try {
      for (const file of files) {
        if (file.size > 25 * 1024 * 1024) {
          setError('Each audio file needs to stay under 25 MB.');
          continue;
        }
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
        await base44.entities.SleepTrack.create({
          space_id: space.id,
          kind: 'audio',
          title: file.name.replace(/\.[^.]+$/, '').slice(0, 90),
          file_uri,
          added_by_name: displayName(user),
          added_by_id: user.id,
        });
      }
    } catch (err) {
      setError('That upload did not finish. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const saveSpotify = async (event) => {
    event.preventDefault();
    const parsed = spotifyEmbed(draft);
    if (!parsed) {
      setError('Paste a Spotify playlist, album, or track link.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (spotify) {
        await base44.entities.SleepTrack.update(spotify.id, { url: parsed.embedUrl, title: parsed.kind });
      } else {
        await base44.entities.SleepTrack.create({
          space_id: space.id,
          kind: 'spotify',
          title: parsed.kind,
          url: parsed.embedUrl,
          added_by_name: displayName(user),
          added_by_id: user.id,
        });
      }
      setDraft('');
    } catch (err) {
      setError('That link did not save. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const toggle = (track) => {
    if (playback.trackId === track.id && playback.playing) pauseSleepTrack();
    else playSleepTrack(track);
  };

  const removeTrack = async (track) => {
    stopSleepPlaying(track.id);
    await base44.entities.SleepTrack.delete(track.id);
  };

  const removeSpotify = async () => {
    await base44.entities.SleepTrack.delete(spotify.id);
  };

  const audioCount = tracks.length;
  const summary = playback.playing
    ? 'Playing · fades out with the countdown'
    : audioCount
      ? `${audioCount} ${audioCount === 1 ? 'sound' : 'sounds'} ready`
      : spotify
        ? 'Spotify player ready'
        : 'Nothing queued for tonight';

  return (
    <section className="glass-card rounded-3xl p-4 shadow-soft sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-heading text-sm font-semibold tracking-tight text-white">Sleep soundtrack</h3>
          <p className="truncate text-xs text-muted-foreground">{summary}</p>
        </div>
        <div className="flex shrink-0 rounded-full border border-white/10 bg-white/5 p-0.5 text-[11px]">
          {MODES.map((item) => (
            <button
              key={item.id}
              onClick={() => setMode(item.id)}
              className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
                mode === item.id ? 'bg-violet-400/20 text-violet-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'audio' ? (
        <>
          <label
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-4 text-xs transition-colors ${
              busy
                ? 'border-white/10 text-slate-500'
                : 'border-white/12 text-slate-300 hover:border-violet-300/40 hover:text-violet-100'
            }`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? 'Uploading your sound…' : 'Upload audio files'}
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              multiple
              onChange={upload}
              disabled={busy}
              className="hidden"
            />
          </label>

          {audioCount === 0 && !busy ? (
            <p className="mt-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-center text-xs leading-relaxed text-muted-foreground">
              Add a lullaby, a voice note, or a whole album from your own device.
            </p>
          ) : (
            <SleepAudioList
              tracks={tracks}
              playback={playback}
              onToggle={toggle}
              onRemove={removeTrack}
            />
          )}
        </>
      ) : (
        <>
          {spotify ? (
            <>
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-xs text-slate-300">
                  Your shared {spotify.title || 'playlist'}
                </p>
                <button
                  onClick={removeSpotify}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:bg-white/10 hover:text-rose-200"
                >
                  <X className="h-3 w-3" />
                  Remove
                </button>
              </div>
              <SpotifySleepEmbed embedUrl={spotify.url} stopKey={stopSignal} />
            </>
          ) : (
            <form onSubmit={saveSpotify} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3">
                <Music2 className="h-4 w-4 shrink-0 text-slate-500" />
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Paste a Spotify playlist link"
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                />
              </div>
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-xs font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Add the playlist
              </button>
            </form>
          )}
        </>
      )}

      {error && <p className="mt-2 text-[11px] text-rose-300">{error}</p>}

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
        <span className="text-[11px] font-medium text-slate-300">How loud it plays</span>
        <MediaVolumeSlider />
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        The soundtrack starts with your countdown and fades out when it ends.
      </p>
    </section>
  );
}