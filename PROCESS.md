# Development Process

This file defines the rigid phase-by-phase development workflow for Chess Improver.
Follow this process for every phase without exception.

## Communication Style

The user is not a developer. All explanations, plans, and clarifications must be written in plain language — no jargon, no code snippets, no technical terms without a plain-English explanation. When presenting a plan before starting work, describe what the code will *do* and *why*, not how it is structured internally. If a technical concept must be mentioned, explain it in one sentence a non-developer would understand.

## Current Focus — Design Polish Backlog

Phases 1–20 are complete. Before starting Phase 21, work through the **Design Polish Backlog** documented in `plans/chess-improver.md` — ten GitHub issues ([#28–#37](https://github.com/moscowac-source/chess_game_reviewer/issues)) that surfaced when the new design was wired up.

For each issue:
1. Flesh it out into a plan (plain-English description, schema changes, API changes, UI changes, acceptance criteria) — add it to `plans/chess-improver.md` as its own mini-phase or append it to the issue itself
2. Execute using the same `/tdd` workflow described below

## Before Starting Any Phase (or Backlog Issue)

1. **Read the plan.** Open `plans/chess-improver.md`. Read the phase or backlog issue you are about to start — its description and acceptance criteria.
2. **Read the architectural decisions section** at the top of the plan. Every piece of work must stay consistent with those decisions.
3. **Check the previous phase is complete.** All acceptance criteria for the prior phase must be checked off before starting a new one. Do not carry forward unchecked criteria.

---

## Phase Kickoff

Use the `/tdd` skill to start each phase:

```
/tdd Phase N: [Phase Title] — see plans/chess-improver.md for acceptance criteria and architectural context
```

The TDD skill will:
- Draft a GitHub issue for this phase
- Write failing tests that match the acceptance criteria
- Drive implementation until tests pass

---

## Development Cycle (Repeat Until All Criteria Pass)

```
Write failing test → Implement minimal code to pass → Run tests →
  if PASS → move to next criterion
  if FAIL → diagnose error, fix, re-run (do not skip or mock away failures)
```

**Rules:**
- Never write implementation code before a failing test exists for it
- Never mark a criterion complete until a test proves it
- If a test is hard to write, that is a signal the interface is wrong — redesign before proceeding
- Do not add code beyond what is needed to pass the current test

---

## Corrections Loop

When tests fail after an attempted fix:

1. Read the error message fully before making any change
2. Identify whether the failure is in the test, the implementation, or the interface contract
3. Fix the root cause — do not work around failures with mocks or skips
4. Re-run the full test suite after every fix (not just the failing test) to catch regressions
5. If stuck after 2 fix attempts, reconsider the design before trying again

---

## Phase Completion Checklist

Before marking a phase done and moving to the next:

- [ ] All acceptance criteria in `plans/chess-improver.md` are checked off (tick each `- [ ]` → `- [x]`)
- [ ] `npm test` passes with no failures or skipped tests
- [ ] TypeScript compiles with no errors (`npm run typecheck` or `tsc --noEmit`)
- [ ] No `console.log`, debug code, or commented-out code left behind
- [ ] Commit all changes with a descriptive message and push to `main` on `moscowac-source/chess_game_reviewer`
- [ ] The GitHub issue for this phase is closed
- [ ] Check off the completed phase in the V1 roadmap tracking issue: moscowac-source/chess_game_reviewer#2
- [ ] Generate a kickoff prompt for the next phase (see below)

### Next Phase Kickoff Prompt

After all other checklist items are complete, output a ready-to-paste prompt the user can use to start the next phase in a new session. The prompt must include:

- The working directory and repo
- Instructions to read `plans/chess-improver.md` and `PROCESS.md` before doing anything
- The phase number and title
- The instruction to use `/tdd` to kick it off, following the format in PROCESS.md

Example format:
```
I'm working on Chess Improver.

Repo: moscowac-source/chess_game_reviewer
Working directory: ~/Desktop/Chess Improver
V1 roadmap tracking issue: moscowac-source/chess_game_reviewer#2

Before doing anything, read:
- plans/chess-improver.md (full plan + architectural decisions)
- PROCESS.md (development workflow — follow this exactly)

We're starting Phase N: [Phase Title]. Follow the process in PROCESS.md:
read the phase criteria, then use /tdd to kick it off.
```

---

## What Not To Do

- Do not refactor code from a prior phase unless a test in the current phase requires it
- Do not add features, helpers, or abstractions not required by the current phase's criteria
- Do not move on because something "looks right" — a passing test is the only definition of done
- Do not pre-draft GitHub issues for future phases — create them just-in-time when you start that phase
