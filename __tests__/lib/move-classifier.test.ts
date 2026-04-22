import { classifyMove } from '@/lib/move-classifier'

// Shorthand: the extra args (legalMoveCount, fullmove) matter only for 'great'.
// For blunder/mistake tests, we pass permissive defaults.
const MID = 15 // fullmove deep enough to clear the great-guard
const WIDE = 20 // legal-move count high enough to clear the great-guard

describe('classifyMove', () => {
  describe('blunder (CPL > 200)', () => {
    it('classifies a move as blunder when CPL is 201', () => {
      expect(classifyMove(201, 'e4', 'd4', WIDE, MID)).toBe('blunder')
    })
  })

  describe('mistake (CPL 100–200)', () => {
    it('classifies a move as mistake when CPL is 150', () => {
      expect(classifyMove(150, 'e4', 'd4', WIDE, MID)).toBe('mistake')
    })
  })

  describe('great (tightened — issue #78)', () => {
    it('classifies as great when move matches bestMove past opening with many alternatives and clean CPL', () => {
      expect(classifyMove(0, 'e4', 'e4', WIDE, MID)).toBe('great')
    })

    it('does NOT flag great in opening (fullmove < 12) even if move matches bestMove', () => {
      expect(classifyMove(0, 'e4', 'e4', WIDE, 1)).toBeNull()
      expect(classifyMove(0, 'Nf3', 'Nf3', WIDE, 11)).toBeNull()
    })

    it('does NOT flag great when legal moves < 8 (forced/near-forced position)', () => {
      expect(classifyMove(0, 'Kh1', 'Kh1', 7, MID)).toBeNull()
    })

    it('does NOT flag great when CPL > 10 (eval noise)', () => {
      expect(classifyMove(11, 'e4', 'e4', WIDE, MID)).toBeNull()
    })

    it('allows great at exactly fullmove 12, legal=8, cpl=10 (boundary)', () => {
      expect(classifyMove(10, 'e4', 'e4', 8, 12)).toBe('great')
    })
  })

  describe('edge cases', () => {
    it('CPL exactly 201 is a blunder', () => {
      expect(classifyMove(201, 'e4', 'd4', WIDE, MID)).toBe('blunder')
    })

    it('CPL exactly 200 is a mistake, not a blunder', () => {
      expect(classifyMove(200, 'e4', 'd4', WIDE, MID)).toBe('mistake')
    })

    it('CPL exactly 100 is a mistake', () => {
      expect(classifyMove(100, 'e4', 'd4', WIDE, MID)).toBe('mistake')
    })

    it('CPL exactly 99 is null (unremarkable move)', () => {
      expect(classifyMove(99, 'e4', 'd4', WIDE, MID)).toBeNull()
    })

    it('forced move (legalMoveCount=1) matching bestMove is null, not great', () => {
      expect(classifyMove(0, 'e4', 'e4', 1, MID)).toBeNull()
    })

    it('move that does not match bestMove with low CPL is null', () => {
      expect(classifyMove(50, 'e4', 'd4', WIDE, MID)).toBeNull()
    })
  })
})
