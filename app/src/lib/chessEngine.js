// Everything needed to play chess in a browser tab: legal moves, castling,
// en passant, promotion to queen, check and mate. No dependencies.

export const GLYPHS = {
  wK: '♔',
  wQ: '♕',
  wR: '♖',
  wB: '♗',
  wN: '♘',
  wP: '♙',
  bK: '♚',
  bQ: '♛',
  bR: '♜',
  bB: '♝',
  bN: '♞',
  bP: '♟',
};

const START = [
  'bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR',
  'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP',
  null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null,
  'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP',
  'wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR',
];

const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const DIAGONAL = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const STRAIGHT = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const ALL_DIRS = [...DIAGONAL, ...STRAIGHT];

const inside = (row, col) => row >= 0 && row < 8 && col >= 0 && col < 8;
const rowOf = (index) => Math.floor(index / 8);
const colOf = (index) => index % 8;
export const other = (color) => (color === 'w' ? 'b' : 'w');

export function newChess() {
  return {
    board: [...START],
    turn: 'w',
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    ep: null,
    last: null,
  };
}

function attacked(board, index, by) {
  const row = rowOf(index);
  const col = colOf(index);
  const pawnRow = row + (by === 'w' ? 1 : -1);
  for (const step of [-1, 1]) {
    const pawnCol = col + step;
    if (inside(pawnRow, pawnCol) && board[pawnRow * 8 + pawnCol] === `${by}P`) return true;
  }
  for (const [dr, dc] of KNIGHT) {
    const r = row + dr;
    const c = col + dc;
    if (inside(r, c) && board[r * 8 + c] === `${by}N`) return true;
  }
  for (const [dr, dc] of ALL_DIRS) {
    const r = row + dr;
    const c = col + dc;
    if (inside(r, c) && board[r * 8 + c] === `${by}K`) return true;
  }
  const ray = (dirs, types) => {
    for (const [dr, dc] of dirs) {
      let r = row + dr;
      let c = col + dc;
      while (inside(r, c)) {
        const piece = board[r * 8 + c];
        if (piece) {
          if (piece[0] === by && types.includes(piece[1])) return true;
          break;
        }
        r += dr;
        c += dc;
      }
    }
    return false;
  };
  return ray(DIAGONAL, ['B', 'Q']) || ray(STRAIGHT, ['R', 'Q']);
}

function pushTarget(list, board, index, color) {
  const piece = board[index];
  if (!piece || piece[0] !== color) list.push(index);
}

function pseudoMoves(state, from) {
  const { board } = state;
  const piece = board[from];
  if (!piece) return [];
  const color = piece[0];
  const type = piece[1];
  const row = rowOf(from);
  const col = colOf(from);
  const out = [];

  if (type === 'P') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    const ahead = row + dir;
    if (inside(ahead, col) && !board[ahead * 8 + col]) {
      out.push(ahead * 8 + col);
      const far = row + dir * 2;
      if (row === startRow && !board[far * 8 + col]) out.push(far * 8 + col);
    }
    for (const step of [-1, 1]) {
      const c = col + step;
      if (!inside(ahead, c)) continue;
      const target = ahead * 8 + c;
      const victim = board[target];
      if (victim && victim[0] !== color) out.push(target);
      else if (!victim && state.ep === target) out.push(target);
    }
    return out;
  }

  if (type === 'N') {
    for (const [dr, dc] of KNIGHT) {
      const r = row + dr;
      const c = col + dc;
      if (inside(r, c)) pushTarget(out, board, r * 8 + c, color);
    }
    return out;
  }

  if (type === 'K') {
    for (const [dr, dc] of ALL_DIRS) {
      const r = row + dr;
      const c = col + dc;
      if (inside(r, c)) pushTarget(out, board, r * 8 + c, color);
    }
    const home = color === 'w' ? 7 : 0;
    const foe = other(color);
    if (row === home && col === 4 && !attacked(board, from, foe)) {
      const king = `${color}K`;
      const rook = `${color}R`;
      if (
        state.castling[king] &&
        board[home * 8 + 5] === null &&
        board[home * 8 + 6] === null &&
        board[home * 8 + 7] === rook &&
        !attacked(board, home * 8 + 5, foe) &&
        !attacked(board, home * 8 + 6, foe)
      ) {
        out.push(home * 8 + 6);
      }
      if (
        state.castling[`${color}Q`] &&
        board[home * 8 + 3] === null &&
        board[home * 8 + 2] === null &&
        board[home * 8 + 1] === null &&
        board[home * 8 + 0] === rook &&
        !attacked(board, home * 8 + 3, foe) &&
        !attacked(board, home * 8 + 2, foe)
      ) {
        out.push(home * 8 + 2);
      }
    }
    return out;
  }

  const dirs = type === 'B' ? DIAGONAL : type === 'R' ? STRAIGHT : ALL_DIRS;
  for (const [dr, dc] of dirs) {
    let r = row + dr;
    let c = col + dc;
    while (inside(r, c)) {
      const target = r * 8 + c;
      const victim = board[target];
      if (!victim) out.push(target);
      else {
        if (victim[0] !== color) out.push(target);
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return out;
}

export function findKing(board, color) {
  return board.indexOf(`${color}K`);
}

export function inCheck(state, color) {
  const king = findKing(state.board, color);
  if (king < 0) return false;
  return attacked(state.board, king, other(color));
}

export function applyMove(state, from, to) {
  const board = [...state.board];
  const piece = board[from];
  const color = piece[0];
  const type = piece[1];
  const castling = { ...state.castling };
  const fromRow = rowOf(from);
  const toRow = rowOf(to);
  const fromCol = colOf(from);
  const toCol = colOf(to);
  const victim = board[to];

  if (type === 'P' && fromCol !== toCol && !victim) {
    board[fromRow * 8 + toCol] = null;
  }

  if (type === 'K' && Math.abs(toCol - fromCol) === 2) {
    if (toCol === 6) {
      board[toRow * 8 + 5] = board[toRow * 8 + 7];
      board[toRow * 8 + 7] = null;
    } else {
      board[toRow * 8 + 3] = board[toRow * 8 + 0];
      board[toRow * 8 + 0] = null;
    }
  }

  if (type === 'K') {
    castling[`${color}K`] = false;
    castling[`${color}Q`] = false;
  }
  if (type === 'R') {
    if (from === 63) castling.wK = false;
    if (from === 56) castling.wQ = false;
    if (from === 7) castling.bK = false;
    if (from === 0) castling.bQ = false;
  }
  if (victim === 'wR') {
    if (to === 63) castling.wK = false;
    if (to === 56) castling.wQ = false;
  }
  if (victim === 'bR') {
    if (to === 7) castling.bK = false;
    if (to === 0) castling.bQ = false;
  }

  board[to] = type === 'P' && (toRow === 0 || toRow === 7) ? `${color}Q` : piece;
  board[from] = null;

  const ep = type === 'P' && Math.abs(toRow - fromRow) === 2 ? (fromRow + (toRow - fromRow) / 2) * 8 + toCol : null;

  return { board, turn: other(color), castling, ep, last: { from, to } };
}

export function legalMoves(state, from) {
  const piece = state.board[from];
  if (!piece || piece[0] !== state.turn) return [];
  return pseudoMoves(state, from).filter((to) => !inCheck(applyMove(state, from, to), piece[0]));
}

export function status(state) {
  const checked = inCheck(state, state.turn);
  for (let index = 0; index < 64; index += 1) {
    const piece = state.board[index];
    if (piece && piece[0] === state.turn && legalMoves(state, index).length) {
      return { over: false, checked };
    }
  }
  return {
    over: true,
    checked,
    winner: checked ? other(state.turn) : null,
    reason: checked ? 'checkmate' : 'stalemate',
  };
}