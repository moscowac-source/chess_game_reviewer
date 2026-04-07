# PRD: Chess Improver — Personal Game-Based Flashcard System

## Problem Statement

Standard chess puzzle platforms (Chess.com puzzles, Lichess tactics, etc.) present positions drawn from general game databases. These positions rarely reflect the specific patterns, openings, and mistakes a casual player actually encounters in their own games. As a result, drilling these puzzles builds pattern recognition for scenarios that may never appear in real play, making improvement feel disconnected from actual game performance.

The player needs a system that surfaces *their own* mistakes and good moves — positions they have personally reached — so that review is directly tied to what they actually play.

## Solution

A flashcard application that automatically pulls game history from Chess.com, analyzes every game using a local Stockfish engine, identifies blunders, mistakes, brilliant moves, and great moves, and generates a personalized spaced repetition deck from those positions. The player drills by making actual moves on an interactive board — not by flipping cards and self-rating. The system automatically grades each attempt, provides feedback when wrong, and uses the FSRS spaced repetition algorithm to schedule future reviews based on performance.

V1 is a web application. V2 extends the same backend to a React Native mobile app.

## User Stories

1. As a player, I want to connect my Chess.com account (username: Catalyst030119) so that my game history is available in the app.
2. As a player, I want a full historical import of all my past games on first setup so that I have a large initial card deck from day one.
3. As a player, I want my game history to sync automatically every night so that new games I play appear in my deck the next day.
4. As a player, I want a manual "Sync Now" button so that I can pull in new games immediately without waiting for the nightly job.
5. As a player, I want the app to import all game types (daily, rapid, blitz, bullet) so that I see patterns across all time controls.
6. As a player, I want cards generated from my blunders so that I can practice finding the correct move in positions where I went badly wrong.
7. As a player, I want cards generated from my mistakes so that I can practice correcting moves where I lost significant advantage.
8. As a player, I want cards generated from my brilliant moves so that I can reinforce patterns where I found exceptional moves.
9. As a player, I want cards generated from my great moves so that I can reinforce strong play I've already demonstrated.
10. As a player, I want a position that appears identically across multiple games to produce a single card so that I don't see duplicate cards for the exact same position.
11. As a player, I want that single card's difficulty to be determined by my review performance so that the algorithm reflects how well I actually know the position.
12. As a player, I want similar (but not identical) positions to produce separate cards so that I can recognize the same thematic pattern across different configurations.
13. As a player, I want to see a chess board when I open a card so that I can assess the position before acting.
14. As a player, I want to make a move directly on the board so that grading is automatic rather than self-reported.
15. As a player, I want to be told immediately if my move was correct or incorrect so that I get instant feedback.
16. As a player, I want incorrect attempts to highlight the piece I should have moved so that I have a hint rather than just being told I'm wrong.
17. As a player, I want a second and third attempt after a wrong answer so that I can work toward the right move rather than just being shown it.
18. As a player, I want cards I answer correctly many times (approximately 8-10 correct answers) to appear less frequently so that mastered positions don't clog my review queue.
19. As a player, I want the system to use the FSRS spaced repetition algorithm so that review intervals are optimized based on my actual recall performance.
20. As a player, I want a daily review session that presents both new cards and due reviews so that my practice is consistent and structured.
21. As a player, I want the app to follow FSRS best practices for the number of new cards introduced per day so that I'm not overwhelmed.
22. As a player, I want to create an account with email and password so that my progress is saved and the app can eventually be shared with others.
23. As a player, I want my review history and card state to be persisted so that progress is never lost between sessions.
24. As a player, I want to see a sync status indicator so that I know when the last sync ran and whether it succeeded.
25. As a player, I want the web app to be fast and responsive on desktop so that daily review feels seamless.
26. As a future mobile user, I want the same flashcard system available on a React Native app so that I can drill on my phone.

## Implementation Decisions

### Modules

**1. Chess.com API Client**
Responsible for all communication with `api.chess.com`. Handles fetching monthly game archives by username, paginating through all available months for the historical import, fetching only the most recent month(s) for incremental sync, and respecting Chess.com rate limits. Returns raw PGN strings with any embedded annotations Chess.com provides.

**2. Game Parser**
Parses PGN data into a sequence of positions (FEN + move played at each ply). Outputs a normalized game record ready for engine analysis. Does not rely on Chess.com's annotation symbols.

**3. Stockfish Analyzer**
Runs Stockfish (WASM build via the `stockfish` npm package) on each position in a parsed game to compute centipawn evaluation before and after each move. Classifies moves by centipawn loss (CPL) against standard thresholds: Blunder (>200 CPL), Mistake (100–200 CPL). Identifies Great and Brilliant moves by finding the engine's top choice in positions with meaningful alternatives. Outputs a list of annotated positions: FEN, move played, best move, classification. Runs server-side during the sync pipeline as a batch process — never in real-time during a user session.

**4. Card Generator**
Deduplicates positions before writing cards. Uses the FEN string as the canonical identity of a position (exact match = same card). When a position already exists as a card and a new game instance is found, no duplicate is created. Similar positions (different FEN but same thematic pattern) remain as separate cards. Card difficulty is driven entirely by FSRS review performance — no manual difficulty adjustment based on occurrence count.

**5. FSRS Engine**
Wraps the `ts-fsrs` library. Manages card state (stability, difficulty, due date, review count). On each review, records the outcome (correct first attempt, correct after hint, correct after multiple attempts, failed) and maps it to the FSRS rating scale. Computes the next review interval and updates card state accordingly. Exposes a simple interface: `getNextCard(userId)`, `recordReview(cardId, rating)`.

**6. Sync Orchestrator**
Coordinates the full sync pipeline: call Chess.com API Client → Game Parser → Stockfish Analyzer → Card Generator. Handles two modes: historical (all available archives) and incremental (last N days/most recent month). Runs on a nightly schedule via Vercel Cron. Also triggered manually via API route. Records sync metadata (last sync time, games processed, cards created/updated, errors).

**7. Interactive Board Component**
Renders a chess position using `react-chessboard` with `chess.js` for move validation. Accepts a FEN and correct move as props. Manages attempt state (first attempt, hint shown, second attempt, etc.). On move, validates against the correct answer and emits a result event. Highlights the correct piece after a wrong first attempt. Locks the board after the card is resolved.

**8. Review Session Manager**
Builds the daily review queue for a user: fetches due cards from FSRS Engine, interleaves new cards up to the daily new-card limit, and sequences presentation. Tracks session progress (cards remaining, correct streak, session accuracy). Persists queue state so a partially-completed session can be resumed.

**9. Auth Module**
Supabase Auth with email/password for V1. All card state, review history, and sync state are scoped to a user ID. Multi-user capable from day one.

### Architecture

- **Backend:** Next.js API routes (or Route Handlers in App Router) serve as the API layer shared by both the web frontend and the future React Native app.
- **Database:** Supabase (PostgreSQL). Tables for: users, games (imported), cards (positions), card_state (FSRS state per user per card), review_log, sync_log.
- **Nightly sync:** Vercel Cron triggers a Next.js API route on a nightly schedule. The route runs the Sync Orchestrator.
- **Chess.com data:** Public API — no authentication required. Username configured per user account.
- **V2 mobile:** React Native (Expo) consumes the same Next.js API routes. The board component will be re-implemented using a React Native-compatible chess board library.

### Key Technical Decisions

- FEN string is the canonical position identifier for deduplication.
- FSRS via `ts-fsrs` — same algorithm used by modern Anki.
- Stockfish WASM (`stockfish` npm package) runs server-side during sync — all games analyzed regardless of Chess.com review status.
- Centipawn loss thresholds: Blunder >200 CPL, Mistake 100–200 CPL. Great/Brilliant identified by engine top-choice analysis.
- Cards are not tied to specific games or opponents — only the position and correct move are stored.
- Attempt tracking within a single review session: correct on first try = highest FSRS rating; correct after hint = medium rating; correct after 2+ attempts = lower rating; failed = Again.
- Sync pipeline runs as a Vercel Background Function to accommodate Stockfish analysis time on large game sets.

## Testing Decisions

Good tests verify external behavior against a stable interface, not internal implementation details. Tests should not break when internal data structures or algorithms are refactored.

**Game Parser** — unit tested with fixture PGN strings. Assert that the correct sequence of FENs and moves are extracted. This is a pure function module and highly testable in isolation.

**Stockfish Analyzer** — unit tested with fixture position sequences and mocked Stockfish output. Assert that CPL thresholds produce the correct move classifications, and that the correct move is correctly identified from engine output.

**Card Generator** — unit tested with sets of parsed positions. Assert deduplication behavior (same FEN → one card, occurrence count incremented), and that dissimilar FENs produce separate cards.

**FSRS Engine** — unit tested by simulating review sequences and asserting that interval progression matches expected FSRS behavior (e.g., correct answers increase interval, "Again" resets it). Use `ts-fsrs` as a black box — test the wrapper's mapping of attempt outcomes to FSRS ratings.

**Sync Orchestrator** — integration tested with a mock Chess.com API Client returning fixture data. Assert that a full sync run produces the expected cards in the database.

**Interactive Board Component** — tested with React Testing Library. Assert that a correct move emits the right result event, a wrong move shows the hint state, and the board locks after resolution.

**Review Session Manager** — unit tested. Assert that the queue contains the right mix of new vs. due cards, that daily new-card limits are respected, and that session state is correctly updated after each card.

## Out of Scope

- React Native mobile app (V2)
- Dashboard / analytics views (accuracy trends, mistake patterns by opening, phase of game) (V2)
- Social features, sharing decks with other users
- Opening-specific training modes
- Multiplayer or competitive review modes
- Integration with Lichess or other platforms
- Video or annotation overlays on cards

## Further Notes

- Chess.com username for the initial account: **Catalyst030119**
- Chess.com's public API returns games organized by month (`/pub/player/{username}/games/{YYYY}/{MM}`). Historical import must iterate all available months.
- Chess.com rate limits are not publicly documented but are known to be restrictive for high-frequency requests. The Sync Orchestrator should include request throttling (e.g., delay between archive fetches).
- All games are analyzed by Stockfish regardless of whether the user ran Chess.com's Game Review — no dependency on Chess.com annotations.
- Stockfish WASM binary is approximately 30MB. Vercel Pro function size limits apply — verify compatibility during implementation.
- FSRS daily new card limit best practice is approximately 10-20 new cards per day. The exact default should be configurable per user.
- Card difficulty is driven entirely by FSRS review performance. No custom difficulty adjustments are applied at card creation — FSRS surfaces recurring problem positions organically through review outcomes.
