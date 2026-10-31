import { applyMove, status } from '@/lib/tictactoeEngine';
import { cn } from '@/lib/utils';

const MARKS = { w: '✕', b: '○' };

export default function TicTacToeBoard({ state, myTurn, onMove }) {
  const outcome = status(state);

  const play = (index) => {
    if (!myTurn || outcome.over || state.board[index]) return;
    onMove(applyMove(state, index));
  };

  return (
    <div className="mx-auto grid w-full max-w-[22rem] grid-cols-3 gap-2">
      {state.board.map((mark, index) => {
        const winning = Boolean(outcome.line && outcome.line.includes(index));
        return (
          <button
            key={index}
            type="button"
            onClick={() => play(index)}
            className={cn(
              'grid aspect-square place-items-center rounded-xl border transition-colors',
              winning
                ? 'border-amber-300/60 bg-amber-400/15'
                : 'border-white/8 bg-white/[0.03]',
              myTurn && !mark && !outcome.over ? 'hover:border-indigo-400/40 hover:bg-indigo-500/10' : ''
            )}
          >
            {mark && (
              <span
                className={cn(
                  'font-heading text-[clamp(26px,7vw,46px)] font-bold leading-none',
                  mark === 'w' ? 'text-indigo-200' : 'text-fuchsia-200'
                )}
              >
                {MARKS[mark]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}