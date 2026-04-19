// Minimal FEN utilities + move checking for the prototype.
// We don't need a full legal move generator — just:
//   - parse FEN -> 8x8 board with pieces and side-to-move
//   - render a move: apply "from/to" producing a preview position
//   - validate user input against the card's correct move (from+to)
//   - list candidate squares for a given piece (used for hints)

function parseFEN(fen) {
  const [placement, stm, , , ,] = fen.split(" ");
  const rows = placement.split("/");
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let r = 0; r < 8; r++) {
    let file = 0;
    for (const ch of rows[r]) {
      if (/[1-8]/.test(ch)) {
        file += parseInt(ch, 10);
      } else {
        board[r][file] = ch; // r=0 is rank 8 top
        file += 1;
      }
    }
  }
  return { board, stm };
}

function sqToCoords(sq) {
  // sq like "e4" -> {r, c}   r: 0..7 top->bottom (rank 8 at r=0)
  const file = sq.charCodeAt(0) - 97;      // a=0
  const rank = parseInt(sq[1], 10);         // 1..8
  return { r: 8 - rank, c: file };
}
function coordsToSq(r, c) {
  return String.fromCharCode(97 + c) + (8 - r);
}

function getPieceAt(board, sq) {
  const { r, c } = sqToCoords(sq);
  return board[r][c];
}

function applyMove(fen, from, to) {
  const { board, stm } = parseFEN(fen);
  const a = sqToCoords(from), b = sqToCoords(to);
  const piece = board[a.r][a.c];
  board[a.r][a.c] = null;
  board[b.r][b.c] = piece;
  // castling: if king moved two files, move the rook too
  if (piece && (piece === "K" || piece === "k") && Math.abs(a.c - b.c) === 2) {
    const row = a.r;
    if (b.c === 6) { // kingside
      board[row][5] = board[row][7];
      board[row][7] = null;
    } else if (b.c === 2) { // queenside
      board[row][3] = board[row][0];
      board[row][0] = null;
    }
  }
  return { board, stm: stm === "w" ? "b" : "w" };
}

// validate user's selected from+to against the card's correct move
function isCorrectMove(card, from, to) {
  return card.correct.from === from && card.correct.to === to;
}

// The piece class for the hinted square
function hintSquare(card) {
  return card.correct.from;
}

// Return list of occupied squares holding a given piece char
function squaresHolding(board, pieceChar) {
  const out = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (board[r][c] === pieceChar) out.push(coordsToSq(r, c));
  }
  return out;
}

window.ChessLogic = { parseFEN, applyMove, isCorrectMove, hintSquare, squaresHolding, sqToCoords, coordsToSq, getPieceAt };
