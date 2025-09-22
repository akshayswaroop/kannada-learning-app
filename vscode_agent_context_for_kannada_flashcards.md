# VS Code Agent Context — Kannada Flashcards App

This file is intended for a VS Code-based assistant (or human developer) who will continue work on the Kannada Flashcards app.

## Purpose
Provide a concise, actionable context so the VS Code agent can pick up development immediately (run, test, debug, and extend features). Contains project layout, run commands, important code locations, data rules, and prioritized next tasks.

---

## Quick start (run locally)
1. Ensure Node.js (v18+) is installed.
2. From project root run:

```bash
npm install
npm run dev
```

3. Open `http://localhost:3000` (or the port your dev server reports) to preview the app.

---

## Key files
- `src/App.jsx` — primary React component (single-file app). Contains dataset (`RAW_CARDS`), sanitization, UI, drag/drop logic and localStorage stats.
- `package.json` — dev scripts and dependencies.
- `.vscode/` (optional) — place run/debug tasks and recommended extensions.

---

## Data and sanitization
- Deck is defined in `RAW_CARDS` inside `src/App.jsx`.
- `wordKannada` must contain only Kannada block characters (U+0C80–U+0CFF). The app uses `sanitizeKannada()` to strip non-Kannada codepoints at runtime and logs any sanitization event.
- `transliterationHi` holds the Devanagari (Hindi) spelling and is allowed to contain Devanagari characters (displayed in the header only).
- Tiles are created by `Array.from(wordKannada)` (codepoint-level). There's a TODO to optionally group grapheme clusters for kid-friendly tiles.

Important constants
- `BASE_STATS_KEY = 'kannada_glyph_stats_v1'` — prefix for per-profile stats in `localStorage`.
- `PROFILES = ['Mishika','Akshay']` — default learners. The app persists separate stats per profile using `statsKeyFor(profile)`.

---

## Behavior to preserve
- Shuffle deck on start; `reshuffle` re-sanitizes and shuffles.
- Tiles should never initially appear in correct order (app attempts multiple shuffles to avoid that).
- Drag & drop with fallback tap-to-place; clicking a filled slot returns tile to pool.
- `Show hint` temporarily displays slot/tile numbering for `~2.2s`.
- `Submit` updates per-glyph stats and marks result `correct`/`incorrect`.

---

## Known issues / edge cases
- Some older entries had non-Kannada codepoints (Malayalam/Devanagari). These were corrected for the four flagged IDs (kausalyaa, janaka, jatayu, atikaya) — confirm dataset if you add more cards.
- Codepoint-level tiles create separate virama and matra tiles. Consider switching to grapheme clusters if you want combined visual blocks.

---

## Prioritized next tasks (suggested for the VS Code agent)
1. **Add unit / integration tests** — test sanitization, tile splitting, and localStorage persistence (Jest + React Testing Library).
2. **Implement grapheme-cluster grouping mode**: add a toggle to use Unicode grapheme clustering (Intl.Segmenter or `grapheme-splitter`) so tiles represent perceptual characters.
3. **Refactor dataset** into `src/data/cards.js` exporting canonical deck — simplifies editing and localization.
4. **Add CSV/JSON import/export**: allow exporting the deck and stats for review / backups.
5. **Accessibility**: add keyboard-only controls for tile movement and ARIA labels.
6. **UI polishing**: move styles to CSS modules / tailwind, tweak button order per UX discussion.
7. **E2E tests** with Playwright — simulate drag/drop and check glyph stats update.

---

## Coding conventions / style
- Keep `App.jsx` self-contained for now but prefer splitting into smaller components (`TilePool`, `Slots`, `Controls`, `RightPanel`, `DeckManager`) before adding heavy features.
- Keep logic for sanitization and tile-splitting centralized and pure (easy to test).
- Use small, focused commits with clear messages.

---

## Debugging tips
- If tiles show unexpected characters, open DevTools console — `sanitizeKannada` logs the `id` and original/sanitized strings.
- localStorage keys: `kannada_glyph_stats_v1::Mishika` and `kannada_glyph_stats_v1::Akshay`.
- To reset everything, clear localStorage or use Reset buttons in UI (glyph stats reset and tile reset exist in the UI).

---

## Example change flow for agent
1. Create a branch `feature/grapheme-tiles`.
2. Move deck into `src/data/cards.js` and update `src/App.jsx` to import it.
3. Add `graphemeSplitter` module and a UI toggle to switch split mode; write unit tests.
4. Open a PR with screenshots and test results.

---

## Files you may want to add to repo now
- `.vscode/launch.json` and `.vscode/tasks.json` for dev/debug integration.
- `src/data/cards.js` — canonical deck export.
- `tests/` — unit tests.
- `docs/DEVELOPER_NOTE.md` — short onboarding doc referencing this context file.

---

If you want, I can also:
- Generate `src/data/cards.js` with the current verified deck.
- Create a `.vscode/tasks.json` and `launch.json` to speed up VS Code agent work.

Tell me which of the above you want created next and I’ll add it to the canvas as files the agent can use.

