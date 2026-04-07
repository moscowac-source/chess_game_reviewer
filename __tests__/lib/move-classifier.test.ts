import { classifyMove } from '@/lib/move-classifier'

describe('classifyMove', () => {
  describe('blunder (CPL > 200)', () => {
    it('classifies a move as blunder when CPL is 201', () => {
      expect(classifyMove(201, 'e4', 'd4', 20)).toBe('blunder')
    })
  })

  describe('mistake (CPL 100–200)', () => {
    it('classifies a move as mistake when CPL is 150', () => {
      expect(classifyMove(150, 'e4', 'd4', 20)).toBe('mistake')
    })
  })

  describe('great (matches engine top choice with alternatives)', () => {
    it('classifies as great when move matches bestMove and alternatives exist', () => {
      expect(classifyMove(0, 'e4', 'e4', 20)).toBe('great')
    })
  })

  describe('edge cases', () => {
    it('CPL exactly 201 is a blunder', () => {
      expect(classifyMove(201, 'e4', 'd4', 20)).toBe('blunder')
    })

    it('CPL exactly 200 is a mistake, not a blunder', () => {
      expect(classifyMove(200, 'e4', 'd4', 20)).toBe('mistake')
    })

    it('CPL exactly 100 is a mistake', () => {
      expect(classifyMove(100, 'e4', 'd4', 20)).toBe('mistake')
    })

    it('CPL exactly 99 is null (unremarkable move)', () => {
      expect(classifyMove(99, 'e4', 'd4', 20)).toBeNull()
    })

    it('forced move (legalMoveCount=1) matching bestMove is null, not great', () => {
      expect(classifyMove(0, 'e4', 'e4', 1)).toBeNull()
    })

    it('move that does not match bestMove with low CPL is null', () => {
      expect(classifyMove(50, 'e4', 'd4', 20)).toBeNull()
    })
  })
})
