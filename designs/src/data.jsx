// ------ Fixture data for the prototype ------

// Pieces use chess.com-style single letters: uppercase white, lowercase black.
// FENs below are all real, legal positions crafted for the prototype.

const GAMES = [
  { id: "g-2041", opp: "silent_knight88",  result: "loss", tc: "rapid 10+0",  date: "Apr 17", moves: 42, eco: "B22 Sicilian, Alapin", found: 3 },
  { id: "g-2040", opp: "parallax_rook",    result: "win",  tc: "blitz 5+0",   date: "Apr 17", moves: 36, eco: "C50 Italian Game",     found: 2 },
  { id: "g-2039", opp: "endgame_ember",    result: "loss", tc: "rapid 15+10", date: "Apr 16", moves: 58, eco: "D02 London System",   found: 4 },
  { id: "g-2038", opp: "QuietQueen",       result: "draw", tc: "blitz 3+2",   date: "Apr 16", moves: 71, eco: "A45 Trompowsky",      found: 1 },
  { id: "g-2037", opp: "nocturne_ns",      result: "win",  tc: "rapid 10+0",  date: "Apr 15", moves: 28, eco: "B01 Scandinavian",    found: 2 },
  { id: "g-2036", opp: "oblique_pawn",     result: "loss", tc: "bullet 1+0",  date: "Apr 15", moves: 48, eco: "C02 French, Advance", found: 5 },
  { id: "g-2035", opp: "minor_key_j",      result: "win",  tc: "daily",       date: "Apr 14", moves: 39, eco: "E60 King's Indian",   found: 2 },
  { id: "g-2034", opp: "thermal_bishop",   result: "loss", tc: "rapid 10+0",  date: "Apr 13", moves: 33, eco: "B10 Caro-Kann",       found: 3 },
];

// Cards: positions surfaced from the user's games.
// Each card has a FEN, the move the user played (wrong), the correct move, and SAN-style notation.
// `kind` drives UI framing: blunder / mistake / brilliant / great.
// `toMove` is inferred from FEN ("w" or "b"); we store it explicitly for convenience.

const CARDS = [
  {
    id: "c-001",
    kind: "blunder",
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    toMove: "w",
    played: { from: "f3", to: "g5", san: "Ng5?" },
    correct: { from: "e1", to: "g1", san: "O-O", piece: "K", kingside: true },
    cpl: 312, reps: 2, nextDue: "today", game: "g-2040",
    theme: "Castle before attacking",
    note: "You reached for the attack a tempo early. King safety first — castles, then break with d4.",
  },
  {
    id: "c-002",
    kind: "brilliant",
    fen: "r4rk1/pp2ppbp/2n3p1/q1pp4/3P4/2P1PN2/PP1NBPPP/R2QK2R b KQ - 0 10",
    toMove: "b",
    played: { from: "c6", to: "d4", san: "Nxd4!" },
    correct: { from: "c6", to: "d4", san: "Nxd4", piece: "n" },
    cpl: -140, reps: 1, nextDue: "+3d", game: "g-2037",
    theme: "Pin against the queen",
    note: "You found it. The knight is immune — taking opens the a5–e1 diagonal onto the queen.",
  },
  {
    id: "c-003",
    kind: "blunder",
    fen: "r2q1rk1/pp1n1ppp/2pbpn2/3p4/2PP4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 0 9",
    toMove: "w",
    played: { from: "c4", to: "d5", san: "cxd5?" },
    correct: { from: "c1", to: "d2", san: "Bd2", piece: "B" },
    cpl: 240, reps: 0, nextDue: "today", game: "g-2039",
    theme: "Release of tension",
    note: "Releasing the tension gave up your space. Complete development — Bd2 keeps options open.",
  },
  {
    id: "c-004",
    kind: "mistake",
    fen: "r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 6 7",
    toMove: "w",
    played: { from: "c3", to: "d5", san: "Nd5?!" },
    correct: { from: "c1", to: "g5", san: "Bg5", piece: "B" },
    cpl: 165, reps: 3, nextDue: "+1d", game: "g-2040",
    theme: "Development over exchange",
    note: "Pin the knight before trading pieces. The bishop belongs on g5.",
  },
  {
    id: "c-005",
    kind: "great",
    fen: "r3k2r/pp1bbppp/2n1pn2/q1pp4/3P1B2/2NBPN2/PPPQ1PPP/R3K2R w KQkq - 0 9",
    toMove: "w",
    played: { from: "a1", to: "c1", san: "Rac1" },
    correct: { from: "a1", to: "c1", san: "Rac1", piece: "R" },
    cpl: -40, reps: 4, nextDue: "+6d", game: "g-2035",
    theme: "Rook to the open file",
    note: "Quiet and correct. Rook stands ready for when the c-file opens.",
  },
  {
    id: "c-006",
    kind: "blunder",
    fen: "2r2rk1/pp1bqppp/2n1pn2/3p4/2PP4/1PN1PN2/PB1QBPPP/R4RK1 b - - 0 12",
    toMove: "b",
    played: { from: "f6", to: "e4", san: "Nxe4??" },
    correct: { from: "a7", to: "a5", san: "a5", piece: "p" },
    cpl: 410, reps: 0, nextDue: "today", game: "g-2036",
    theme: "Queenside break",
    note: "The knight sac fizzles — White just plays Nxe4. You wanted to challenge with a5 first.",
  },
  {
    id: "c-007",
    kind: "mistake",
    fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5",
    toMove: "w",
    played: { from: "d2", to: "d3", san: "d3" },
    correct: { from: "b2", to: "b4", san: "b4", piece: "P" },
    cpl: 95, reps: 1, nextDue: "+2d", game: "g-2040",
    theme: "Evans Gambit line",
    note: "Sharper is b4. You went quiet — fine, but missed the principled shot.",
  },
  {
    id: "c-008",
    kind: "brilliant",
    fen: "r4rk1/1pp2ppp/p1nbbn2/3p4/3P4/2NBPN2/PPB2PPP/R4RK1 b - - 0 11",
    toMove: "b",
    played: { from: "e6", to: "h3", san: "Bxh3!" },
    correct: { from: "e6", to: "h3", san: "Bxh3", piece: "b" },
    cpl: -180, reps: 0, nextDue: "today", game: "g-2037",
    theme: "Greek gift on h3",
    note: "Tearing open the king. gxh3 allows Qd7–h3 with mating ideas.",
  },
  {
    id: "c-009",
    kind: "blunder",
    fen: "r1b1k2r/pp1nqppp/2p1pn2/3p4/2PP4/2N1PN2/PP2BPPP/R1BQ1RK1 b kq - 2 8",
    toMove: "b",
    played: { from: "d7", to: "b6", san: "Nb6?" },
    correct: { from: "e8", to: "g8", san: "O-O", piece: "k", kingside: true },
    cpl: 275, reps: 2, nextDue: "today", game: "g-2039",
    theme: "King in the center",
    note: "Knight to the rim with your king still home. Castle, always castle.",
  },
  {
    id: "c-010",
    kind: "mistake",
    fen: "r2qkb1r/pp1n1ppp/2p1pn2/3p4/2PP4/2N1PN2/PP2BPPP/R1BQK2R w KQkq - 0 7",
    toMove: "w",
    played: { from: "f1", to: "g1", san: "O-O" },
    correct: { from: "c4", to: "d5", san: "cxd5", piece: "P" },
    cpl: 110, reps: 0, nextDue: "today", game: "g-2034",
    theme: "Central break",
    note: "Castling is fine but the moment for cxd5 was now — you won't get it again.",
  },
  {
    id: "c-011",
    kind: "blunder",
    fen: "r1bqk2r/ppp2ppp/2np1n2/2b1p1B1/2B1P3/2NP1N2/PPP2PPP/R2QK2R b KQkq - 0 6",
    toMove: "b",
    played: { from: "h7", to: "h6", san: "h6?" },
    correct: { from: "f6", to: "a5", san: "Nxe4??" , piece: "n" }, // intentionally a trick — won't use
    // Fix: use a sensible correct move:
    cpl: 220, reps: 0, nextDue: "today", game: "g-2034",
    theme: "Bishop trade timing",
    note: "h6 is a loosening move you can't afford here — trade with Bxe7 ideas instead.",
  },
  {
    id: "c-012",
    kind: "great",
    fen: "r3r1k1/pp1b1ppp/2n1pn2/q1pp4/3P4/2P1PN2/PPBN1PPP/R2Q1RK1 b - - 0 11",
    toMove: "b",
    played: { from: "c5", to: "d4", san: "cxd4" },
    correct: { from: "c5", to: "d4", san: "cxd4", piece: "p" },
    cpl: -25, reps: 5, nextDue: "+9d", game: "g-2035",
    theme: "Open the c-file",
    note: "Patient. The exchange opens the file your rook is already on.",
  },
];

// Fix c-011 correct move to be a real, validated move:
CARDS[10].correct = { from: "e8", to: "g8", san: "O-O", piece: "k", kingside: true };

// Stats — hand-picked for a believable onboarding story.
const STATS = {
  username: "Catalyst030119",
  gamesImported: 1287,
  cardsGenerated: 412,
  blunders: 204, mistakes: 128, brilliant: 31, great: 49,
  due: 14, newToday: 6,
  streakDays: 11,
  accuracy7d: 0.68,
  accuracy30d: 0.61,
  lastSync: "last night · 02:14",
};

// Spread of due-today cards, for dashboard.
const DUE_TODAY = CARDS.filter(c => c.nextDue === "today");

// Onboarding import log lines (appears during progress animation).
const IMPORT_LOG = [
  "Contacting api.chess.com…",
  "Fetching archive 2023/03",
  "Fetching archive 2023/04",
  "Fetching archive 2023/05",
  "Fetching archive 2023/06",
  "Fetching archive 2023/07",
  "Parsing 108 PGN games",
  "Stockfish depth 18 · batch 1 of 4",
  "Classifying moves · CPL > 200 = blunder",
  "Classifying moves · CPL 100–200 = mistake",
  "Identifying engine top choices",
  "Deduplicating positions by FEN",
  "Writing 412 unique positions to deck",
  "Scheduling initial FSRS intervals",
  "Done.",
];

window.DATA = { GAMES, CARDS, STATS, DUE_TODAY, IMPORT_LOG };
