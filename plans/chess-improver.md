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

- [x] Queue contains correct mix of due cards and new cards
- [x] Daily new-card limit is respected (not exceeded)
- [x] Partially-completed session can be resumed (queue state persisted)
- [x] `GET /api/review/session` returns the queue in the correct shape
- [x] Unit tested — limit enforcement, queue composition, resumability

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
- [x] Screenshot(s) from Stitch mockup added to `designs/` (dashboard.png, study.png)
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

- [x] Board renders the correct position from a FEN prop
- [x] Correct move triggers `onResult('correct')`
- [x] Incorrect move triggers `onResult('incorrect')`
- [x] Illegal moves (per chess rules) are rejected without triggering `onResult`
- [x] Tested with React Testing Library — all result branches covered

---

## Phase 15: Interactive Board — Hint + Multi-Attempt Flow

**User stories**: 16, 17, 18

### What to build

Extend the board component with attempt state. After a wrong first attempt, highlight the correct piece. Allow up to 3 attempts total. After 3 failed attempts, lock the board and reveal the answer. Emit the attempt outcome (`firstTry` | `afterHint` | `afterAttempts` | `failed`) for FSRS rating mapping.

### Acceptance criteria

- [x] Wrong first attempt highlights the correct piece (not the correct square)
- [x] Second attempt allowed after hint is shown
- [x] Third failed attempt locks the board and reveals the correct move
- [x] `onResult` emits correct attempt outcome for each path
- [x] Board cannot be interacted with after resolution
- [x] All state transitions tested with React Testing Library

---

## Phase 16: Review Session Page

**User stories**: 13, 14, 15, 16, 17, 19, 20, 25

### What to build

The core review UI. Fetches queue from `GET /api/review/session`. Presents one board at a time. On resolution, calls `PATCH /api/review/cards/[cardId]` with the outcome, advances to the next card. Displays session progress (cards remaining, current accuracy). When queue is empty, shows a completion state.

### Acceptance criteria

- [x] Loads and displays the first card from the session queue
- [x] Correct/incorrect result is POSTed and card advances
- [x] Session progress updates after each card
- [x] Completion state shown when queue is empty
- [x] Partial session resume works (page reload mid-session continues from correct position)
- [x] Responsive and usable on desktop

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

- [x] `GET /api/review/session?mode=recent` returns only cards from games played in the last 7 days
- [x] `GET /api/review/session?mode=mistakes` returns only cards with classification `blunder` or `mistake`
- [x] `GET /api/review/session?mode=brilliancies` returns only cards with classification `great` or `brilliant` (UI label: "Back to Brilliancies")
- [x] `mode=standard` (default) behaves identically to the existing session endpoint
- [x] Each mode still applies FSRS due-date filtering within its card pool
- [x] Mode selection home screen renders the four modes with due-card counts
- [x] Selecting a mode starts a session filtered to that mode
- [x] API unit tested — all four modes return correct card subsets
- [x] UI tested — mode selection renders and routes correctly

---

## Phase 18: Sync Status UI

**User stories**: 4, 24

### What to build

A UI element (header or settings page) showing last sync time, games processed, cards created, and error state sourced from `GET /api/sync/status`. A "Sync Now" button that calls `POST /api/sync?mode=incremental` and shows a loading state while the sync runs.

### Acceptance criteria

- [x] Sync status displays last sync time, game count, card count
- [x] Error state is visible when the last sync failed
- [x] "Sync Now" triggers incremental sync and shows loading indicator
- [x] Status refreshes automatically after sync completes
- [x] Tested — button triggers correct API call, status updates on response

---

## Phase 19: Auth — Signup + Login

**User stories**: 22

### What to build

Supabase Auth with email/password. Signup and login pages. Session cookies set on successful auth. All app routes redirect unauthenticated users to login. Logout clears session.

### Acceptance criteria

- [x] User can sign up with email + password
- [x] User can log in and is redirected to the review session
- [x] Unauthenticated requests to protected routes redirect to login
- [x] Logout clears session and redirects to login
- [x] Auth state persists across page refreshes

---

## Phase 20: Auth — User Scoping + RLS

**User stories**: 1, 22, 23

### What to build

Add `user_id` to all tables. Enable Supabase Row Level Security policies so users can only read and write their own rows. Store Chess.com username per user (in `users` table). Sync pipeline uses the authenticated user's configured username. All API routes reject requests from unauthenticated users.

### Acceptance criteria

- [x] RLS policies in place on all tables — no cross-user data leakage
- [x] Chess.com username stored per user and used in sync pipeline
- [x] Two separate test accounts have fully isolated card decks and review history
- [x] All API routes return 401 for unauthenticated requests
- [x] Integration tested — user A cannot read or write user B's rows

---

## Design Polish Backlog (Next Up)

After Phase 20, the app was re-skinned with the "Pattern" editorial design. Wiring the new screens to existing data surfaced ten gaps where the design asks for features the backend doesn't yet support — schema fields, new API routes, and small UI pieces. These live as GitHub issues [#28–#37](https://github.com/moscowac-source/chess_game_reviewer/issues) and are the next work to do before Phase 21.

**The next step is to flesh each issue out into its own plan and then execute them, one at a time, using the standard `/tdd` workflow in `PROCESS.md`.**

For each issue, the fleshing-out step should produce:
- A short description in plain English of what the user will see change
- The database changes needed (new columns, new tables)
- The new or changed API routes
- The UI screens/components that get wired up
- Acceptance criteria that can be tested

### Issues to flesh out

1. [#28 — Add theme and note fields to cards](https://github.com/moscowac-source/chess_game_reviewer/issues/28)
2. [#29 — Store CPL per card](https://github.com/moscowac-source/chess_game_reviewer/issues/29)
3. [#30 — Build deck browser API and page](https://github.com/moscowac-source/chess_game_reviewer/issues/30)
4. [#31 — Track daily review streak](https://github.com/moscowac-source/chess_game_reviewer/issues/31)
5. [#32 — Compute 7-day review accuracy](https://github.com/moscowac-source/chess_game_reviewer/issues/32)
6. [#33 — Classification breakdown for dashboard](https://github.com/moscowac-source/chess_game_reviewer/issues/33)
7. [#34 — Recent games panel on dashboard](https://github.com/moscowac-source/chess_game_reviewer/issues/34)
8. [#35 — Persist daily new-cards cadence from onboarding](https://github.com/moscowac-source/chess_game_reviewer/issues/35)
9. [#36 — Real-time sync progress via background job](https://github.com/moscowac-source/chess_game_reviewer/issues/36)
10. [#37 — Dynamic user avatar and name in nav](https://github.com/moscowac-source/chess_game_reviewer/issues/37)

Order of execution is not fixed — pick them up based on priority. Issues #28, #29, and #35 are schema additions that several later tiles depend on, so those are natural early candidates.

### Execution order (approved)

**Step 1 — Schema foundation:** #28, #29, #35 (do these first, back-to-back)
**Step 2 — Dashboard stats:** #31, #32, #33
**Step 3 — Dashboard content + polish:** #34, #37
**Step 4 — Bigger features:** #30 (deck browser), then #36 (real-time sync progress)

---

### Mini-plan: Issue #28 — Add theme and note fields to cards

**What the user will see change.** On the dashboard's "Today's queue" list and on the review screen's side panel, each card will show a short human-readable note (e.g. "Don't trade the fianchetto bishop") and a theme tag (tactics, endgame, or opening). Cards that existed before this change will still work — they'll just show no note or theme until they're regenerated by a future sync.

**Database changes.** One migration (`005_cards_theme_note.sql`) adds two nullable text columns to the `cards` table: `theme` and `note`. Both are optional so existing rows stay valid.

**How theme is populated.** Automatic heuristic at card-creation time in the sync pipeline:
- **Opening** — if the game's move number is ≤ 12.
- **Endgame** — if total non-king material on the board is ≤ 14 points (queen=9, rook=5, bishop/knight=3, pawn=1).
- **Tactics** — everything else.

**How note is populated.** Left null in this issue. Note is a placeholder column for a future AI-coaching feature (out of scope). This issue just creates the slot.

**API changes.** The review session and dashboard queue endpoints (`app/api/review/session`, `app/api/review/cards`, `app/api/sync/...` as relevant) already return the full card row — they just need to pass `theme` and `note` through. No new routes.

**UI changes.** Dashboard "Today's queue" tile shows the theme as a small badge next to each card. Review screen's side panel shows the note under the classification badge when present.

**Acceptance criteria.**
- [x] Migration `005_cards_theme_note.sql` adds nullable `theme TEXT` and `note TEXT` to `cards`
- [x] `types/database.ts` reflects the new columns
- [x] Card generator writes a theme (`opening` / `endgame` / `tactics`) on every new card using the heuristic above
- [x] Existing cards with null theme/note are still returned by review and dashboard APIs without error
- [x] `theme` is visible as a badge on dashboard "Today's queue"
- [x] `note` is visible in review side panel when non-null (hidden otherwise)
- [x] Unit test for theme heuristic covers opening, endgame, and tactics cases

---

### Mini-plan: Issue #29 — Store CPL per card

**What the user will see change.** On the review screen's side panel, a centipawn-loss badge (e.g. "−310 cp") appears for every newly generated card, showing how much material the player's move lost compared to the best move. Older cards without CPL show no badge.

**Database changes.** One migration (`006_cards_cpl.sql`) adds a nullable `cpl INTEGER` column to `cards`. Nullable because existing cards have no stored CPL and we won't backfill.

**What CPL means.** Centipawn loss is a Stockfish-computed number already calculated during sync to pick the classification (blunder / mistake / great / brilliant). Today we throw it away after classifying. This issue just keeps it.

**API changes.** Review session endpoints pass `cpl` through on each card. No new routes.

**UI changes.** Review screen side panel renders a CPL badge next to the classification badge when `cpl` is not null.

**Acceptance criteria.**
- [x] Migration `006_cards_cpl.sql` adds nullable `cpl INTEGER` to `cards`
- [x] `types/database.ts` reflects the new column
- [x] Card generator writes the CPL value on every new card
- [x] Review session API returns `cpl` on each card
- [x] CPL badge renders on review side panel when non-null and is hidden when null
- [x] Integration test — a sync run produces cards with non-null `cpl`

---

### Mini-plan: Issue #35 — Persist daily new-cards cadence from onboarding

**What the user will see change.** During signup, the onboarding slider that asks "how many new cards per day?" will actually save the chosen number. From then on, each review session respects that number instead of the hardcoded default. The user can also change the number later from a new "Settings" link on the dashboard.

**Database changes.** One migration (`007_users_daily_new_limit.sql`) adds a `daily_new_limit INTEGER NOT NULL DEFAULT 10` column to `users`. The default `10` means any existing user automatically gets the previous hardcoded cap, so nothing breaks.

**API changes.** One new route: `PATCH /api/user/settings`, accepting `{ daily_new_limit: number }` (validated as an integer between 4 and 30 to match the slider range). Auth-scoped — only updates the current user's row.

**Where the cadence is read.** The review session query that decides how many "new" cards to hand out today currently uses a hardcoded cap. It will be changed to read `daily_new_limit` from the logged-in user's row.

**UI changes.**
- `app/onboard/page.tsx` CadenceStep calls `PATCH /api/user/settings` with the slider value when the step completes.
- A small "Settings" link is added to the dashboard (footer) opening a dialog or page with the same slider, which also calls `PATCH /api/user/settings`.

**Acceptance criteria.**
- [x] Migration `007_users_daily_new_limit.sql` adds `daily_new_limit INT NOT NULL DEFAULT 10` to `users`
- [x] `types/database.ts` reflects the new column
- [x] `PATCH /api/user/settings` validates 4 ≤ `daily_new_limit` ≤ 30 and updates the current user row only
- [x] Onboarding CadenceStep saves the slider value by calling the new endpoint
- [x] Review session query uses the user's `daily_new_limit` instead of the hardcoded cap
- [x] Dashboard has a Settings entry point where cadence can be changed later
- [x] Unauthenticated requests to `PATCH /api/user/settings` return 401
- [x] Integration test — changing the cadence changes how many new cards a review session returns

---

### Mini-plan: Issue #31 — Track daily review streak

**What the user will see change.** The dashboard's "Day streak" tile (currently `—` with "Not tracked yet") shows a number: the count of consecutive days the user has reviewed at least one card, counting today. If the user hasn't reviewed today yet but did review yesterday, the streak still shows — a streak only breaks once a full day is skipped. No reviews at all, or most recent review 2+ days ago, shows `0`.

**Database changes.** None. Every review already writes a row to `review_log` with a `reviewed_at` timestamp. Consecutive-day counting runs over those rows.

**API changes.** One new route: `GET /api/stats/streak`. Auth-scoped. Returns `{ streak: number }`. Logic: collect distinct UTC days from the user's `review_log` rows, start at today (or yesterday if today has none), then walk backwards day-by-day counting while each previous day is present; stop at the first gap.

**UI changes.** Dashboard stats strip "Day streak" tile fetches `/api/stats/streak` on load and renders the number. Falls back to `—` if the fetch fails. The "Not tracked yet" subtitle is removed.

**Acceptance criteria.**
- [x] `GET /api/stats/streak` returns `{ streak: N }` for the authenticated user
- [x] Unauthenticated requests return 401
- [x] Streak is `0` when the user has never reviewed a card
- [x] Streak counts today if there's a review today
- [x] Streak counts yesterday as the end if there's no review today but there is yesterday
- [x] Streak is `0` if the most recent review was 2+ days ago
- [x] Consecutive-day counting stops at the first gap
- [x] Dashboard "Day streak" tile shows the value from the new endpoint instead of `—`
- [x] Unit tests cover: no reviews, today only, yesterday only, 5-day unbroken run, run broken by a gap, multiple reviews on the same day
- [x] Integration test: mocked `review_log` rows produce the expected streak via the API

---

### Mini-plan: Issue #32 — 7-day review accuracy on the dashboard

**What the user will see change.** The dashboard's "7-day accuracy" tile (currently `—` with "Not tracked yet") shows a percentage: the share of reviews in the last 7 days where the user got the card right. "Right" means the review was rated `good` or `easy`; "wrong" means `again` or `hard` (hard indicates enough struggle to count as a miss for this metric). If the user has no reviews in the last 7 days, the tile shows `—`.

**Database changes.** None. Every review already writes a row to `review_log` with `user_id`, `card_id`, `rating`, and `reviewed_at`.

**API changes.** One new route: `GET /api/stats/accuracy?days=7`. Auth-scoped. Returns `{ accuracy: number | null, totalReviews: number }`. `accuracy` is `null` when there are zero reviews in the window; otherwise a whole-number percent (0–100) of `(good + easy) / total`. `days` is validated as an integer 1–30 (default 7).

**UI changes.** Dashboard stats strip "7-day accuracy" tile fetches `/api/stats/accuracy?days=7` on load and renders `{accuracy}%` when non-null, `—` otherwise. The "Not tracked yet" subtitle is removed.

**Acceptance criteria.**
- [x] `GET /api/stats/accuracy?days=7` returns `{ accuracy, totalReviews }` for the authenticated user
- [x] Unauthenticated requests return 401
- [x] `accuracy` is `null` when the user has no reviews in the window
- [x] `accuracy` is a whole-number percent (rounded) of `(good + easy) / total` over the window
- [x] `days` query param is validated as integer 1–30; invalid values return 400
- [x] Reviews older than the window are excluded
- [x] Dashboard "7-day accuracy" tile shows `{accuracy}%` when non-null, `—` otherwise; "Not tracked yet" subtitle removed
- [x] Unit tests cover: no reviews, all-correct, all-incorrect, mixed, reviews at and just outside the 7-day boundary, rounding
- [x] Integration test: mocked `review_log` rows produce the expected accuracy via the API

---

### Mini-plan: Issue #34 — Recent games panel on dashboard

**What the user will see change.** A new "Recent games" strip appears on the dashboard (between Deck breakdown and Today's queue). It lists the last up to 5 games from recent syncs, each row showing opponent name, Win/Loss/Draw outcome, how many cards that game added to the user's deck, ECO code, and a link that opens the original game on chess.com. Games synced before this change don't appear — only newly synced games — because the metadata wasn't stored before.

**Database changes.** Migration `008_games_and_cards_link.sql` adds nullable columns `white`, `black`, `result`, `url`, `eco` to `games`, a `UNIQUE (user_id, url)` partial index for sync-time dedupe, and a nullable `game_id UUID` FK on `cards` (ON DELETE SET NULL).

**Sync pipeline.** For each PGN processed, the orchestrator now parses the PGN headers via `parsePgnHeaders`, looks up or inserts a `games` row (keyed on `(user_id, url)` when a Link header is present), and passes the resulting game id into `generateCards` so new cards carry `game_id`. Pre-existing cards are not modified.

**API changes.** New route `GET /api/games/recent?limit=5`. Auth-scoped (401 when unauthenticated), validates `limit` as integer 1–10 (default 5, invalid → 400). Returns an array of `{ id, played_at, white, black, result, url, eco, cardCount, opponent, outcome }`. `cardCount` is per-user (scoped via `card_state`). `opponent` and `outcome` (`win`/`loss`/`draw`/`unknown`) are pre-computed server-side by case-insensitively matching the user's `chess_com_username` against the white/black headers.

**UI changes.** Dashboard fetches `/api/games/recent?limit=5` on load and renders a Recent games section with one row per game. Each row is an `<a target="_blank">` when `url` is present, otherwise a plain non-clickable row. Panel is hidden entirely when the list is empty.

**Acceptance criteria.**
- [x] Migration `008_games_and_cards_link.sql` adds `white`, `black`, `result`, `url`, `eco` to `games`; adds `UNIQUE (user_id, url)`; adds nullable `game_id` to `cards`
- [x] `types/database.ts` reflects the new columns
- [x] Sync pipeline inserts/upserts a `games` row per processed PGN with all available header fields populated
- [x] Newly generated cards have `game_id` set; pre-existing cards are not modified
- [x] Re-syncing the same game url does not create a duplicate `games` row
- [x] `GET /api/games/recent?limit=5` returns up to 5 most recent games with per-user `cardCount`
- [x] Unauthenticated requests to `/api/games/recent` return 401
- [x] `limit` outside 1–10 returns 400; missing/invalid defaults are handled
- [x] Dashboard renders a Recent games panel with opponent, outcome (Win/Loss/Draw), card count, ECO, and a chess.com link per row
- [x] Panel is hidden when no recent games exist
- [x] Unit tests cover PGN header parsing (success + missing), opponent detection (case-insensitive), outcome mapping for both colors and draws
- [x] Integration test: sync run followed by `/api/games/recent` returns the expected rows with correct `cardCount`

---

### Mini-plan: Issue #33 — Classification breakdown for dashboard

**What the user will see change.** Below the dashboard stats strip, a new "Deck breakdown" section shows how the user's full deck splits across the four classifications — Blunders, Mistakes, Greats, Brilliants — as a row of four small tiles. If the deck is empty, all four read `0`.

**Database changes.** None. The `cards` table already stores `classification`; card ownership is derived via `card_state` (a card belongs to a user if there's a `card_state` row for that pair).

**API changes.** One new route: `GET /api/stats/classification`. Auth-scoped. Returns `{ blunder, mistake, great, brilliant }` — counts of the authenticated user's cards in each category. Unauthenticated requests get 401.

Note — Issue #33 mentioned extending `/api/review/counts`, but that endpoint returns due-today per mode (FSRS-scheduled). A separate stats endpoint keeps "total deck shape" distinct from "what's due now," matching the pattern used for `/api/stats/streak` and `/api/stats/accuracy`.

**UI changes.** Dashboard fetches `/api/stats/classification` on load and renders a four-tile "Deck breakdown" section between the stats strip and "Today's queue."

**Acceptance criteria.**
- [x] `GET /api/stats/classification` returns `{ blunder, mistake, great, brilliant }` for the authenticated user
- [x] Unauthenticated requests return 401
- [x] Counts reflect only the current user's cards (via `card_state`), not the global `cards` table
- [x] Classifications outside the four categories are ignored
- [x] Returns `0` for each category when the user has no cards
- [x] Dashboard renders a "Deck breakdown" section with four tiles using the endpoint's counts
- [x] Unit tests cover: 401, empty deck, mixed counts, unknown classifications, cross-user isolation
- [x] Integration test: mocked `card_state`/`cards` rows produce the expected counts via the API

---

### Mini-plan: Issue #42 — Shared Supabase mock factory for API tests

**What the user will see change.** Nothing visible in the app. This is an internal test-infrastructure change. Behind the scenes, every API-route test that used to build its own hand-rolled fake database now uses one shared helper. New API routes can be tested in a few lines instead of re-implementing the same fluent-chain mock every time.

**What was wrong.** Eleven test files each defined a local `makeMockDb(...)` helper, each one a slightly different reinvention of Supabase's `.from().select().eq().in().order().limit().single()` chain. When a new route needed a different operator (like `.gte()` or `.maybeSingle()`), the author copied the closest existing shape and tweaked it. Any bug in one copy had to be found and fixed in every copy. Writing a new test meant writing 30–80 lines of mock plumbing before getting to the actual assertion.

**What changed.**
- New file `__tests__/helpers/mock-db.ts` exports `makeMockDb(seed)`. You give it seed rows keyed by table name (e.g. `{ users: [...], games: [...], card_state: [...] }`) and it returns `{ db, tables, inserted, updated, deleted }`. The `db` object mimics Supabase's fluent chain honestly — it applies filters, ordering, and limits to the seed rows and returns the result. Writes mutate the seeded tables so follow-up reads see the change.
- Supports every operator the existing API routes actually call: `select`, `eq`, `in`, `gte`, `lte`, `order`, `limit`, `single`, `maybeSingle`, `insert`, `update`, `upsert`, `delete`, `match`. Auto-generates ids for inserted rows that don't specify one.
- All 10 existing API-route test files were migrated to use the shared helper. `review-card.test.ts` was left alone because it doesn't use a DB mock.
- `jest.config.js` got a `testMatch` entry so Jest only picks up `*.test.*` files — otherwise it would try to run the helper module itself as a test.

**Acceptance criteria.**
- [x] `__tests__/helpers/mock-db.ts` exports `makeMockDb(seed)` with operator parity to existing route usage
- [x] `__tests__/helpers/mock-db.test.ts` exercises the helper (read path, write path, seed isolation) and passes
- [x] All 10 migratable API test files use the shared helper; local `makeMockDb` copies are removed
- [x] Full test suite (`npx jest`) passes — 257 tests across 34 suites
- [x] `jest.config.js` scopes test discovery to `*.test.*` so non-test helpers aren't misread as test files

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
