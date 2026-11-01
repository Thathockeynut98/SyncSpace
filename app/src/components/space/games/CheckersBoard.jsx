import { useMemo, useState } from 'react';
import { applyMove, colorOf, isKing, legalTargets } from '@/lib/checkersEngine';
import { cn } from '@/lib/utils';

export default function CheckersBoard({ state, myColor, myTurn, onMove }) {
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(null);
  const board = draft || state;
  const flipped = myColor === 'b';
  const targets = useMemo(
    () => (selected == null ? [] : legalTargets(board, selected)),
    [board, selected]
  );

  const tap = (index) => {
    if (!myTurn) return;
    if (selected != null && targets.includes(index)) {
      const result = applyMove(board, selected, index);
      if (result.continues) {
        setDraft(result.state);
        setSelected(index);
        return;
      }
      setDraft(null);
      setSelected(null);
      onMove(result.state);
      return;
    }
    const piece = board.board[index];
    setSelected(piece && colorOf(piece) === myColor ? index : null);
  };

  const cells = [];
  for (let slot = 0; slot < 64; slot += 1) {
    const index = flipped ? 63 - slot : slot;
    const row = Math.floor(index / 8);
    const col = index % 8;
    const piece = board.board[index];
    const dark = (row + col) % 2 === 1;
    const touched = board.last && (board.last.from === index || board.last.to === index);
    const tone = touched
      ? dark
        ? 'bg-indigo-700/80'
        : 'bg-indigo-300/70'
      : dark
        ? 'bg-indigo-950/85'
        : 'bg-slate-400/60';

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
              'grid h-[74%] w-[74%] place-items-center rounded-full border text-[clamp(10px,2.6vw,14px)] font-bold shadow-md',
              colorOf(piece) === 'w'
                ? 'border-amber-100/70 bg-gradient-to-b from-amber-100 to-amber-300 text-amber-900'
                : 'border-slate-500/70 bg-gradient-to-b from-slate-700 to-slate-950 text-slate-200'
            )}
          >
            {isKing(piece) ? '♔' : ''}
          </span>
        )}
        {targets.includes(index) && !piece && (
          <span className="absolute h-[22%] w-[22%] rounded-full bg-emerald-300/85" />
        )}
        {targets.includes(index) && piece && (
          <span className="absolute inset-[10%] rounded-full border-2 border-emerald-300/85" />
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