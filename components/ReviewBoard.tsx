import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

interface ReviewBoardProps {
  fen: string;
  correctMove: string;
  onResult: (result: 'correct' | 'incorrect') => void;
}

export function ReviewBoard({ fen, correctMove, onResult }: ReviewBoardProps) {
  function onPieceDrop(sourceSquare: string, targetSquare: string): boolean {
    const chess = new Chess(fen);

    let move;
    try {
      move = chess.move({ from: sourceSquare, to: targetSquare });
    } catch {
      return false; // illegal move — snap piece back, don't call onResult
    }

    if (move.san === correctMove) {
      onResult('correct');
    } else {
      onResult('incorrect');
    }

    return true;
  }

  return (
    <Chessboard
      position={fen}
      onPieceDrop={onPieceDrop}
    />
  );
}
