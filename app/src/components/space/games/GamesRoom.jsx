import { useEffect, useState } from 'react';
import { Circle, Crown, Hash, RotateCcw, Swords } from 'lucide-react';
import { newChess, status as chessStatus } from '@/lib/chessEngine';
import { newCheckers, status as checkersStatus } from '@/lib/checkersEngine';
import { newConnectFour, status as connectFourStatus } from '@/lib/connect4Engine';
import { newTicTacToe, status as ticTacToeStatus } from '@/lib/tictactoeEngine';
import { cn } from '@/lib/utils';
import ChessBoard from './ChessBoard';
import CheckersBoard from './CheckersBoard';
import ConnectFourBoard from './ConnectFourBoard';
import TicTacToeBoard from './TicTacToeBoard';

const GAMES = [
  {
    id: 'chess',
    label: 'Chess',
    blurb: 'Castling, en passant, a queen on promotion',
    icon: Swords,
    fresh: newChess,
    status: chessStatus,
    sides: ['white', 'black'],
  },
  {
    id: 'checkers',
    label: 'Checkers',
    blurb: 'Jumps are forced, kings on both halves',
    icon: Crown,
    fresh: newCheckers,
    status: checkersStatus,
    sides: ['the light pieces', 'the dark pieces'],
  },
  {
    id: 'tictactoe',
    label: 'Tic tac toe',
    blurb: 'Three in a row, as many rounds as you like',
    icon: Hash,
    fresh: newTicTacToe,
    status: ticTacToeStatus,
    sides: ['X', 'O'],
  },
  {
    id: 'connect4',
    label: 'Connect four',
    blurb: 'Drop a disc, line up four',
    icon: Circle,
    fresh: newConnectFour,
    status: connectFourStatus,
    sides: ['the light discs', 'the dark discs'],
  },
];

const gameOf = (kind) => GAMES.find((option) => option.id === kind) || GAMES[0];

export default function GamesRoom({ room }) {
  const { seat, peers, on, send, roomState } = room;
  const [game, setGame] = useState(roomState?.game || null);
  const [pick, setPick] = useState('chess');

  useEffect(() => on('game', (message) => setGame(message)), [on]);
  useEffect(() => {
    if (roomState?.game) setGame(roomState.game);
  }, [roomState]);

  const partner = peers.find((item) => item.seat !== seat) || null;
  const state = game?.state || null;
  const myTurn = Boolean(state) && game.turnSeat === seat;
  const myColor = game?.starterSeat === seat ? 'w' : 'b';
  const outcome = state ? gameOf(game.kind).status(state) : null;

  const start = (kind) => {
    setPick(kind);
    send({ type: 'game', action: 'new', kind, state: gameOf(kind).fresh() });
  };

  const commit = (nextState) => {
    setGame((previous) => ({ ...previous, state: nextState, turnSeat: partner ? partner.seat : null }));
    send({ type: 'game', action: 'move', state: nextState });
  };

  const reset = () => {
    send({ type: 'game', action: 'reset' });
    setGame(null);
  };

  let headline = 'Your move';
  if (!state) headline = 'Choose a board';
  else if (outcome?.over) headline = outcome.winner ? `${outcome.winner === myColor ? 'You' : 'They'} won` : 'A draw';
  else if (myTurn) headline = outcome?.checked ? 'You are in check' : 'Your move';
  else headline = outcome?.checked ? 'They are in check' : 'Waiting on them';

  return (
    <section className="glass-card rounded-3xl p-4 shadow-soft sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight text-white">Games</h2>
          <p className="text-xs text-muted-foreground">
            {state ? headline : 'One board, one set of moves — you both see the same game'}
          </p>
        </div>
        {state && (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'rounded-full border px-3 py-1.5 text-[11px] font-medium',
                outcome?.over
                  ? 'border-amber-300/30 bg-amber-400/15 text-amber-100'
                  : myTurn
                    ? 'border-emerald-300/30 bg-emerald-400/15 text-emerald-100'
                    : 'border-white/10 bg-white/5 text-slate-300'
              )}
            >
              {headline}
            </span>
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-300 transition-colors hover:bg-white/10"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        )}
      </div>

      {!state ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {GAMES.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => start(option.id)}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors',
                  pick === option.id
                    ? 'border-indigo-400/30 bg-indigo-500/10'
                    : 'border-white/8 bg-white/[0.03] hover:border-indigo-400/30 hover:bg-indigo-500/10'
                )}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">Start {option.label.toLowerCase()}</span>
                  <span className="block text-[11px] text-muted-foreground">{option.blurb}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,26rem)_1fr]">
          {game.kind === 'chess' && (
            <ChessBoard state={state} myColor={myColor} myTurn={myTurn} onMove={commit} />
          )}
          {game.kind === 'checkers' && (
            <CheckersBoard state={state} myColor={myColor} myTurn={myTurn} onMove={commit} />
          )}
          {game.kind === 'tictactoe' && <TicTacToeBoard state={state} myTurn={myTurn} onMove={commit} />}
          {game.kind === 'connect4' && <ConnectFourBoard state={state} myTurn={myTurn} onMove={commit} />}

          <div className="flex flex-col gap-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-300/80">
                {gameOf(game.kind).label}
              </p>
              <p className="mt-1 text-sm text-slate-200">
                You are playing {gameOf(game.kind).sides[myColor === 'w' ? 0 : 1]}.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {partner ? `${partner.name} is on the other side.` : 'Waiting for them to open the room.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {GAMES.map((option) => (
                <button
                  key={option.id}
                  onClick={() => start(option.id)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-[11px] transition-colors',
                    game.kind === option.id
                      ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-100'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  )}
                >
                  New {option.label.toLowerCase()}
                </button>
              ))}
            </div>

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Every move goes to their board the moment you make it, and whoever is not moving cannot move for
              you.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}