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
    // Issue #81 added a delay before onResult fires. These older tests assert
    // the call happened; flushing fake timers after each interaction keeps
    // them green without re-asserting the new timing behavior (which has its
    // own describe block below).
    jest.useFakeTimers();
  });
  afterEach(() => {
    act(() => { jest.runOnlyPendingTimers(); });
    jest.useRealTimers();
  });

  it("correct on first attempt emits 'firstTry'", () => {
    const onResult = jest.fn<void, [Outcome]>();
    render(
      <ReviewBoard fen={STARTING_FEN} correctMove={CORRECT_MOVE} onResult={onResult} />
    );
    act(() => {
      capturedOnPieceDrop(CORRECT_SOURCE, CORRECT_TARGET);
    });
    act(() => { jest.runOnlyPendingTimers(); }); // flush #81 hold delay
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
    act(() => { jest.runOnlyPendingTimers(); });
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
    act(() => { jest.runOnlyPendingTimers(); });
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
    act(() => { jest.runOnlyPendingTimers(); });
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith('failed');
    // Arrow should show the correct move, styled in the warm hint palette
    // (issue #82) rather than react-chessboard's default red.
    expect(capturedCustomArrows).toHaveLength(1);
    const [from, to, color] = capturedCustomArrows[0];
    expect(from).toBe(CORRECT_SOURCE);
    expect(to).toBe(CORRECT_TARGET);
    expect(color).toMatch(/212,165,116/); // warm tan accent
  });

  it('board ignores moves after resolution', () => {
    const onResult = jest.fn<void, [Outcome]>();
    render(
      <ReviewBoard fen={STARTING_FEN} correctMove={CORRECT_MOVE} onResult={onResult} />
    );
    // Resolve via correct first attempt
    act(() => { capturedOnPieceDrop(CORRECT_SOURCE, CORRECT_TARGET); });

    // Additional move after resolution should be ignored — onResult still
    // fires only once (after the hold delay, exercised by the dedicated
    // snap-back tests below)
    act(() => { capturedOnPieceDrop(WRONG_SOURCE, WRONG_TARGET); });

    // Advance past the hold delay so any pending onResult fires
    act(() => { jest.runOnlyPendingTimers(); });
    expect(onResult).toHaveBeenCalledTimes(1);
  });
});

describe('ReviewBoard — Issue #81: correct move lands on target square', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  // After e4, the post-move FEN places the pawn on e4 and flips side-to-move.
  // chess.js follows the strict FEN spec for the en-passant slot: it's only
  // populated when an opposing pawn could actually capture en passant. With
  // Black's pieces on their starting squares, no capture is possible, so the
  // slot stays '-' rather than 'e3'.
  const POST_E4_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

  it('on correct move, board position prop updates to the post-move FEN', () => {
    render(
      <ReviewBoard fen={STARTING_FEN} correctMove={CORRECT_MOVE} onResult={jest.fn<void, [Outcome]>()} />
    );
    act(() => { capturedOnPieceDrop(CORRECT_SOURCE, CORRECT_TARGET); });
    expect(screen.getByTestId('chessboard')).toHaveAttribute('data-position', POST_E4_FEN);
  });

  it('on wrong move, board position prop stays on the pre-move FEN (snap back)', () => {
    render(
      <ReviewBoard fen={STARTING_FEN} correctMove={CORRECT_MOVE} onResult={jest.fn<void, [Outcome]>()} />
    );
    act(() => { capturedOnPieceDrop(WRONG_SOURCE, WRONG_TARGET); });
    expect(screen.getByTestId('chessboard')).toHaveAttribute('data-position', STARTING_FEN);
  });

  it('onResult fires only after the hold delay so the post-move position is visible', () => {
    const onResult = jest.fn<void, [Outcome]>();
    render(
      <ReviewBoard fen={STARTING_FEN} correctMove={CORRECT_MOVE} onResult={onResult} />
    );
    act(() => { capturedOnPieceDrop(CORRECT_SOURCE, CORRECT_TARGET); });
    expect(onResult).not.toHaveBeenCalled(); // not synchronous
    act(() => { jest.advanceTimersByTime(699); });
    expect(onResult).not.toHaveBeenCalled(); // still within hold window
    act(() => { jest.advanceTimersByTime(1); });
    expect(onResult).toHaveBeenCalledWith('firstTry'); // fires at the boundary
  });

  it('when fen prop changes to a new card, displayed position follows', () => {
    const { rerender } = render(
      <ReviewBoard fen={STARTING_FEN} correctMove={CORRECT_MOVE} onResult={jest.fn<void, [Outcome]>()} />
    );
    act(() => { capturedOnPieceDrop(CORRECT_SOURCE, CORRECT_TARGET); });
    act(() => { jest.advanceTimersByTime(2000); }); // flush the hold

    // Parent advances to a new card with a different FEN
    const NEXT_FEN = 'rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPPPPPP/RNBQKBNR w KQkq e6 0 2';
    rerender(
      <ReviewBoard fen={NEXT_FEN} correctMove="d4" onResult={jest.fn<void, [Outcome]>()} />
    );
    expect(screen.getByTestId('chessboard')).toHaveAttribute('data-position', NEXT_FEN);
  });
});
