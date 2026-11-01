// Checkers: forced captures, chained jumps and kings. Moves are validated here so
// both people always agree on what is legal.

const inside = (row, col) => row >= 0 && row < 8 && col >= 0 && col < 8;
const rowOf = (index) => Math.floor(index / 8);
const colOf = (index) => index % 8;
const isKing = (piece) => piece === piece.toUpperCase();
const colorOf = (piece) => (piece.toLowerCase() === 'w' ? 'w' : 'b');
export const other = (color) => (color === 'w' ? 'b' : 'w');

export function newCheckers() {
  const board = Array(64).fill(null);
  for (let index = 0; index < 64; index += 1) {
    const row = rowOf(index);
    const col = colOf(index);
    if ((row + col) % 2 !== 1) continue;
    if (row < 3) board[index] = 'b';
    if (row > 4) board[index] = 'w';
  }
  return { board, turn: 'w', last: null };
}

function directions(piece) {
  if (isKing(piece)) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return colorOf(piece) === 'w' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
}

export function jumpsFor(board, from) {
  const piece = board[from];
  if (!piece) return [];
  const color = colorOf(piece);
  const row = rowOf(from);
  const col = colOf(from);
  const out = [];
  for (const [dr, dc] of directions(piece)) {
    const midRow = row + dr;
    const midCol = col + dc;
    const landRow = row + dr * 2;
    const landCol = col + dc * 2;
    if (!inside(landRow, landCol)) continue;
    const middle = board[midRow * 8 + midCol];
    const landing = board[landRow * 8 + landCol];
    if (middle && colorOf(middle) !== color && !landing) out.push(landRow * 8 + landCol);
  }
  return out;
}

function stepsFor(board, from) {
  const piece = board[from];
  if (!piece) return [];
  const row = rowOf(from);
  const col = colOf(from);
  const out = [];
  for (const [dr, dc] of directions(piece)) {
    const r = row + dr;
    const c = col + dc;
    if (inside(r, c) && !board[r * 8 + c]) out.push(r * 8 + c);
  }
  return out;
}

export function capturesExist(state, color) {
  for (let index = 0; index < 64; index += 1) {
    const piece = state.board[index];
    if (!piece || colorOf(piece) !== color) continue;
    if (jumpsFor(state.board, index).length) return true;
  }
  return false;
}

export function legalTargets(state, from) {
  const piece = state.board[from];
  if (!piece || colorOf(piece) !== state.turn) return [];
  const jumps = jumpsFor(state.board, from);
  if (capturesExist(state, state.turn)) return jumps;
  return stepsFor(state.board, from);
}

export function applyMove(state, from, to) {
  const board = [...state.board];
  const piece = board[from];
  const fromRow = rowOf(from);
  const toRow = rowOf(to);
  board[from] = null;

  let captured = false;
  if (Math.abs(toRow - fromRow) === 2) {
    const midRow = (fromRow + toRow) / 2;
    const midCol = (colOf(from) + colOf(to)) / 2;
    board[midRow * 8 + midCol] = null;
    captured = true;
  }

  const promoted = (colorOf(piece) === 'w' && toRow === 0) || (colorOf(piece) === 'b' && toRow === 7);
  board[to] = promoted && !isKing(piece) ? piece.toUpperCase() : piece;

  const continues = captured && !promoted && jumpsFor(board, to).length > 0;
  return {
    state: { board, turn: continues ? state.turn : other(state.turn), last: { from, to } },
    continues,
  };
}

export function status(state) {
  let movable = false;
  for (let index = 0; index < 64 && !movable; index += 1) {
    if (legalTargets(state, index).length) movable = true;
  }
  if (movable) return { over: false };
  return { over: true, winner: other(state.turn), reason: 'no moves left' };
}

export function countPieces(board) {
  return board.reduce(
    (totals, piece) => {
      if (!piece) return totals;
      if (colorOf(piece) === 'w') totals.w += 1;
      else totals.b += 1;
      return totals;
    },
    { w: 0, b: 0 }
  );
}

export { isKing, colorOf };