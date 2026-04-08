import { render, screen, act } from '@testing-library/react';
import { ReviewBoard } from '../../components/ReviewBoard';

// Capture the onPieceDrop callback so tests can simulate moves directly.
// We mock react-chessboard because testing drag-and-drop at the DOM level
// is fragile — what we care about is our own validation logic.
let capturedOnPieceDrop: (
  sourceSquare: string,
  targetSquare: string
) => boolean = () => false;

jest.mock('react-chessboard', () => ({
  Chessboard: ({ onPieceDrop, position }: { onPieceDrop: (src: string, tgt: string) => boolean; position: string }) => {
    capturedOnPieceDrop = onPieceDrop;
    return <div data-testid="chessboard" data-position={position} />;
  },
}));

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('ReviewBoard', () => {
  it('renders a chessboard with the given FEN position', () => {
    render(
      <ReviewBoard
        fen={STARTING_FEN}
        correctMove="e4"
        onResult={jest.fn()}
      />
    );

    const board = screen.getByTestId('chessboard');
    expect(board).toBeInTheDocument();
    expect(board).toHaveAttribute('data-position', STARTING_FEN);
  });

  it("calls onResult('correct') when the correct move is played", () => {
    const onResult = jest.fn();
    render(
      <ReviewBoard
        fen={STARTING_FEN}
        correctMove="e4"
        onResult={onResult}
      />
    );

    act(() => {
      capturedOnPieceDrop('e2', 'e4');
    });

    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith('correct');
  });

  it("calls onResult('incorrect') when a legal but wrong move is played", () => {
    const onResult = jest.fn();
    render(
      <ReviewBoard
        fen={STARTING_FEN}
        correctMove="e4"
        onResult={onResult}
      />
    );

    // d4 is a legal move but not the correct answer (e4)
    act(() => {
      capturedOnPieceDrop('d2', 'd4');
    });

    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith('incorrect');
  });

  it('rejects an illegal move without calling onResult', () => {
    const onResult = jest.fn();
    render(
      <ReviewBoard
        fen={STARTING_FEN}
        correctMove="e4"
        onResult={onResult}
      />
    );

    // e2 to e5 is not a legal pawn move
    let result: boolean;
    act(() => {
      result = capturedOnPieceDrop('e2', 'e5');
    });

    expect(onResult).not.toHaveBeenCalled();
    expect(result!).toBe(false);
  });
});
