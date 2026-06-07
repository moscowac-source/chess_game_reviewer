import { useEffect, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Arrow, Square } from 'react-chessboard/dist/chessboard/types';
import { Chess } from 'chess.js';

export type Outcome = 'firstTry' | 'afterHint' | 'afterAttempts' | 'failed';

// How long the post-move position stays on the board before we hand control
// back to the parent. Long enough that the user registers their piece landing
// on the target square (issue #81); short enough not to feel laggy.
const POST_MOVE_HOLD_MS = 700;

interface ReviewBoardProps {
  fen: string;
  correctMove: string;
  onResult: (outcome: Outcome) => void;
  onWrongAttempt?: (count: number) => void;
  boardOrientation?: 'white' | 'black';
}

function getCorrectMoveSquares(
  fen: string,
  correctMove: string
): { from: string; to: string } | null {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  const match = moves.find((m) => m.san === correctMove);
  return match ? { from: match.from, to: match.to } : null;
}

function fenAfterMove(fen: string, san: string): string | null {
  try {
    const chess = new Chess(fen);
    if (!chess.move(san)) return null;
    return chess.fen();
  } catch {
    return null;
  }
}

export function ReviewBoard({ fen, correctMove, onResult, onWrongAttempt, boardOrientation = 'white' }: ReviewBoardProps) {
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [hintSquare, setHintSquare] = useState<string | null>(null);
  const [revealArrow, setRevealArrow] = useState<Arrow | null>(null);
  // displayedFen lets the board reflect the *post-move* position after a
  // correct answer instead of snapping back to the starting FEN (issue #81).
  // For wrong moves it stays on the original fen so react-chessboard does its
  // normal snap-back, which is the correct UX there.
  const [displayedFen, setDisplayedFen] = useState(fen);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset internal state whenever the parent advances to a new card. Without
  // this, displayedFen would stick on the previous card's post-move position
  // and `resolved` would block input on the new card.
  useEffect(() => {
    setAttempts(0);
    setResolved(false);
    setHintSquare(null);
    setRevealArrow(null);
    setDisplayedFen(fen);
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, [fen]);

  // Clean up any pending hold timer if the component unmounts mid-hold —
  // otherwise React fires onResult against a stale parent.
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  function scheduleResult(outcome: Outcome) {
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      onResult(outcome);
    }, POST_MOVE_HOLD_MS);
  }

  function onPieceDrop(sourceSquare: string, targetSquare: string): boolean {
    if (resolved) return false;

    const chess = new Chess(fen);
    let move;
    try {
      move = chess.move({ from: sourceSquare, to: targetSquare });
    } catch {
      return false;
    }

    const newAttempts = attempts + 1;

    if (move.san === correctMove) {
      setResolved(true);
      // Show the piece on its destination square for the hold window before
      // the parent advances to the next card.
      const after = fenAfterMove(fen, correctMove);
      if (after) setDisplayedFen(after);
      if (attempts === 0) {
        scheduleResult('firstTry');
      } else if (attempts === 1) {
        scheduleResult('afterHint');
      } else {
        scheduleResult('afterAttempts');
      }
    } else {
      setAttempts(newAttempts);
      onWrongAttempt?.(newAttempts);
      if (newAttempts === 1) {
        const squares = getCorrectMoveSquares(fen, correctMove);
        if (squares) setHintSquare(squares.from);
      } else if (newAttempts >= 3) {
        const squares = getCorrectMoveSquares(fen, correctMove);
        if (squares) setRevealArrow([squares.from as Square, squares.to as Square]);
        setResolved(true);
        scheduleResult('failed');
      }
    }

    return true;
  }

  // Hint uses an inset ring so the warm-tan outline reads on BOTH light and
  // dark squares — a 55%-alpha background fill (issue #82) washed out on dark.
  // The ring sits ON the square rather than tinting it, so contrast is square-
  // color-independent.
  const customSquareStyles: Record<string, React.CSSProperties> = hintSquare
    ? { [hintSquare]: { boxShadow: 'inset 0 0 0 4px rgba(212,165,116,0.95)' } }
    : {};

  // react-chessboard's Arrow type expects [from, to, color?]; we pass the warm
  // accent so the reveal arrow matches the hint palette instead of the default
  // bright red.
  const HINT_ACCENT = 'rgba(212,165,116,0.95)';
  const customArrows: Arrow[] = revealArrow
    ? [[revealArrow[0], revealArrow[1], HINT_ACCENT] as Arrow]
    : [];

  return (
    <Chessboard
      position={displayedFen}
      onPieceDrop={onPieceDrop}
      customSquareStyles={customSquareStyles}
      customArrows={customArrows}
      boardOrientation={boardOrientation}
      customBoardStyle={{
        boxShadow: '0 30px 60px -30px rgba(26,26,26,0.35)',
        borderRadius: 0,
      }}
      customDarkSquareStyle={{ backgroundColor: 'var(--sq-dark)' }}
      customLightSquareStyle={{ backgroundColor: 'var(--sq-light)' }}
    />
  );
}
