import { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Arrow, Square } from 'react-chessboard/dist/chessboard/types';
import { Chess } from 'chess.js';

export type Outcome = 'firstTry' | 'afterHint' | 'afterAttempts' | 'failed';

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

export function ReviewBoard({ fen, correctMove, onResult, onWrongAttempt, boardOrientation = 'white' }: ReviewBoardProps) {
  const [attempts, setAttempts] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [hintSquare, setHintSquare] = useState<string | null>(null);
  const [revealArrow, setRevealArrow] = useState<Arrow | null>(null);

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
      if (attempts === 0) {
        onResult('firstTry');
      } else if (attempts === 1) {
        onResult('afterHint');
      } else {
        onResult('afterAttempts');
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
        onResult('failed');
      }
    }

    return true;
  }

  const customSquareStyles: Record<string, React.CSSProperties> = hintSquare
    ? { [hintSquare]: { background: 'rgba(212,165,116,0.55)' } }
    : {};

  const customArrows: Arrow[] = revealArrow ? [revealArrow] : [];

  return (
    <Chessboard
      position={fen}
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
