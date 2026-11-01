import { useState } from 'react';
import { applyMove, dropRow, status } from '@/lib/connect4Engine';
import { cn } from '@/lib/utils';

export default function ConnectFourBoard({ state, myTurn, onMove }) {
  const [hover, setHover] = useState(-1);
  const outcome = status(state);
  const canPlay = myTurn && !outcome.over;
  const landing = canPlay && hover >= 0 ? dropRow(state.board, hover) : -1;

  const play = (column) => {
    if (!canPlay || dropRow(state.board, column) < 0) return;
    onMove(applyMove(state, column));
  };

  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const row = Math.floor(index / 7);
    const column = index % 7;
    const disc = state.board[index];
    const winning = Boolean(outcome.line && outcome.line.includes(index));
    const preview = landing === row && !disc;

    cells.push(
      <button
        key={index}
        type="button"
        onClick={() => play(column)}
        onMouseEnter={() => setHover(column)}
        onFocus={() => setHover(column)}
        className={cn(
          'relative grid aspect-square place-items-center rounded-full bg-indigo-950/85 shadow-inner transition-colors',
          canPlay && 'hover:bg-indigo-950'
        )}
      >
        {disc && (
          <span
            className={cn(
              'h-[86%] w-[86%] rounded-full border shadow-md',
              disc === 'w'
                ? 'border-amber-100/70 bg-gradient-to-b from-amber-100 to-amber-400'
                : 'border-slate-500/70 bg-gradient-to-b from-slate-600 to-slate-950',
              winning && 'ring-2 ring-amber-300'
            )}
          />
        )}
        {preview && (
          <span className="absolute inset-[16%] rounded-full border-2 border-dashed border-emerald-300/70" />
        )}
      </button>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[26rem] grid-cols-7 gap-1.5 rounded-2xl border border-white/12 bg-indigo-900/40 p-2 shadow-soft">
      {cells}
    </div>
  );
}