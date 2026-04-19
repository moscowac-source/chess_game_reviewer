// Interactive chess board — renders a FEN, accepts click-to-move input,
// shows highlights for last/selected/hint/good/bad squares.
// Board style & piece set are controlled by data-attributes on a wrapping element
// (wired via Tweaks).

const { useState, useEffect, useMemo, useRef } = React;

const GLYPHS_CLASSIC = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟︎",
};
// "Outline" uses the same Unicode but will be styled differently via CSS.

function Board({
  fen,
  flipped = false,
  onMove,          // (from, to) => void
  lastMove,        // {from, to}
  hintSquare,      // square to pulse as hint
  feedback,        // "good" | "bad" | null (colors the played square)
  playedMove,      // {from, to} to highlight with feedback
  overlayMove,     // {from, to} to show with connecting arrow (reveal)
  disabled = false,
  size = 520,
  coords = true,
  pieceSet = "classic", // classic | outline | bold
  boardStyle = "paper", // paper | wood | flat
}) {
  const [selected, setSelected] = useState(null);
  const { board } = useMemo(() => window.ChessLogic.parseFEN(fen), [fen]);

  useEffect(() => { setSelected(null); }, [fen]);

  const files = flipped ? ["h","g","f","e","d","c","b","a"] : ["a","b","c","d","e","f","g","h"];
  const ranks = flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];

  function handleSquareClick(sq) {
    if (disabled) return;
    if (!selected) {
      const piece = window.ChessLogic.getPieceAt(board, sq);
      if (!piece) return;
      setSelected(sq);
    } else {
      if (sq === selected) { setSelected(null); return; }
      onMove && onMove(selected, sq);
      setSelected(null);
    }
  }

  const glyphs = GLYPHS_CLASSIC;

  const squares = [];
  for (let rIdx = 0; rIdx < 8; rIdx++) {
    for (let fIdx = 0; fIdx < 8; fIdx++) {
      const r = flipped ? 7 - rIdx : rIdx;
      const c = flipped ? 7 - fIdx : fIdx;
      const sq = window.ChessLogic.coordsToSq(r, c);
      const piece = board[r][c];
      const isLight = (r + c) % 2 === 0;
      const isSelected = selected === sq;
      const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq);
      const isHint = hintSquare === sq;
      const isPlayed = playedMove && (playedMove.from === sq || playedMove.to === sq);
      const isOverlayFrom = overlayMove && overlayMove.from === sq;
      const isOverlayTo = overlayMove && overlayMove.to === sq;

      squares.push(
        <div
          key={sq}
          className={`sq ${isLight ? "light" : "dark"}`}
          data-sq={sq}
          data-piece={piece || ""}
          onClick={() => handleSquareClick(sq)}
          style={{
            gridRow: rIdx + 1, gridColumn: fIdx + 1,
            cursor: piece || selected ? "pointer" : "default",
          }}
        >
          {isLast && <div className="hl hl-last" />}
          {isHint && <div className="hl hl-hint" />}
          {isPlayed && feedback === "good" && <div className="hl hl-good" />}
          {isPlayed && feedback === "bad" && <div className="hl hl-bad" />}
          {isSelected && <div className="hl hl-sel" />}
          {isOverlayFrom && <div className="hl hl-reveal-from" />}
          {isOverlayTo && <div className="hl hl-reveal-to" />}

          {piece && (
            <span className={`pc pc-${pieceSet}`} data-color={piece === piece.toUpperCase() ? "w" : "b"}>
              {glyphs[piece]}
            </span>
          )}

          {coords && fIdx === 0 && (
            <span className={`coord rank ${isLight ? "on-light" : "on-dark"}`}>{ranks[rIdx]}</span>
          )}
          {coords && rIdx === 7 && (
            <span className={`coord file ${isLight ? "on-light" : "on-dark"}`}>{files[fIdx]}</span>
          )}
        </div>
      );
    }
  }

  return (
    <div className={`board board-${boardStyle}`} style={{ width: size, height: size }}>
      <div className="grid">{squares}</div>
      <BoardCSS />
    </div>
  );
}

function BoardCSS() {
  return (
    <style>{`
      .board { position: relative; user-select: none; border: 1px solid var(--line); background: var(--bg-2); }
      .board-paper { box-shadow: 0 30px 60px -30px rgba(26,26,26,0.35), 0 2px 0 rgba(26,26,26,0.04) inset; }
      .board-wood {
        box-shadow:
          0 30px 60px -30px rgba(42,30,18,0.55),
          0 0 0 6px #3a2612,
          0 0 0 7px rgba(0,0,0,0.25);
      }
      .board-flat { box-shadow: none; border-color: var(--ink); }

      .board .grid {
        position: absolute; inset: 0;
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        grid-template-rows: repeat(8, 1fr);
      }

      .board .sq { position: relative; display: flex; align-items: center; justify-content: center; }
      .board .sq.light { background: var(--sq-light); }
      .board .sq.dark  { background: var(--sq-dark); }

      .board-wood .sq.light { background: #e8cfa0; background-image: linear-gradient(180deg, #efd6a8, #e1c48e); }
      .board-wood .sq.dark  { background: #8a5a2a; background-image: linear-gradient(180deg, #9b6834, #7a4f25); }
      .board-flat .sq.light { background: #efece6; }
      .board-flat .sq.dark  { background: #2a2a28; }

      .board .pc {
        font-size: calc(min(var(--sqsize, 60px), 9vmin));
        line-height: 1;
        position: relative; z-index: 2;
      }
      .board .pc { font-size: 54px; }
      .board .pc[data-color="w"] { color: #f8f4ea; text-shadow: 0 1px 0 rgba(0,0,0,0.35), 0 0 1px #000, 0 0 0.5px #000; }
      .board .pc[data-color="b"] { color: #1a1a1a; text-shadow: 0 1px 0 rgba(255,255,255,0.08); }

      .board .pc-outline[data-color="w"] { color: transparent; -webkit-text-stroke: 1.5px #f6f1e3; text-shadow: none; }
      .board .pc-outline[data-color="b"] { color: transparent; -webkit-text-stroke: 1.5px #1a1a1a; text-shadow: none; }

      .board .pc-bold { font-weight: 900; }

      .board .hl { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
      .board .hl-last { background: rgba(212, 165, 116, 0.35); }
      .board .hl-sel  { box-shadow: inset 0 0 0 3px var(--amber); background: rgba(212,165,116,0.25); }
      .board .hl-hint {
        background:
          radial-gradient(circle at center, rgba(212,165,116,0.55) 0%, rgba(212,165,116,0.55) 30%, transparent 32%);
        animation: pulse-hint 1.6s ease-in-out infinite;
      }
      .board .hl-good { background: rgba(79,107,74,0.45); box-shadow: inset 0 0 0 3px var(--good); }
      .board .hl-bad  { background: rgba(166,74,63,0.40); box-shadow: inset 0 0 0 3px var(--bad); }
      .board .hl-reveal-from { box-shadow: inset 0 0 0 3px var(--ink); }
      .board .hl-reveal-to   { box-shadow: inset 0 0 0 3px var(--ink); background: rgba(26,26,26,0.08); }

      @keyframes pulse-hint {
        0%, 100% { opacity: .55; }
        50% { opacity: 1; }
      }

      .board .coord {
        position: absolute; font-family: var(--mono); font-size: 9px; opacity: .55;
        pointer-events: none; z-index: 2;
      }
      .board .coord.rank { left: 3px; top: 2px; }
      .board .coord.file { right: 4px; bottom: 2px; }
      .board .coord.on-light { color: var(--sq-dark); }
      .board .coord.on-dark  { color: var(--sq-light); }

      .board-flat .coord.on-light { color: #2a2a28; }
      .board-flat .coord.on-dark  { color: #efece6; }
    `}</style>
  );
}

window.Board = Board;
