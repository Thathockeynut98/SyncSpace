export const COLUMNS = 7;
export const ROWS = 6;

export const other = (color) => (color === 'w' ? 'b' : 'w');

export const newConnectFour = () => ({ board: Array(ROWS * COLUMNS).fill(null), turn: 'w', last: null });

export const dropRow = (board, column) => {
  if (!Number.isInteger(column) || column < 0 || column >= COLUMNS) return -1;
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (!board[row * COLUMNS + column]) return row;
  }
  return -1;
};

export function applyMove(state, column) {
  const row = dropRow(state.board, column);
  if (row < 0) return state;
  const board = [...state.board];
  const index = row * COLUMNS + column;
  board[index] = state.turn;
  return { board, turn: other(state.turn), last: index };
}

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export function status(state) {
  const { board } = state;
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const disc = board[row * COLUMNS + column];
      if (!disc) continue;
      for (const [dr, dc] of DIRECTIONS) {
        const line = [0, 1, 2, 3].map((step) => [row + dr * step, column + dc * step]);
        const lined = line.every(
          ([r, c]) => r >= 0 && r < ROWS && c >= 0 && c < COLUMNS && board[r * COLUMNS + c] === disc
        );
        if (lined) return { over: true, winner: disc, line: line.map(([r, c]) => r * COLUMNS + c) };
      }
    }
  }
  if (board.every(Boolean)) return { over: true, winner: null, line: null };
  return { over: false, winner: null, line: null };
}