# AGENTS — Kannada Learning App

This guide primes GitHub Copilot, ChatGPT Codex, and similar automation agents before they modify the repo. Keep it nearby while proposing completions, drafting patches, or reviewing PRs.

## Snapshot
- **Goal:** A React + Vite practice tool that lets kids arrange Kannada glyph tiles and drills them on math facts and English sight words.
- **Entry point:** `src/App.jsx` (single-file app containing UI, data plumbing, and localStorage logic).
- **Data:** `src/data.js` exports card decks, profile list, and stat key prefixes.
- **Build/run:** `npm install` then `npm run dev` (no test suite yet).
- **Persistent state:** Browser `localStorage` stores per-profile glyph/math/English stats and TV-minute allowances.

## How the app behaves
1. **Learner profiles:** Dropdown of names from `PROFILES`. Switching profiles reloads stats and TV minutes from storage; always persist the old profile before swapping.
2. **Modes:** `kannada` (arrange tiles), `math` (timed equation drill), `english` (sight-word read/not read). Mode select triggers mode-specific UI while preserving core layout.
3. **Scoring:**
   - Kannada: each slot scored once per card; correct placement `+1`, incorrect `-3`, minimum `0` minutes.
   - Math: baseline `+2/-10`, bonus problems use adjustable reward/penalty (default `+20/-20`). Timeouts count as incorrect and deduct minutes.
   - English: `+2` if read, `-1` otherwise. Timer expiry also penalises.
   Store results with `saveTvMinutes(profile, value)` before returning.
4. **Weakness tracking:** Glyphs, math facts, and English words serialize JSON stats with `{ attempts, correct }` and feed the “Weak …” panels. Update attempts for every submission; only increment `correct` when unassisted success occurs.
5. **Randomness:**
   - Deck shuffles ensure tiles never start ordered (`shuffleArray` loop).
   - Math questions pull from weighted pools via `pickNextMath`; avoid repeating the last fact.
   - English deck is a shuffled slice of 200 words.
6. **Keyboard Enter rules:**
   - Kannada mode: `Enter` submits current attempt when result empty; if result is `'correct'`, `Enter` advances to the next card.
   - Math mode: form submit via `Enter`; after answering, `Enter` should trigger the `Next` button logic.
   - Respect focus management (e.g., math answer input auto-focus).
7. **Parent controls:** Modal gated by passcode `282928` that lets adults award/deduct minutes or reset per-profile TV minutes and stats. Keep validation and reset flows intact.

## When coding, do not break
- Positive/negative scoring rules above, including min-zero guard.
- Accurate stat bookkeeping for glyphs/math/English and their weak panels.
- Randomized deck/question behaviour (including anti-ordered shuffle and weighted math selection).
- Multi-profile persistence and the `statsKeyFor` / `tvKeyFor` naming conventions.
- Enter-key shortcuts and the drag/tap interactions for Kannada tiles.
- Sanitization that strips non-Kannada glyphs while leaving spaces (see `sanitizeKannada`).

## Helpful references
- `README.md` — quick run instructions.
- `vscode_agent_context_for_kannada_flashcards.md` — broader onboarding doc for human/VS Code agents; cross-check tasks here.
- `src/App.jsx` — contains everything from state machines to inline styles; consider modularizing carefully to avoid regressions.

## Suggested agent workflow
1. **Understand intent first.** Skim relevant helpers (`pickNextMath`, `markEnglish`, `quickAdjustTvMinutes`, etc.) before editing.
2. **Plan edits.** If change scope is large, propose extracting sub-components (`TilePool`, `MathPanel`, etc.) gradually with regression checks.
3. **Run locally.** Use `npm run dev`; rely on browser DevTools and console logging (no automated tests yet). Mention manual QA steps in PR descriptions.
4. **Keep diffs tight.** Preserve existing inline styles and behaviour unless the human request says otherwise. Document any data format changes in README + AGENTS.
5. **When unsure, ask.** If requirements conflict or a new feature might affect scoring/randomness, prompt the human maintainer before completing the task.

## Future improvements agents can consider
- Add unit/integration tests (Jest + React Testing Library) for sanitization, scoring, and localStorage persistence.
- Split `App.jsx` into semantic components and move datasets into dedicated modules.
- Add grapheme-cluster tile mode (e.g., `Intl.Segmenter`).
- Provide import/export for stats and decks.
- Layer in accessibility (ARIA, keyboard navigation for tile pools) and end-to-end tests (Playwright).

Use this file as the canonical checklist before Copilot/Codex suggests code. Align completions with these invariants to avoid breaking the kid-facing learning flow.
