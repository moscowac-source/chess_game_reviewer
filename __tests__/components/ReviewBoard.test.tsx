import { render, screen, act } from '@testing-library/react';
import type { Arrow } from 'react-chessboard/dist/chessboard/types';
import { ReviewBoard } from '../../components/ReviewBoard';

type Outcome = 'firstTry' | 'afterHint' | 'afterAttempts' | 'failed';

// Capture callbacks/props from the Chessboard mock so tests can simulate moves
// and inspect rendered state without touching the drag-and-drop DOM.
let capturedOnPieceDrop: (src: string, tgt: string) => boolean = () => false;
let capturedCustomSquareStyles: Record<string, React.CSSProperties> = {};
let capturedCustomArrows: Arrow[] = [];

jest.mock('react-chessboard', () => ({
  Chessboard: ({
    onPieceDrop,
    position,
    customSquareStyles,
    customArrows,
  }: {
    onPieceDrop: (src: string, tgt: string) => boolean;
    position: string;
    customSquareStyles?: Record<string, React.CSSProperties>;
    customArrows?: Arrow[];
  }) => {
    capturedOnPieceDrop = onPieceDrop;
    capturedCustomSquareStyles = customSquareStyles ?? {};
    capturedCustomArrows = customArrows ?? [];
    return <div data-testid="chessboard" data-position={position} />;
  },
}));

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// e4 is the correct move; the pawn starts on e2.
const CORRECT_MOVE = 'e4';
const CORRECT_SOURCE = 'e2';
const CORRECT_TARGET = 'e4';
const WRONG_SOURCE = 'd2';
const WRONG_TARGET = 'd4'; // legal but not the answer

describe('ReviewBoard — Phase 14: Core Move Validation', () => {
  it('renders a chessboard with the given FEN position', () => {
    render(
      <ReviewBoard fen={STARTING_FEN} correctMove={CORRECT_MOVE} onResult={jest.fn<void, [Outcome]>()} />
    );
    const board = screen.getByTestId('chessboard');
    expect(board).toBeInTheDocument();
    expect(board).toHaveAttribute('data-position', STARTING_FEN);
  });

  it('rejects an illegal move without calling onResult', () => {
    const onResult = jest.fn<void, [Outcome]>();
    render(
      <ReviewBoard fen={STARTING_FEN} correctMove={CORRECT_MOVE} onResult={onResult} />
    );
    let result: boolean;
    act(() => {
      result = capturedOnPieceDrop('e2', 'e5'); // not a legal pawn move
    });
    expect(onResult).not.toHaveBeenCalled();
    expect(result!).toBe(false);
  });
});

describe('ReviewBoard — Phase 15: Hint + Multi-Attempt Flow', () => {
  beforeEach(() => {
    capturedCustomSquareStyles = {};
    capturedCustomArrows = [];
  });

  it("correct on first attempt emits 'firstTry'", () => {
    const onResult = jest.fn<void, [Outcome]>();
    render(
      <ReviewBoard fen={STARTING_FEN} correctMove={CORRECT_MOVE} onResult={onResult} />
    );
    act(() => {
      capturedOnPieceDrop(CORRECT_SOURCE, CORRECT_TARGET);
    });
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith('firstTry');
  });

  it('wrong first attempt does not call onResult and highlights the correct piece square', () => {
    const onResult = jest.fn<void, [Outcome]>();
    render(
      <ReviewBoard fen={STARTING_FEN} correctMove={CORRECT_MOVE} onResult={onResult} />
    );
    act(() => {
      capturedOnPieceDrop(WRONG_SOURCE, WRONG_TARGET);
    });
    expect(onResult).not.toHaveBeenCalled();
    expect(capturedCustomSquareStyles[CORRECT_SOURCE]).toBeDefined();
  });

  it("correct on attempt 2 emits 'afterHint'", () => {
    const onResult = jest.fn<void, [Outcome]>();
    render(
      <ReviewBoard fen={STARTING_FEN} correctMove={CORRECT_MOVE} onResult={onResult} />
    );
    act(() => { capturedOnPieceDrop(WRONG_SOURCE, WRONG_TARGET); }); // attempt 1 — wrong
    act(() => { capturedOnPieceDrop(CORRECT_SOURCE, CORRECT_TARGET); }); // attempt 2 — correct
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith('afterHint');
  });

  it("correct on attempt 3 emits 'afterAttempts'", () => {
    const onResult = jest.fn<void, [Outcome]>();
    render(
      <ReviewBoard fen={STARTING_FEN} correctMove={CORRECT_MOVE} onResult={onResult} />
    );
    act(() => { capturedOnPieceDrop(WRONG_SOURCE, WRONG_TARGET); }); // attempt 1 — wrong
    act(() => { capturedOnPieceDrop(WRONG_SOURCE, WRONG_TARGET); }); // attempt 2 — wrong
    act(() => { capturedOnPieceDrop(CORRECT_SOURCE, CORRECT_TARGET); }); // attempt 3 — correct
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith('afterAttempts');
  });

  it("three wrong attempts emits 'failed' and reveals the correct move", () => {
    const onResult = jest.fn<void, [Outcome]>();
    render(
      <ReviewBoard fen={STARTING_FEN} correctMove={CORRECT_MOVE} onResult={onResult} />
    );
    act(() => { capturedOnPieceDrop(WRONG_SOURCE, WRONG_TARGET); });
    act(() => { capturedOnPieceDrop(WRONG_SOURCE, WRONG_TARGET); });
    act(() => { capturedOnPieceDrop(WRONG_SOURCE, WRONG_TARGET); });
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith('failed');
    // Arrow should show the correct move
    expect(capturedCustomArrows).toContainEqual([CORRECT_SOURCE, CORRECT_TARGET] as Arrow);
  });

  it('board ignores moves after resolution', () => {
    const onResult = jest.fn<void, [Outcome]>();
    render(
      <ReviewBoard fen={STARTING_FEN} correctMove={CORRECT_MOVE} onResult={onResult} />
    );
    // Resolve via correct first attempt
    act(() => { capturedOnPieceDrop(CORRECT_SOURCE, CORRECT_TARGET); });
    expect(onResult).toHaveBeenCalledTimes(1);

    // Additional move after resolution should be ignored
    act(() => { capturedOnPieceDrop(WRONG_SOURCE, WRONG_TARGET); });
    expect(onResult).toHaveBeenCalledTimes(1); // still only 1 call
  });
});
