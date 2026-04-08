# Plan: Chess Improver — Personal Game-Based Flashcard System

> Source PRD: `/PRD.md`
> Process: `PROCESS.md` — read before starting any phase

## Architectural Decisions

Durable decisions that apply across all phases:

- **Routes**:
  - `POST /api/sync` — trigger full sync (historical or incremental)
  - `GET /api/sync/status` — last sync time, counts, error state
  - `GET /api/review/session` — build and return daily review queue
  - `PATCH /api/review/cards/[cardId]` — record a review result
- **Schema tables**: `users`, `games`, `cards`, `card_state`, `review_log`, `sync_log`
- **Key models**:
  - `Card` — `id`, `fen`, `correct_move`, `classification` (blunder/mistake/great/brilliant), `created_at`
  - `CardState` — `id`, `user_id`, `card_id`, FSRS fields (`stability`, `difficulty`, `due_date`, `review_count`, `state`)
  - `Game` — `id`, `user_id`, `pgn`, `source` (chess.com), `played_at`, `processed_at`
  - `SyncLog` — `id`, `user_id`, `mode` (historical/incremental), `started_at`, `completed_at`, `games_processed`, `cards_created`, `error`
- **Auth**: Supabase Auth, email/password. `user_id` scopes all card, review, and sync state. RLS on all tables. Added in Phase 17–18 — early phases use a single hardcoded dev user.
- **Sync pipeline**: Chess.com API Client → Game Parser → Stockfish Analyzer → Card Generator, orchestrated by Sync Orchestrator. Runs as Vercel Background Function (nightly cron + manual trigger). Never runs in real-time during a user session.
- **Position identity**: FEN string is the canonical deduplication key. Exact FEN match = same card. Different FEN = separate card even if thematically similar.
- **FSRS rating mapping**: correct on first attempt = `Easy`, correct after hint = `Good`, correct after 2+ attempts = `Hard`, failed = `Again`.
- **API layer is mobile-ready**: all logic lives in Next.js API routes. The web frontend and future React Native app consume the same routes — no business logic in UI components.

---

## Phase 1: Project Scaffold

**User stories**: —

### What to build

Initialize the Next.js (TypeScript) project with all required dependencies. Configure Supabase client, environment variables, and a basic health check API route. Set up the test harness (Jest + React Testing Library). Nothing is functional beyond the ability to run the dev server and the test suite.

**Dependencies to install**: `next`, `typescript`, `@supabase/supabase-js`, `react-chessboard`, `chess.js`, `stockfish`, `ts-fsrs`, `jest`, `@testing-library/react`, `@testing-library/jest-dom`.

### Acceptance criteria

- [x] `npm run dev` starts without errors
- [x] `npm test` runs and the test harness executes a trivial passing test
- [x] `GET /api/health` returns `{ status: 'ok' }`
- [x] Supabase client initializes from env vars without throwing
- [x] TypeScript compiles with no errors

---

## Phase 2: Database Schema

**User stories**: 23

### What to build

Create all Supabase tables via SQL migrations. Generate TypeScript types from the schema. The schema must match the architectural decisions above and be ready to support all future phases without modification to table structure.

### Acceptance criteria

- [x] All tables exist in Supabase: `users`, `games`, `cards`, `card_state`, `review_log`, `sync_log`
- [x] All columns match the key models defined in the architectural decisions section
- [x] TypeScript types generated and importable from a central types file
- [x] Foreign key constraints correct (`card_state.card_id → cards.id`, `card_state.user_id → users.id`, etc.)
- [x] Migrations are version-controlled and re-runnable

---

## Phase 3: Chess.com API Client — Single Archive Fetch

**User stories**: 1, 5

### What to build

A module that fetches a single monthly archive from `api.chess.com/pub/player/{username}/games/{YYYY}/{MM}`. Handles HTTP errors gracefully, parses the response shape, and enforces a configurable delay between requests for rate limiting. Returns an array of raw PGN strings.

### Acceptance criteria

- [x] Fetches a single archive and returns parsed PGN array
- [x] Returns an empty array (not an error) for months with no games
- [x] Throws a typed error on non-200 HTTP responses
- [x] Respects a configurable rate-limit delay between calls
- [x] Unit tested with mocked HTTP responses (success, empty, 429, 500)

---

## Phase 4: Chess.com API Client — Historical + Incremental Modes

**User stories**: 2, 3

### What to build

Extend the Chess.com API client with two modes built on top of Phase 3's single-archive fetcher:
- **Historical**: fetches the list of all available archive URLs for a username, iterates every month, returns all PGNs
- **Incremental**: fetches only the most recent month's archive

### Acceptance criteria

- [x] Historical mode fetches all available months and returns combined PGN array
- [x] Incremental mode fetches only the most recent archive month
- [x] Rate-limit delay applied between each archive fetch in historical mode
- [x] Unit tested with fixture multi-month archive index responses
- [x] Both modes return the same shape — callers cannot tell them apart

---

## Phase 5: Game Parser

**User stories**: 2, 5

### What to build

A pure function module that accepts a PGN string and returns a sequence of `{ fen: string, movePlayed: string }` records — one per ply in the game. Does not depend on Chess.com annotations. Works for all game types (daily, rapid, blitz, bullet).

### Acceptance criteria

- [x] Parses a complete PGN and returns the correct FEN at every ply
- [x] `movePlayed` is in standard algebraic notation (SAN)
- [x] Handles edge cases: resignations, draws, incomplete games
- [x] Unit tested with at least 3 fixture PGN strings covering different game types
- [x] Pure function — no side effects, no DB calls

---

## Phase 6: Stockfish Analyzer — CPL Evaluation

**User stories**: 6, 7, 8, 9

### What to build

Set up server-side Stockfish (via the `stockfish` npm package). Given a sequence of positions from the Game Parser, compute the centipawn evaluation before and after each move, returning the CPL delta per ply. Runs as a batch process — not real-time.

### Acceptance criteria

- [x] Stockfish initializes server-side without errors
- [x] Returns a CPL delta for each position in a sequence
- [x] Engine output correctly parsed into numeric centipawn values
- [x] Unit tested with mocked Stockfish output and fixture position sequences
- [x] Does not run Stockfish in the browser — server-only guard in place

---

## Phase 7: Stockfish Analyzer — Move Classification

**User stories**: 6, 7, 8, 9

### What to build

Apply CPL thresholds to classify each move. Layer on top of Phase 6's CPL output. Also identify Great and Brilliant moves by detecting when the played move matches the engine's top choice in positions with meaningful alternatives.

**Thresholds**: Blunder >200 CPL, Mistake 100–200 CPL, Great/Brilliant = engine top-choice with meaningful alternatives.

### Acceptance criteria

- [x] Blunder threshold (>200 CPL) correctly applied
- [x] Mistake threshold (100–200 CPL) correctly applied
- [x] Great/Brilliant correctly identified when move matches engine top choice
- [x] Edge cases: CPL exactly at threshold, forced moves, no alternatives
- [x] Unit tested — all classification branches covered

---

## Phase 8: Card Generator

**User stories**: 6, 7, 8, 9, 10, 12

### What to build

Takes classified positions from the Analyzer and writes cards to the `cards` table. Deduplicates by FEN: if a card for that FEN already exists, no duplicate is created. Different FENs always produce separate cards regardless of thematic similarity.

### Acceptance criteria

- [x] New FEN → new row in `cards` table
- [x] Duplicate FEN → no new row created (idempotent)
- [x] Different FENs → separate cards, even from the same game
- [x] `correct_move` and `classification` correctly populated
- [x] Unit tested with sets of classified positions including deliberate duplicates

---

## Phase 9: Sync Orchestrator — Full Pipeline

**User stories**: 2, 4

### What to build

`POST /api/sync` wires all pipeline modules end-to-end: Chess.com Client → Game Parser → Stockfish Analyzer → Card Generator. Accepts a `mode` parameter (`historical` | `incremental`). Returns a summary of what was processed. Integration tested with a mock Chess.com client.

### Acceptance criteria

- [x] `POST /api/sync` with `mode=historical` processes all games and writes cards
- [x] `POST /api/sync` with `mode=incremental` processes only recent games
- [x] Pipeline errors (bad PGN, analyzer failure) are caught and do not crash the whole sync
- [x] Integration tested end-to-end with mock Chess.com client and fixture data — asserts expected card rows in DB
- [x] Response includes `{ gamesProcessed, cardsCreated, errors[] }`

---

## Phase 10: Sync Scheduling + Status Logging

**User stories**: 3, 4, 24

### What to build

`sync_log` rows written on every sync run (start time, completion time, mode, counts, errors). `GET /api/sync/status` returns the most recent log entry. Vercel Cron configured to trigger `POST /api/sync?mode=incremental` nightly.

### Acceptance criteria

- [x] Every sync run writes a `sync_log` row on start and updates it on completion
- [x] `GET /api/sync/status` returns the latest sync log
- [x] Vercel Cron config present and targeting the correct route + mode
- [x] Error state correctly logged when sync partially or fully fails
- [x] Integration tested — sync run produces expected log entry

---

## Phase 11: FSRS Engine

**User stories**: 11, 18, 19, 21

### What to build

Wrap `ts-fsrs` into a clean internal interface. Manage card state initialization for new cards. Implement `recordReview(cardId, rating)` — updates `card_state` with new FSRS values. Implement `getNextCard(userId)` — returns the next due card for a user. Map attempt outcomes to FSRS ratings per the architectural decision above.

### Acceptance criteria

- [x] New card gets initialized with correct FSRS defaults in `card_state`
- [x] `recordReview` with `Easy` increases interval correctly
- [x] `recordReview` with `Again` resets interval
- [x] `getNextCard` returns the card with the earliest due date
- [x] Outcome-to-rating mapping tested for all four cases (first try / after hint / after attempts / failed)
- [x] Unit tested by simulating multi-step review sequences

---

## Phase 12: Review Session Manager

**User stories**: 20, 21, 23

### What to build

Build the daily review queue for a user: fetch cards due today from FSRS Engine, interleave new cards up to the daily new-card limit (default 20, configurable per user). Persist queue state so a partially-completed session can be resumed. Expose via `GET /api/review/session`.

### Acceptance criteria

- [ ] Queue contains correct mix of due cards and new cards
- [ ] Daily new-card limit is respected (not exceeded)
- [ ] Partially-completed session can be resumed (queue state persisted)
- [ ] `GET /api/review/session` returns the queue in the correct shape
- [ ] Unit tested — limit enforcement, queue composition, resumability

---

## Phase 13: UI Design

**User stories**: 13, 14, 15, 16, 17, 19, 20, 24, 25

### What to build

Establish the visual design of the application before any UI code is written. The Stitch mockup file (`designs/ui-mockup.stitch`) is the canonical design reference for all frontend phases (14–19). This phase produces no production code — it produces a spec.

Review the mockup and document the following so all UI phases have a shared reference:
- Screen inventory (home/mode selection, review session, session completion, sync status)
- Component breakdown per screen (board, progress bar, mode cards, hint states, etc.)
- Color palette, typography, and spacing decisions
- Interaction states (idle, hint shown, correct, incorrect, locked)

**Design files**: Export each screen from Stitch as a PNG and save to `designs/` (e.g. `designs/home.png`, `designs/review-session.png`, `designs/session-complete.png`, `designs/sync-status.png`). Add all screenshots before starting this phase.

### Acceptance criteria

- [x] `designs/DESIGN.md` committed with full design system, screen inventory, and component notes
- [ ] Screenshot(s) from Stitch mockup added to `designs/` (dashboard.png, study.png)
- [x] Screen inventory documented (Dashboard, Study/Review — see DESIGN.md §6)
- [x] Component list per screen documented
- [x] Color palette and typography noted (see DESIGN.md §2–3)
- [x] FSRS rating button states documented (Again/Hard/Good/Easy with intervals)

---

## Phase 14: Interactive Board — Core Move Validation

**User stories**: 13, 14, 15

### What to build

A React component that renders a chess position from a FEN string using `react-chessboard` and `chess.js`. Accepts `fen` and `correctMove` as props. When the user makes a move on the board, validates it against `correctMove` and calls an `onResult` callback with `'correct'` or `'incorrect'`.

### Acceptance criteria

- [ ] Board renders the correct position from a FEN prop
- [ ] Correct move triggers `onResult('correct')`
- [ ] Incorrect move triggers `onResult('incorrect')`
- [ ] Illegal moves (per chess rules) are rejected without triggering `onResult`
- [ ] Tested with React Testing Library — all result branches covered

---

## Phase 15: Interactive Board — Hint + Multi-Attempt Flow

**User stories**: 16, 17, 18

### What to build

Extend the board component with attempt state. After a wrong first attempt, highlight the correct piece. Allow up to 3 attempts total. After 3 failed attempts, lock the board and reveal the answer. Emit the attempt outcome (`firstTry` | `afterHint` | `afterAttempts` | `failed`) for FSRS rating mapping.

### Acceptance criteria

- [ ] Wrong first attempt highlights the correct piece (not the correct square)
- [ ] Second attempt allowed after hint is shown
- [ ] Third failed attempt locks the board and reveals the correct move
- [ ] `onResult` emits correct attempt outcome for each path
- [ ] Board cannot be interacted with after resolution
- [ ] All state transitions tested with React Testing Library

---

## Phase 16: Review Session Page

**User stories**: 13, 14, 15, 16, 17, 19, 20, 25

### What to build

The core review UI. Fetches queue from `GET /api/review/session`. Presents one board at a time. On resolution, calls `PATCH /api/review/cards/[cardId]` with the outcome, advances to the next card. Displays session progress (cards remaining, current accuracy). When queue is empty, shows a completion state.

### Acceptance criteria

- [ ] Loads and displays the first card from the session queue
- [ ] Correct/incorrect result is POSTed and card advances
- [ ] Session progress updates after each card
- [ ] Completion state shown when queue is empty
- [ ] Partial session resume works (page reload mid-session continues from correct position)
- [ ] Responsive and usable on desktop

---

## Phase 17: Quiz Modes — Filtered Sessions

**User stories**: TBD

### What to build

Add three focused quiz modes alongside the default daily review. Each mode filters the card pool before applying FSRS due-date scheduling — so you're seeing the due cards within that filter, not every card ever created.

**Modes:**
- **Recent Games** — cards generated from games played in the last 7 days. Good for reviewing a recent session while it's fresh.
- **Mistakes to Master** — cards with classification `blunder` or `mistake` only. Drills the positions where you went wrong and why.
- **Back to Brilliancies** — cards with classification `great` or `brilliant` only. Revisits positions where you found the best move, reinforcing pattern recognition for strong play.

**API change**: extend `GET /api/review/session` with an optional `mode` query parameter:
```
mode: 'standard' | 'recent' | 'mistakes' | 'brilliancies'
```
Default is `'standard'` (existing behavior, unchanged).

**UI**: a mode selection home screen shown before a session starts. Displays the four modes as cards — each showing the mode name, a short description, and the count of due cards in that mode. Tapping a mode starts the filtered session.

**Design decision**: all modes use FSRS scheduling. The filter narrows *which* cards are eligible; FSRS determines *which eligible cards* are shown first. This keeps spaced repetition working correctly within each mode.

### Acceptance criteria

- [ ] `GET /api/review/session?mode=recent` returns only cards from games played in the last 7 days
- [ ] `GET /api/review/session?mode=mistakes` returns only cards with classification `blunder` or `mistake`
- [ ] `GET /api/review/session?mode=brilliancies` returns only cards with classification `great` or `brilliant` (UI label: "Back to Brilliancies")
- [ ] `mode=standard` (default) behaves identically to the existing session endpoint
- [ ] Each mode still applies FSRS due-date filtering within its card pool
- [ ] Mode selection home screen renders the four modes with due-card counts
- [ ] Selecting a mode starts a session filtered to that mode
- [ ] API unit tested — all four modes return correct card subsets
- [ ] UI tested — mode selection renders and routes correctly

---

## Phase 18: Sync Status UI

**User stories**: 4, 24

### What to build

A UI element (header or settings page) showing last sync time, games processed, cards created, and error state sourced from `GET /api/sync/status`. A "Sync Now" button that calls `POST /api/sync?mode=incremental` and shows a loading state while the sync runs.

### Acceptance criteria

- [ ] Sync status displays last sync time, game count, card count
- [ ] Error state is visible when the last sync failed
- [ ] "Sync Now" triggers incremental sync and shows loading indicator
- [ ] Status refreshes automatically after sync completes
- [ ] Tested — button triggers correct API call, status updates on response

---

## Phase 19: Auth — Signup + Login

**User stories**: 22

### What to build

Supabase Auth with email/password. Signup and login pages. Session cookies set on successful auth. All app routes redirect unauthenticated users to login. Logout clears session.

### Acceptance criteria

- [ ] User can sign up with email + password
- [ ] User can log in and is redirected to the review session
- [ ] Unauthenticated requests to protected routes redirect to login
- [ ] Logout clears session and redirects to login
- [ ] Auth state persists across page refreshes

---

## Phase 20: Auth — User Scoping + RLS

**User stories**: 1, 22, 23

### What to build

Add `user_id` to all tables. Enable Supabase Row Level Security policies so users can only read and write their own rows. Store Chess.com username per user (in `users` table). Sync pipeline uses the authenticated user's configured username. All API routes reject requests from unauthenticated users.

### Acceptance criteria

- [ ] RLS policies in place on all tables — no cross-user data leakage
- [ ] Chess.com username stored per user and used in sync pipeline
- [ ] Two separate test accounts have fully isolated card decks and review history
- [ ] All API routes return 401 for unauthenticated requests
- [ ] Integration tested — user A cannot read or write user B's rows

---

## Phase 21: Move Explanations (V2 Enhancement)

**User stories**: TBD

### What to build

Generate plain-English explanations for why a move is classified as a blunder, mistake, great, or brilliant. Use the `bestLine` field (principal variation) captured by the Stockfish Analyzer alongside the CPL delta and classification to construct a prompt for Claude. Return a concise explanation — 1–2 sentences — that describes the consequence of the move in terms a club-level player would understand (e.g. "This blunder allows your opponent to win the exchange after Nf3, leaving you down a rook for a bishop").

The explanation is generated at sync time (not during review) and stored on the `cards` table as an `explanation` column. Displayed on the flashcard after the user resolves the position.

**Dependencies**: Phase 7 (`bestLine` in `PositionAnalysis`), Phase 8 (Card Generator writes to `cards`), Anthropic API.

### Acceptance criteria

- [ ] `explanation` column added to `cards` table via migration
- [ ] Claude generates a 1–2 sentence explanation from `fen`, `movePlayed`, `bestMove`, `bestLine`, `cpl`, and `classification`
- [ ] Explanation stored on the card at sync time
- [ ] Explanation displayed on the flashcard after the user resolves the position
- [ ] Graceful fallback if explanation generation fails (card still created, explanation null)
- [ ] Integration tested — sync run with mocked Claude call produces expected explanation on card
