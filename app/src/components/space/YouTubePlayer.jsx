import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Captions,
  CaptionsOff,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatDuration } from '@/lib/spaceData';
import { isFullscreen, toggleFullscreen } from '@/lib/fullscreen';
import { getPictureQuality, subscribePictureQuality } from '@/lib/pictureQuality';
import { getMediaVolume, subscribeMediaVolume } from '@/lib/mediaVolume';
import useIdleControls from '@/lib/useIdleControls';
import { cn } from '@/lib/utils';

let apiPromise = null;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous();
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('The player could not load'));
    document.head.appendChild(script);
  });
  return apiPromise;
}

// Ask this link for the picture quality chosen in the watch area.
function applyQuality(player) {
  if (!player) return;
  const quality = getPictureQuality();
  if (quality.range) player.setPlaybackQualityRange?.(quality.range[0], quality.range[1]);
  player.setPlaybackQuality?.(quality.youtube);
}

export default function YouTubePlayer({ video, linkId, room, mySeat }) {
  const { on, send, roomState } = room;
  const mountRef = useRef(null);
  const shellRef = useRef(null);
  const playerRef = useRef(null);
  const remoteRef = useRef(false);
  const leaderRef = useRef(null);
  const draggingRef = useRef(false);
  const previewRef = useRef(0);
  const latestRef = useRef(null);
  const stateRef = useRef(roomState);

  const [ready, setReady] = useState(false);
  const [broken, setBroken] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const { shown: controlsShown, wake: wakeControls, rest: restControls } = useIdleControls(playing);

  stateRef.current = roomState;

  // The volume slider in the watch area drives the film itself.
  useEffect(
    () =>
      subscribeMediaVolume((level) => {
        playerRef.current?.setVolume?.(Math.round(level * 100));
      }),
    []
  );

  // The picture quality chosen in the watch area, applied to this link.
  useEffect(
    () => subscribePictureQuality(() => applyQuality(playerRef.current)),
    []
  );

  const markRemote = () => {
    remoteRef.current = true;
    window.setTimeout(() => {
      remoteRef.current = false;
    }, 600);
  };

  const timeNow = () => {
    try {
      return Number(playerRef.current?.getCurrentTime?.()) || 0;
    } catch (err) {
      return 0;
    }
  };

  const applyPlayback = useCallback((message) => {
    const player = playerRef.current;
    if (!player?.playVideo) return;
    const target = Number(message.time) || 0;
    const drift = Math.abs(timeNow() - target);
    markRemote();
    if (drift > (message.action === 'tick' ? 1.5 : 0.8)) player.seekTo(target, true);
    if (message.action === 'play') {
      player.playVideo();
      window.setTimeout(() => {
        if (playerRef.current?.getPlayerState?.() !== 1) setNeedsTap(true);
      }, 900);
    } else if (message.action === 'pause') {
      player.pauseVideo();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setBroken(false);
    setPlaying(false);
    setCurrent(0);
    setDuration(0);

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !mountRef.current) return;
        playerRef.current = new YT.Player(mountRef.current, {
          videoId: linkId,
          playerVars: {
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            vq: getPictureQuality().youtube,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              setReady(true);
              // The picture quality chosen in the watch area, when the link carries it.
              applyQuality(event.target);
              event.target.setVolume?.(Math.round(getMediaVolume() * 100));
              setDuration(Number(event.target.getDuration?.()) || 0);
              const snapshot = latestRef.current || stateRef.current?.playback;
              if (snapshot && snapshot.videoId === video.id) {
                leaderRef.current = snapshot.leaderSeat ?? null;
                applyPlayback({ ...snapshot, action: snapshot.playing ? 'play' : 'pause' });
              }
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const state = event.data;
              if (state === 1) {
                setPlaying(true);
                setNeedsTap(false);
                playerRef.current?.setPlaybackQuality?.(getPictureQuality().youtube);
                if (remoteRef.current) return;
                leaderRef.current = mySeat;
                send({ type: 'playback', action: 'play', time: timeNow(), videoId: video.id });
              } else if (state === 2) {
                setPlaying(false);
                if (remoteRef.current) return;
                send({ type: 'playback', action: 'pause', time: timeNow(), videoId: video.id });
              } else if (state === 0) {
                setPlaying(false);
              }
            },
            onError: () => setBroken(true),
          },
        });
      })
      .catch(() => {
        if (!cancelled) setBroken(true);
      });

    return () => {
      cancelled = true;
      const player = playerRef.current;
      playerRef.current = null;
      try {
        player?.destroy?.();
      } catch (err) {
        // the frame is being torn down anyway
      }
    };
  }, [linkId, video.id, mySeat, send, applyPlayback]);

  // Keep the scrubber and the running time close to the real player.
  useEffect(() => {
    if (!ready) return undefined;
    const interval = window.setInterval(() => {
      const player = playerRef.current;
      if (!player?.getCurrentTime) return;
      if (!draggingRef.current) setCurrent(timeNow());
      const total = Number(player.getDuration?.()) || 0;
      if (total && Math.abs(total - duration) > 0.5) setDuration(total);
    }, 500);
    return () => window.clearInterval(interval);
  }, [ready, duration]);

  // Whoever pressed play keeps the two of you honest with a slow drift check.
  useEffect(() => {
    if (!playing || leaderRef.current !== mySeat) return undefined;
    const interval = window.setInterval(() => {
      const player = playerRef.current;
      if (player?.getPlayerState?.() === 1) {
        send({ type: 'playback', action: 'tick', time: timeNow(), videoId: video.id });
      }
    }, 8000);
    return () => window.clearInterval(interval);
  }, [playing, mySeat, send, video.id]);

  useEffect(
    () =>
      on('playback', (message) => {
        if (message.leaderSeat !== undefined) leaderRef.current = message.leaderSeat;
        latestRef.current = message;
        if (message.from === mySeat) return;
        if (message.videoId && message.videoId !== video.id) return;
        if (message.action === 'load') return;
        applyPlayback(message);
      }),
    [on, mySeat, video.id, applyPlayback]
  );

  const [fullScreen, setFullScreen] = useState(false);

  useEffect(() => {
    const sync = () => setFullScreen(isFullscreen());
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  const goFullScreen = () => toggleFullscreen(shellRef.current);

  const toggle = () => {
    const player = playerRef.current;
    if (!player) return;
    if (playing) player.pauseVideo();
    else player.playVideo();
  };

  const seek = (target) => {
    const player = playerRef.current;
    if (!player?.seekTo) return;
    const limit = duration || Number(target) || 0;
    const clamped = Math.max(0, Math.min(Number(target) || 0, limit));
    markRemote();
    player.seekTo(clamped, true);
    setCurrent(clamped);
    previewRef.current = clamped;
    send({ type: 'playback', action: 'seek', time: clamped, videoId: video.id });
  };

  const handleBar = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const target = ratio * (duration || 0);
    previewRef.current = target;
    setCurrent(target);
  };

  const toggleMute = () => {
    const player = playerRef.current;
    if (!player) return;
    if (muted) player.unMute?.();
    else player.mute?.();
    setMuted(!muted);
  };

  const toggleCaptions = () => {
    const player = playerRef.current;
    if (!player) return;
    try {
      if (captionsOn) {
        player.unloadModule?.('captions');
      } else {
        player.loadModule?.('captions');
        player.setOption?.('captions', 'track', {});
      }
    } catch (err) {
      // the module is not ready yet; the button simply stays as it was
      return;
    }
    setCaptionsOn(!captionsOn);
  };

  const progress = duration ? Math.min(100, (current / duration) * 100) : 0;

  if (broken) {
    return (
      <section className="glass-card rounded-3xl p-3 shadow-soft sm:p-4">
        <div className="overflow-hidden rounded-2xl bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${linkId}`}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="aspect-video w-full"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1 pb-1">
          <h2 className="truncate font-heading text-lg font-semibold tracking-tight text-white">
            {video.title}
          </h2>
          <p className="text-xs text-muted-foreground">
            Plain YouTube player — press play together, this one cannot hold the two of you in sync.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="glass-card rounded-3xl p-3 shadow-soft sm:p-4">
      <div
        ref={shellRef}
        className={cn(
          'video-shell group relative aspect-video overflow-hidden rounded-2xl bg-black',
          controlsShown ? 'cursor-default' : 'cursor-none'
        )}
        onPointerDown={() => {
          setNeedsTap(false);
          wakeControls();
        }}
        onDoubleClick={goFullScreen}
      >
        <div ref={mountRef} className="h-full w-full" />

        {/* The frame swallows its own pointer events, so a quiet layer brings the bar back. */}
        <div
          className="absolute inset-0 cursor-pointer"
          onPointerMove={wakeControls}
          onClick={() => {
            if (!controlsShown) {
              wakeControls();
              return;
            }
            toggle();
          }}
        />

        {!ready && (
          <div className="absolute inset-0 grid place-items-center bg-slate-950/60">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-300" />
          </div>
        )}

        {needsTap && (
          <div className="absolute inset-0 grid place-items-center bg-slate-950/70 backdrop-blur-sm">
            <button
              onClick={() => {
                playerRef.current?.playVideo?.();
                setNeedsTap(false);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/25"
            >
              <Play className="h-4 w-4" />
              They pressed play — tap to sync up
            </button>
          </div>
        )}

        <div
          onPointerEnter={restControls}
          onPointerLeave={wakeControls}
          className={cn(
            'absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-transparent p-4 pt-14 transition-opacity duration-500',
            controlsShown ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
        >
          <div
            onPointerDown={(event) => {
              draggingRef.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
              handleBar(event);
            }}
            onPointerMove={(event) => {
              if (draggingRef.current) handleBar(event);
            }}
            onPointerUp={() => {
              draggingRef.current = false;
              seek(previewRef.current);
            }}
            className="mb-3 cursor-pointer py-2"
          >
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => seek(timeNow() - 10)}
                className="grid h-9 w-9 place-items-center rounded-full text-slate-200 transition-colors hover:bg-white/10"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={toggle}
                className="grid h-11 w-11 place-items-center rounded-full bg-white/12 text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
              </button>
              <button
                onClick={() => seek(timeNow() + 10)}
                className="grid h-9 w-9 place-items-center rounded-full text-slate-200 transition-colors hover:bg-white/10"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button
                onClick={toggleMute}
                className="ml-1 grid h-9 w-9 place-items-center rounded-full text-slate-200 transition-colors hover:bg-white/10"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button
                onClick={toggleCaptions}
                title={captionsOn ? 'Turn captions off' : 'Turn captions on'}
                className={cn(
                  'grid h-9 w-9 place-items-center rounded-full transition-colors',
                  captionsOn
                    ? 'bg-white/15 text-white'
                    : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
                )}
              >
                {captionsOn ? <Captions className="h-4 w-4" /> : <CaptionsOff className="h-4 w-4" />}
              </button>
              <span className="ml-1 font-mono text-[11px] text-slate-300">
                {formatDuration(current)} / {formatDuration(duration)}
              </span>
            </div>
            <button
              onClick={goFullScreen}
              title={fullScreen ? 'Leave full screen' : 'Full screen'}
              className="grid h-9 w-9 place-items-center rounded-full text-slate-200 transition-colors hover:bg-white/10"
            >
              {fullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1 pb-1">
        <div className="min-w-0">
          <h2 className="truncate font-heading text-lg font-semibold tracking-tight text-white">
            {video.title}
          </h2>
          <p className="text-xs text-muted-foreground">Added by {video.added_by_name || 'one of you'}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-200">
          Play, pause and skip stay together
        </span>
      </div>
    </section>
  );
}