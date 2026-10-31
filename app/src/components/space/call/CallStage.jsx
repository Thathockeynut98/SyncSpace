import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, MicOff, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CallStage({ remote, self, cam, facing, hasVideo, sharing, phase, partnerName, muted }) {
  const remoteRef = useRef(null);
  const localRef = useRef(null);
  const [expanded, setExpanded] = useState(false);

  // The picture elements are rebuilt when the stage fills the screen, so the
  // streams are handed back every time the layout changes.
  useEffect(() => {
    if (remoteRef.current) remoteRef.current.srcObject = remote || null;
  }, [remote, expanded]);

  useEffect(() => {
    if (localRef.current) localRef.current.srcObject = self || null;
  }, [self, expanded]);

  // A call you filled the screen with is closed with Escape, and the page behind
  // it never scrolls away underneath.
  useEffect(() => {
    if (!expanded) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [expanded]);

  const initial = (partnerName || 'T').trim().charAt(0).toUpperCase();
  const somethingToSee = hasVideo || cam || sharing;

  const stage = (
    <div
      className={cn(
        'relative overflow-hidden bg-slate-950/80',
        expanded
          ? 'fixed inset-0 z-[70] flex flex-col rounded-none border-0'
          : 'rounded-2xl border border-white/10'
      )}
    >
      {/* Their voice is played through the volume gain, so the element itself stays silent. */}
      <video
        ref={remoteRef}
        autoPlay
        playsInline
        muted
        className={cn(
          'bg-black object-contain',
          hasVideo ? 'w-full' : 'hidden',
          expanded ? 'min-h-0 flex-1' : 'aspect-video'
        )}
      />

      {!hasVideo && (
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-3',
            expanded ? 'flex-1 px-6' : 'aspect-video'
          )}
        >
          <span className="relative grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-2xl font-semibold text-white">
            {initial}
            {phase === 'live' && (
              <span className="absolute inset-0 animate-ping rounded-full border border-white/30" />
            )}
          </span>
          <p className="text-sm font-medium text-slate-200">
            {phase === 'live'
              ? `${partnerName} is here`
              : phase === 'waiting'
                ? `Waiting for ${partnerName}`
                : 'Connecting…'}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {phase === 'live'
              ? 'Voice is live. Turn on your camera, or share a screen.'
              : phase === 'waiting'
                ? 'Your microphone is ready — it starts by itself when they arrive.'
                : 'Reaching their side now.'}
          </p>
          {muted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-1 text-[10px] text-rose-200">
              <MicOff className="h-3 w-3" />
              Your mic is off
            </span>
          )}
        </div>
      )}

      {somethingToSee && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-label={expanded ? 'Back to the call' : 'Fill the screen'}
          title={expanded ? 'Back to the call' : 'Fill the screen'}
          className={cn(
            'absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-slate-950/70 text-slate-200 backdrop-blur transition-colors hover:bg-slate-900/80 hover:text-white',
            expanded && 'right-3 top-3 h-10 w-10'
          )}
        >
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      )}

      {(cam || sharing) && self && (
        <div
          className={cn(
            'absolute bottom-3 right-3 overflow-hidden rounded-xl border border-white/20 bg-slate-950',
            expanded ? 'w-40 sm:w-56' : 'w-28 sm:w-36'
          )}
        >
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            className={cn('w-full', cam && !sharing && facing !== 'environment' && '-scale-x-100')}
          />
        </div>
      )}
    </div>
  );

  if (!expanded) return stage;

  // The card it sits in blurs its backdrop, which would trap a fixed layer
  // inside it, so the full-screen stage is hung straight on the page.
  return createPortal(stage, document.body);
}