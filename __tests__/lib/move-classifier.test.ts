import { classifyMove } from '@/lib/move-classifier'

describe('classifyMove', () => {
  describe('blunder (CPL > 200)', () => {
    it('classifies a move as blunder when CPL is 201', () => {
      expect(classifyMove(201, 'e4', 'd4', 20, 12)).toBe('blunder')
    })
  })

  describe('mistake (CPL 100–200)', () => {
    it('classifies a move as mistake when CPL is 150', () => {
      expect(classifyMove(150, 'e4', 'd4', 20, 12)).toBe('mistake')
    })
  })

  describe('great (matches engine top choice with alternatives)', () => {
    it('classifies as great when move matches bestMove past the opening', () => {
      // Past the opening-book window (fullmove > 8), a best-match move with
      // realistic alternatives is genuinely interesting to drill.
      expect(classifyMove(0, 'e4', 'e4', 20, 12)).toBe('great')
    })
  })

  describe('edge cases', () => {
    it('CPL exactly 201 is a blunder regardless of fullmove', () => {
      expect(classifyMove(201, 'e4', 'd4', 20, 2)).toBe('blunder')
    })

    it('CPL exactly 200 is a mistake, not a blunder', () => {
      expect(classifyMove(200, 'e4', 'd4', 20, 12)).toBe('mistake')
    })

    it('CPL exactly 100 is a mistake', () => {
      expect(classifyMove(100, 'e4', 'd4', 20, 12)).toBe('mistake')
    })

    it('CPL exactly 99 is null (unremarkable move)', () => {
      expect(classifyMove(99, 'e4', 'd4', 20, 12)).toBeNull()
    })

    it('forced move (legalMoveCount=1) matching bestMove is null, not great', () => {
      expect(classifyMove(0, 'e4', 'e4', 1, 12)).toBeNull()
    })

    it('move that does not match bestMove with low CPL is null', () => {
      expect(classifyMove(50, 'e4', 'd4', 20, 12)).toBeNull()
    })
  })

  describe("opening-window filter on 'great' (issue #78)", () => {
    // Standard opening theory generates noise cards — fullmove 1..8 is the
    // book window where every reasonable move is within a handful of cp of
    // the engine's top. Suppress 'great' there, but leave the
    // blunder/mistake classifications alone so genuine early errors still
    // surface (a real blunder on move 3 is still a blunder).
    it("suppresses 'great' on the literal starting position (fullmove 1)", () => {
      expect(classifyMove(0, 'e4', 'e4', 20, 1)).toBeNull()
    })

    it("suppresses 'great' at fullmove 8 (last opening-book move)", () => {
      expect(classifyMove(0, 'Nf3', 'Nf3', 20, 8)).toBeNull()
    })

    it("allows 'great' at fullmove 9 (first middlegame move)", () => {
      expect(classifyMove(0, 'Nf3', 'Nf3', 20, 9)).toBe('great')
    })

    it("blunder on move 3 still surfaces despite opening-window filter", () => {
      expect(classifyMove(350, 'Qh5??', 'd4', 20, 3)).toBe('blunder')
    })

    it("mistake on move 5 still surfaces despite opening-window filter", () => {
      expect(classifyMove(150, 'h6', 'Nc6', 20, 5)).toBe('mistake')
    })
  })
})
