const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export const other = (color) => (color === 'w' ? 'b' : 'w');

export const newTicTacToe = () => ({ board: Array(9).fill(null), turn: 'w', last: null });

export function applyMove(state, index) {
  if (!Number.isInteger(index) || index < 0 || index > 8 || state.board[index]) return state;
  const board = [...state.board];
  board[index] = state.turn;
  return { board, turn: other(state.turn), last: index };
}

export function status(state) {
  const { board } = state;
  for (const line of LINES) {
    const [a, b, c] = line;
    const mark = board[a];
    if (mark && mark === board[b] && mark === board[c]) {
      return { over: true, winner: mark, line };
    }
  }
  if (board.every(Boolean)) return { over: true, winner: null, line: null };
  return { over: false, winner: null, line: null };
}