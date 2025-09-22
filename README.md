# Kannada Flashcards (Arrange mode)

This is a small React + Vite app to practice arranging Kannada words from glyph tiles.

How to run (macOS / zsh):

1. Install dependencies

```bash
npm install
```

2. Start dev server

```bash
npm run dev
```

Open the printed local URL (usually http://localhost:5173) in your browser.

Notes:
- Stats (per-learner glyph accuracy) are stored in localStorage under keys like `kannada_glyph_stats_v1::Mishika`.
- To reset a learner's stats, use the button in the sidebar.
