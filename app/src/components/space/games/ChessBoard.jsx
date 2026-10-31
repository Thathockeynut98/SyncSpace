import { useMemo, useState } from 'react';
import { GLYPHS, applyMove, legalMoves } from '@/lib/chessEngine';
import { cn } from '@/lib/utils';

export default function ChessBoard({ state, myColor, myTurn, onMove }) {
  const [selected, setSelected] = useState(null);
  const flipped = myColor === 'b';
  const targets = useMemo(
    () => (selected == null ? [] : legalMoves(state, selected)),
    [state, selected]
  );

  const tap = (index) => {
    if (!myTurn) return;
    if (selected != null && targets.includes(index)) {
      const next = applyMove(state, selected, index);
      setSelected(null);
      onMove(next);
      return;
    }
    const piece = state.board[index];
    setSelected(piece && piece[0] === myColor ? index : null);
  };

  const cells = [];
  for (let slot = 0; slot < 64; slot += 1) {
    const index = flipped ? 63 - slot : slot;
    const row = Math.floor(index / 8);
    const col = index % 8;
    const piece = state.board[index];
    const dark = (row + col) % 2 === 1;
    const touched = state.last && (state.last.from === index || state.last.to === index);
    const tone = touched
      ? dark
        ? 'bg-indigo-700/90'
        : 'bg-indigo-300/80'
      : dark
        ? 'bg-indigo-950/85'
        : 'bg-slate-400/65';

    cells.push(
      <button
        key={index}
        type="button"
        onClick={() => tap(index)}
        className={cn('relative grid aspect-square place-items-center', tone)}
      >
        {piece && (
          <span
            className={cn(
              'select-none leading-none text-[clamp(17px,5.4vw,32px)]',
              piece[0] === 'w' ? 'text-white drop-shadow-[0_1px_3px_rgba(2,6,23,0.7)]' : 'text-slate-950'
            )}
          >
            {GLYPHS[piece]}
          </span>
        )}
        {targets.includes(index) && !piece && (
          <span className="h-[22%] w-[22%] rounded-full bg-emerald-300/85" />
        )}
        {targets.includes(index) && piece && (
          <span className="absolute inset-[9%] rounded-lg border-2 border-emerald-300/85" />
        )}
        {selected === index && <span className="absolute inset-0 ring-2 ring-inset ring-amber-300" />}
      </button>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[26rem] grid-cols-8 overflow-hidden rounded-2xl border border-white/12 shadow-soft">
      {cells}
    </div>
  );
}