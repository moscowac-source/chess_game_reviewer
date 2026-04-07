# Design System: The Grandmaster / Scholarly Atelier

> Source: Stitch mockup. Screenshots in this directory are the canonical visual reference.
> Brand name in mockup: **The Grandmaster — Scholarly Atelier**

---

## 1. Overview & Creative North Star

**The Creative North Star: "The Digital Curator"**

This design system moves away from the sterile, plastic nature of standard chess interfaces and toward the tactile, intellectual atmosphere of a high-end editorial journal or a grandmaster's private study. We are not building a game; we are crafting a digital atelier for the pursuit of excellence.

To achieve this "Grandmaster Editorial" feel, the system prioritizes **intentional asymmetry** and **tonal depth** over rigid grids. We break the "template" look by using exaggerated typographic scales — pairing oversized, graceful serifs with hyper-functional, condensed data points. The layout should feel like a bespoke broadsheet, where negative space is used as a functional tool to focus the mind on the board.

---

## 2. Colors & Surface Philosophy

The palette is rooted in a "paper-first" logic. We avoid the clinical coldness of pure white (#FFFFFF) in favor of a sophisticated, warm off-white that mimics high-grade archival paper.

| Token | Hex | Usage |
|---|---|---|
| `background` | `#faf9f8` | Canvas / page background |
| `surface_container_low` | `#f4f3f2` | Large secondary regions (sidebar, move list) |
| `surface_container_lowest` | `#ffffff` | Cards lifted off containers |
| `surface_container_high` | `#e9e8e7` | Hover state (tonal, not shadow) |
| `surface_container_highest` | `#e3e2e1` | Light chessboard squares |
| `primary` | `#000666` | Deep ink blue — CTAs, dark board squares |
| `primary_container` | `#1a237e` | CTA gradient end, dark board squares |
| `on_primary` | `#ffffff` | Text on primary buttons |
| `on_background` | `#1a1c1c` | Body text (never pure black) |
| `secondary` | `#1b6d24` | Brilliant move highlights (30% opacity) |
| `secondary_container` | _(muted green)_ | "Book" move chips |
| `tertiary_fixed` | `#ffdcc0` | Inaccuracy highlights |
| `tertiary_container` | _(muted orange)_ | Mistake chips |
| `outline_variant` | `#c6c5d4` | Ghost borders at 15% opacity only |

### Rules
- No 1px solid borders for sectioning — use tonal layering instead ("The No-Line Rule")
- Main CTAs: linear gradient `primary` → `primary_container` at 135°
- Floating overlays: semi-transparent surface + `backdrop-blur: 12px–20px` (glassmorphism)
- Never use `#000000` for text
- Never use vibrant "tech" electric blues

---

## 3. Typography

| Role | Font | Size | Usage |
|---|---|---|---|
| Display / Headlines | Newsreader (serif) | 3.5rem (Display-LG) | Game results, hero sections, player names, editorial insights |
| Titles | Newsreader | varies | Section headers, card titles |
| Move notation | Inter | 1rem (Title-SM) | Move list, SAN notation |
| Metadata labels | Inter, all-caps, 0.5px tracking | 0.75rem (Label-SM) | "ENGINE DEPTH", "ACCURACY", "LAST SEEN" |
| Data / evaluations | Inter | varies | ELO, clock, CPL scores (+1.2) |

**Principle:** Newsreader = human/editorial elements. Inter = machine/data elements.

---

## 4. Elevation & Depth

- **Hover:** Transition background from `surface` to `surface_container_high` — no shadows
- **Floating dialogs:** Box shadow 40px blur, 6% opacity, tinted with `primary`
- **Ghost borders:** `outline_variant` at 15% opacity only — never 100% opaque lines

---

## 5. Components

### Chessboard
- Light squares: `surface_container_highest` (#e3e2e1)
- Dark squares: `primary_container` (#1a237e)
- Brilliant move highlight: `secondary` (#1b6d24) at 30% opacity
- Inaccuracy highlight: `tertiary_fixed` (#ffdcc0)
- Move arrows: rendered on canvas over board

### Buttons
- **Primary:** Gradient fill, `on_primary` text, `border-radius: 0.125rem` (sharp/formal)
- **Secondary:** No fill, `primary` text, ghost border on hover

### Cards (mode selection, quiz cards)
- Background: `surface_container_lowest` (#ffffff)
- No borders — lift defined by tonal contrast against parent container
- Rounded corners implied by mockup (approx `border-radius: 0.75rem`)

### Chips / Tags
- Blunder/Mistake: `tertiary_container`, full roundedness
- Book/Brilliant: `secondary_container`, full roundedness

### FSRS Rating Buttons (study screen)
Four equal-width cards across the bottom of the study screen:
| Rating | Label | Sublabel | Interval shown |
|---|---|---|---|
| Again | Forgot | — | < 1 min |
| Hard | Struggled | — | 2 days |
| Good | Recall | — | 4 days |
| Easy | Obvious | — | 7 days |

---

## 6. Screens

### Screen 1: Performance Dashboard (`/`)
> Reference: `dashboard.png`

**Layout:** Fixed left sidebar (200px) + main content area.

**Sidebar contents:**
- Brand: "The Grandmaster / SCHOLARLY ATELIER" (Newsreader)
- Nav: Dashboard, Library, Game History, Analysis, Settings
- "+ New Session" primary CTA button (bottom of sidebar)
- User avatar + name + tier ("PRO MEMBER") at very bottom

**Main content:**
- Page title: "Performance Dashboard" (Newsreader, large)
- Search bar + icon buttons (top right)
- Eyebrow label: "PERFORMANCE INSIGHTS" (Inter, all-caps, accent color)
- Hero headline: "Growth is the result of *honest review*." (Newsreader, ~3rem, italic emphasis on last two words in muted color)
- Welcome message: personalized copy + weekly improvement stat
- Global Performance Rating: "2450 GPR" (large, `secondary` green, top-right of content area)

**Three mode cards (horizontal row):**

| Card | Badge | Title | Description | Stat | CTA |
|---|---|---|---|---|---|
| Recent Sessions | "LAST 24 HOURS" | Recent Sessions | Reviewing performance across N games | Win Rate + Avg Accuracy | VIEW ALL |
| Mistakes to Master | "3 BLUNDERS" (red badge) | Mistakes to Master | Convert your recent errors into tactical lessons | Rehabilitation Progress (N/N Solved) + Difficulty | FIX NOW |
| Brilliant Reinforcements | "BRILLIANT !!" (green badge) | Brilliant Reinforcements | Solidify the patterns behind your best recent moves | Pattern Retention + Recent Wins streak | REVIEW HITS |

**Featured position card (below mode cards):**
- Large card spanning ~2/3 width
- Title: "Brilliant Finish" (Newsreader italic)
- Description: plain-English game narrative (opponent, move, result)
- Inline board thumbnail (right side of card)
- CTAs: "REPLAY SEQUENCE" (primary) + "ANNOTATE" (secondary)

**Performance Trends card (1/3 width, beside featured position):**
- Two bullet sections: STRENGTH and FOCUS AREA
- Short plain-English summaries of trends

**Footer quote:**
- Centered, italic serif quote
- Attribution in Inter all-caps

---

### Screen 2: Study / Review Session (`/study`)
> Reference: `study.png`

**Layout:** Fixed left sidebar + board (left ~55%) + analysis panel (right ~45%).

**Sidebar:** Library, Study (active), Analysis, Import, Settings. User avatar bottom-left.

**Header:** "The Grandmaster Editorial" (Newsreader)

**Board area (left):**
- Full chessboard with move arrow rendered
- Vertical evaluation bar on the left edge (subtle, off-center per design intent)

**Analysis panel (right):**
- Eyebrow: "ORIGINAL GAME CONTEXT" (Inter, all-caps, `secondary` green)
- Title: move name e.g. "Knight to f3" (Newsreader, large)
- "MISSED OPPORTUNITY" card: shows opponent name (bolded), move you played (highlighted in accent), engine's better move (highlighted in green), classification label ("Brilliant")
- **Engine Synthesis quote block** (italic serif, large): plain-English explanation of why the engine move is better. Attribution: "— ENGINE SYNTHESIS V4.2". *This is the Phase 21 Move Explanations feature.*
- "STRATEGIC RATIONALE" section: 2–3 icon + label + description bullet points (e.g. Center Control, Kingside Development)
- Metadata row: "LAST SEEN: N days ago" + "SUCCESS RATE: N%"

**FSRS rating row (bottom, full width):**
- Four equal cards: AGAIN / HARD / GOOD / EASY
- Each shows rating label, descriptor word, and next interval

---

## 7. Do's and Don'ts

**Do:**
- Use intentional asymmetry (evaluation bar off-center, non-uniform column widths)
- Embrace negative space — at least 48px padding between board and sidebar
- Use tonal transitions on hover (background shift, no shadows)

**Don't:**
- Use heavy borders — increase line-height or tracking instead
- Use `#000000` for text — use `on_background` (#1a1c1c)
- Use vibrant "tech" electric blues — keep it deep, ink-like, scholarly

---

## 8. Notes for Implementation

- The **Engine Synthesis quote** (Screen 2) is the Phase 21 Move Explanations feature. Do not implement the quote block until Phase 21 — add a placeholder or hide the section until explanation data exists on the card.
- The **"ORIGINAL GAME CONTEXT"** section (opponent name, game reference) requires storing game context on cards. This is not in the current schema — flag for Phase 8 (Card Generator) whether to add `game_id` FK or inline opponent/date fields.
- The **GPR (Global Performance Rating)** shown on the dashboard is not in the current data model. Treat as a V2 metric; use a placeholder in Phase 16 UI.
- The mode card names in the mockup differ slightly from the plan. Canonical names are:
  - **Recent Sessions** (plan: "Recent Games")
  - **Mistakes to Master** (plan: same)
  - **Brilliant Reinforcements** (plan: "Back to Brilliancies" → updated to match mockup)
