import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Captions,
  CaptionsOff,
  Loader2,
  Lock,
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
import { followMediaVolume } from '@/lib/mediaVolume';
import useIdleControls from '@/lib/useIdleControls';
import { cn } from '@/lib/utils';

export default function VideoPlayer({ video, url, room, mySeat }) {
  const { on, send } = room;
  const videoRef = useRef(null);
  const shellRef = useRef(null);
  const remoteRef = useRef(false);
  const leaderRef = useRef(null);
  const draggingRef = useRef(false);
  const currentRef = useRef(0);
  const seekTimerRef = useRef(null);
  const latestRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(video.duration_seconds || 0);
  const [muted, setMuted] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [hasCaptions, setHasCaptions] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const { shown: controlsShown, wake: wakeControls, rest: restControls } = useIdleControls(playing);

  const goFullScreen = () => toggleFullscreen(shellRef.current, videoRef.current);

  useEffect(() => {
    const sync = () => setFullScreen(isFullscreen());
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  // The volume slider in the watch area drives the film itself.
  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    return followMediaVolume(element);
  }, [url]);

  const markRemote = () => {
    remoteRef.current = true;
    window.setTimeout(() => {
      remoteRef.current = false;
    }, 400);
  };

  const applyPlayback = useCallback((message) => {
    const element = videoRef.current;
    if (!element) return;
    const time = Number(message.time) || 0;
    const drift = Math.abs(element.currentTime - time);
    markRemote();
    // A drift check that hunts every second would re-buffer a weak connection,
    // so only step in once the two of you have actually wandered apart.
    if (drift > (message.action === 'tick' ? 4 : 0.6)) element.currentTime = time;
    if (message.action === 'play') {
      const attempt = element.play();
      if (attempt?.catch) attempt.catch(() => setNeedsTap(true));
    } else if (message.action === 'pause') {
      element.pause();
    }
  }, []);

  useEffect(() => {
    return on('playback', (message) => {
      if (message.leaderSeat !== undefined) leaderRef.current = message.leaderSeat;
      latestRef.current = message;
      if (message.from === mySeat) return;
      if (message.videoId && message.videoId !== video.id) return;
      if (message.action === 'load') return;
      applyPlayback(message);
    });
  }, [on, mySeat, video.id, applyPlayback]);

  // The other person's play/pause drives a drift correction every few seconds.
  useEffect(() => {
    if (!playing || leaderRef.current !== mySeat) return undefined;
    const interval = window.setInterval(() => {
      const element = videoRef.current;
      if (element && !element.paused) {
        send({ type: 'playback', action: 'tick', time: element.currentTime, videoId: video.id });
      }
    }, 8000);
    return () => window.clearInterval(interval);
  }, [playing, mySeat, send, video.id]);

  const commitSeek = (time) => {
    const element = videoRef.current;
    if (!element) return;
    markRemote();
    element.currentTime = time;
    setCurrent(time);
    currentRef.current = time;
    send({ type: 'playback', action: 'seek', time, videoId: video.id });
  };

  const queueSeek = (time) => {
    setCurrent(time);
    currentRef.current = time;
    window.clearTimeout(seekTimerRef.current);
    seekTimerRef.current = window.setTimeout(() => commitSeek(time), 180);
  };

  const handleBar = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    queueSeek(ratio * (duration || 0));
  };

  const handleLoaded = () => {
    const element = videoRef.current;
    setHasCaptions(element.textTracks.length > 0);
    setDuration(element.duration || video.duration_seconds || 0);
    if (!Number.isFinite(element.duration)) setDuration(Infinity);
    const snapshot = latestRef.current || room.roomState?.playback;
    if (snapshot && snapshot.videoId === video.id) {
      leaderRef.current = snapshot.leaderSeat ?? null;
      applyPlayback({ ...snapshot, action: snapshot.playing ? 'play' : 'pause' });
    }
  };

  const toggle = () => {
    const element = videoRef.current;
    if (!element) return;
    if (element.paused) element.play();
    else element.pause();
  };

  const toggleCaptions = () => {
    const tracks = videoRef.current?.textTracks;
    if (!tracks?.length) return;
    const next = !captionsOn;
    for (let i = 0; i < tracks.length; i += 1) {
      tracks[i].mode = next && i === 0 ? 'showing' : 'hidden';
    }
    setCaptionsOn(next);
  };

  const jump = (seconds) => commitSeek(Math.max(0, (videoRef.current?.currentTime || 0) + seconds));

  // A stream can run forever, so its length may not be a real number.
  const live = !Number.isFinite(duration);
  const progress = duration && !live ? Math.min(100, (current / duration) * 100) : 0;

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
        onPointerMove={wakeControls}
        onDoubleClick={goFullScreen}
      >
        <video
          ref={videoRef}
          src={url}
          playsInline
          preload="auto"
          muted={muted}
          onLoadedMetadata={handleLoaded}
          onPlay={() => {
            setPlaying(true);
            if (remoteRef.current) return;
            leaderRef.current = mySeat;
            send({ type: 'playback', action: 'play', time: videoRef.current.currentTime, videoId: video.id });
          }}
          onPause={() => {
            setPlaying(false);
            if (remoteRef.current) return;
            send({ type: 'playback', action: 'pause', time: videoRef.current.currentTime, videoId: video.id });
          }}
          onTimeUpdate={() => {
            if (!draggingRef.current) {
              setCurrent(videoRef.current.currentTime);
              currentRef.current = videoRef.current.currentTime;
            }
          }}
          onSeeked={() => {
            if (remoteRef.current) return;
            send({ type: 'playback', action: 'seek', time: videoRef.current.currentTime, videoId: video.id });
          }}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          onCanPlay={() => setBuffering(false)}
          onEnded={() => setPlaying(false)}
          className="h-full w-full object-contain"
        />

        {buffering && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-white/70" />
          </div>
        )}

        {needsTap && (
          <div className="absolute inset-0 grid place-items-center bg-slate-950/70 backdrop-blur-sm">
            <button
              onClick={() => {
                videoRef.current?.play();
                setNeedsTap(false);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/25"
            >
              <Play className="h-4 w-4" />
              They pressed play — tap to sync up
            </button>
          </div>
        )}

        {!playing && !buffering && !needsTap && (
          <button
            onClick={toggle}
            className="absolute inset-0 grid place-items-center bg-slate-950/25 transition-colors hover:bg-slate-950/40"
          >
            <span className="grid h-20 w-20 place-items-center rounded-full border border-white/15 bg-white/10 backdrop-blur-md transition-transform hover:scale-105">
              <Play className="ml-1 h-8 w-8 text-white" strokeWidth={1.6} />
            </span>
          </button>
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
            hidden={live}
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
              commitSeek(currentRef.current);
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
                onClick={() => jump(-10)}
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
                onClick={() => jump(10)}
                className="grid h-9 w-9 place-items-center rounded-full text-slate-200 transition-colors hover:bg-white/10"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMuted((value) => !value)}
                className="ml-1 grid h-9 w-9 place-items-center rounded-full text-slate-200 transition-colors hover:bg-white/10"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button
                onClick={toggleCaptions}
                disabled={!hasCaptions}
                title={
                  hasCaptions
                    ? captionsOn
                      ? 'Turn captions off'
                      : 'Turn captions on'
                    : 'No captions in this video'
                }
                className={cn(
                  'grid h-9 w-9 place-items-center rounded-full transition-colors',
                  hasCaptions
                    ? captionsOn
                      ? 'bg-white/15 text-white'
                      : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
                    : 'cursor-not-allowed text-slate-600'
                )}
              >
                {captionsOn ? <Captions className="h-4 w-4" /> : <CaptionsOff className="h-4 w-4" />}
              </button>
              <span className="ml-1 font-mono text-[11px] text-slate-300">
                {formatDuration(current)} / {live ? 'Live' : formatDuration(duration)}
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
          <Lock className="h-3.5 w-3.5" />
          Play, pause and skip stay together
        </span>
      </div>
    </section>
  );
}