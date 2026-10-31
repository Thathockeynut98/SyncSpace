import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// A small floating window on their face, so a game, a book or a drawing never
// costs you the sight of them. Docked bottom-left on a computer, and free to be
// dragged out of the way anywhere, phone included.
const PAD = 12;

function boxSize(collapsed, width) {
  if (collapsed) return { w: 46, h: 46 };
  return width < 640 ? { w: 132, h: 100 } : { w: 208, h: 128 };
}

function startSpot(collapsed) {
  const { h } = boxSize(collapsed, window.innerWidth);
  // Clear of the sound bars that sit along the bottom of the space.
  return { x: PAD + 4, y: Math.max(PAD, window.innerHeight - h - 108) };
}

export default function CamOverlay({ stream, visible, partnerName }) {
  const boxRef = useRef(null);
  const videoRef = useRef(null);
  const dragRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const [spot, setSpot] = useState(null);
  const [dragging, setDragging] = useState(false);

  const size = collapsed ? boxSize(true, window.innerWidth) : boxSize(false, window.innerWidth);

  // The stream comes and goes with their camera, and the window is redrawn when
  // it is folded away, so the picture is handed back each time.
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null;
  }, [stream, collapsed]);

  // Kept inside the screen, however it is turned or shrunk.
  useEffect(() => {
    if (!visible) return undefined;
    const stay = () => {
      setSpot((current) => {
        if (!current) return current;
        const maxX = Math.max(PAD, window.innerWidth - size.w - PAD);
        const maxY = Math.max(PAD, window.innerHeight - size.h - PAD);
        return { x: Math.min(current.x, maxX), y: Math.min(current.y, maxY) };
      });
    };
    stay();
    window.addEventListener('resize', stay);
    return () => window.removeEventListener('resize', stay);
  }, [visible, size.w, size.h]);

  if (!visible) return null;

  const place = spot || startSpot(collapsed);

  const begin = (event) => {
    if (event.target.closest('button')) return;
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    boxRef.current.setPointerCapture?.(event.pointerId);
    setDragging(true);
  };

  const move = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    const maxX = Math.max(PAD, window.innerWidth - size.w - PAD);
    const maxY = Math.max(PAD, window.innerHeight - size.h - PAD);
    setSpot({
      x: Math.min(maxX, Math.max(PAD, event.clientX - drag.dx)),
      y: Math.min(maxY, Math.max(PAD, event.clientY - drag.dy)),
    });
  };

  const finish = (event) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    boxRef.current?.releasePointerCapture?.(event.pointerId);
    setDragging(false);
  };

  const initial = (partnerName || 'T').trim().charAt(0).toUpperCase();

  return (
    <div
      ref={boxRef}
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={finish}
      onPointerCancel={finish}
      style={{ left: place.x, top: place.y, touchAction: 'none' }}
      className={cn(
        'fixed z-[45] select-none overflow-hidden rounded-2xl border border-white/20 bg-slate-950/90 shadow-glow backdrop-blur',
        dragging ? 'cursor-grabbing' : 'cursor-grab'
      )}
    >
      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title={`Show ${partnerName}`}
          className="grid h-[46px] w-[46px] place-items-center bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-semibold text-white"
        >
          {initial}
        </button>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-[100px] w-[132px] object-cover sm:h-[128px] sm:w-[208px]"
          />
          <span className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-slate-950/80 to-transparent px-2 pb-3 pt-1 text-[10px] font-medium text-white/90">
            {partnerName}
          </span>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="Fold the window away"
            className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-slate-950/70 text-slate-200 transition-colors hover:text-white"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}