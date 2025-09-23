// Kannada Flashcards — first good version
// - Gate hints until an attempt
// - Single-step next-character hints (max 2 per word)
// - Mark hinted glyphs as assisted in stats
// - Live TV-minute incentive awarded/penalized on tile placement
import React, { useEffect, useMemo, useRef, useState } from "react";
import { RAW_CARDS, PROFILES, BASE_STATS_KEY, TV_BASE_KEY, ENGLISH_WORDS } from "./data";

/*
  Full, self-contained App.jsx for the Kannada flashcards (Arrange mode).
  - Fully runnable React component (drop into src/App.jsx)
  - Sanitizes dataset to Kannada-only for tiles
  - Codepoint-level tiles (Array.from)
  - Drag & drop + tap-to-place
  - Profiles (Mishika / Akshay) with per-glyph stats in localStorage
  - Hint (temporary numbering), Reset, Reshuffle, Next
  - Weak-glyphs panel
*/

// Use dataset from src/data.js (contains the expanded card list)

// Minimal Kannada -> Devanagari mapping for common kernel letters.
// This is a starting mapping; add more mappings if you want broader coverage.
const KAN_TO_HI = {
  'ಕ': 'क', 'ಖ': 'ख', 'ಗ': 'ग', 'ಘ': 'घ', 'ಙ': 'ङ',
  'ಚ': 'च', 'ಛ': 'छ', 'ಜ': 'ज', 'ಝ': 'झ', 'ಞ': 'ञ',
  'ಟ': 'ट', 'ಠ': 'ठ', 'ಡ': 'ड', 'ಢ': 'ढ', 'ಣ': 'ण',
  'ತ': 'त', 'ಥ': 'थ', 'ದ': 'द', 'ಧ': 'ध', 'ನ': 'न',
  'ಪ': 'प', 'ಫ': 'फ', 'ಬ': 'ब', 'ಭ': 'भ', 'ಮ': 'म',
  'ಯ': 'य', 'ರ': 'र', 'ಲ': 'ल', 'ವ': 'व', 'ಶ': 'श',
  'ಷ': 'ष', 'ಸ': 'स', 'ಹ': 'ह', 'ಳ': 'ळ', 'ಱ': 'ऱ',
  'ಅ': 'अ', 'ಆ': 'आ', 'ಇ': 'इ', 'ಈ': 'ई', 'ಉ': 'उ', 'ಊ': 'ऊ',
  'ಎ': 'ए', 'ಏ': 'ऐ', 'ಒ': 'ओ', 'ಓ': 'ओ', 'ಔ': 'औ', 'ಅಂ': 'ं'
};

// keep a strict Kannada-only regex (Unicode block U+0C80 - U+0CFF)
const KANNADA_RE = /[ಀ-೿]/u;
function sanitizeKannada(s) {
  if (!s) return "";
  return Array.from(s).filter((ch) => KANNADA_RE.test(ch) || ch === " ").join("");
}

function paletteFor(n) {
  const palette = ["#FFB4C6", "#FFD6A5", "#FDFFB6", "#CAFFBF", "#9BF6FF", "#BDB2FF", "#C8A2FF", "#FFC6FF"];
  return Array.from({ length: n }).map((_, i) => palette[i % palette.length]);
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function statsKeyFor(profile) {
  return `${BASE_STATS_KEY}::${profile}`;
}

function tvKeyFor(profile) {
  return `${TV_BASE_KEY}::${profile}`;
}

function loadTvMinutes(profile) {
  try {
    const raw = localStorage.getItem(tvKeyFor(profile));
    return raw ? Number(raw) : 0;
  } catch (e) {
    return 0;
  }
}

function saveTvMinutes(profile, minutes) {
  try {
    localStorage.setItem(tvKeyFor(profile), String(minutes));
  } catch (e) {}
}

function loadGlyphStats(profile) {
  try {
    const raw = localStorage.getItem(statsKeyFor(profile));
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveGlyphStats(profile, s) {
  try {
    localStorage.setItem(statsKeyFor(profile), JSON.stringify(s));
  } catch (e) {}
}

// Math mode stats (per multiplication fact)
const MATH_STATS_BASE_KEY = `${BASE_STATS_KEY}_math_v1`;
function mathStatsKeyFor(profile) {
  return `${MATH_STATS_BASE_KEY}::${profile}`;
}
function loadMathStats(profile) {
  try {
    const raw = localStorage.getItem(mathStatsKeyFor(profile));
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}
function saveMathStats(profile, s) {
  try {
    localStorage.setItem(mathStatsKeyFor(profile), JSON.stringify(s));
  } catch (e) {}
}

// English reading stats (per word)
const ENG_STATS_BASE_KEY = `${BASE_STATS_KEY}_eng_v1`;
function engStatsKeyFor(profile) {
  return `${ENG_STATS_BASE_KEY}::${profile}`;
}
function loadEngStats(profile) {
  try {
    const raw = localStorage.getItem(engStatsKeyFor(profile));
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}
function saveEngStats(profile, s) {
  try {
    localStorage.setItem(engStatsKeyFor(profile), JSON.stringify(s));
  } catch (e) {}
}

export default function App() {
  const [profile, setProfile] = useState(PROFILES[0]);
  // Arrange-only app: randomize by default (no UI toggle)
  const [randomize] = useState(true);
  // App mode: 'kannada' | 'math' | 'english'
  const [mode, setMode] = useState('kannada');

  // build sanitized deck on first render
  const [deck, setDeck] = useState(() => {
    const sanitized = RAW_CARDS.map((card) => ({ ...card, wordKannada: sanitizeKannada(card.wordKannada) }));
    return randomize ? shuffleArray(sanitized) : sanitized;
  });

  const [cardIndex, setCardIndex] = useState(0);
  const card = useMemo(() => deck[cardIndex] || deck[0] || RAW_CARDS[0], [deck, cardIndex]);

  const clusters = useMemo(() => Array.from(card.wordKannada || ""), [card]);
  const colors = useMemo(() => paletteFor(clusters.length), [clusters.length]);

  const [tiles, setTiles] = useState([]);
  const [slots, setSlots] = useState([]);
  // track whether the learner has made an attempt (placed any tile) for the current card
  const [hasAttempted, setHasAttempted] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [result, setResult] = useState(null);
  const [lastCorrectWord, setLastCorrectWord] = useState(null);

  const [glyphStats, setGlyphStats] = useState(() => loadGlyphStats(PROFILES[0]));
  const [mathStats, setMathStats] = useState(() => loadMathStats(PROFILES[0]));
  const [engStats, setEngStats] = useState(() => loadEngStats(PROFILES[0]));
  const [tvMinutes, setTvMinutes] = useState(() => loadTvMinutes(PROFILES[0]));
  // track which slot indices have already been scored this round to avoid double-counting
  const [tvMinutesLock, setTvMinutesLock] = useState(() => new Set());

  // controlled "More" dropdown
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef(null);

  // parent award modal state
  const [showParent, setShowParent] = useState(false);
  const [parentPass, setParentPass] = useState("");
  const [parentMinutes, setParentMinutes] = useState("");
  const [parentError, setParentError] = useState("");

  // close "More" menu when clicking outside
  useEffect(() => {
    function onDocClick(e) {
      if (!moreRef.current) return;
      if (!moreRef.current.contains(e.target)) {
        setShowMore(false);
      }
    }
    document.addEventListener("pointerdown", onDocClick);
    return () => document.removeEventListener("pointerdown", onDocClick);
  }, []);

  // hint state: only highlight the next required glyph (index), and limit hints to 2 per word
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintIndex, setHintIndex] = useState(null); // index of the next glyph being hinted
  const [hintedIndices, setHintedIndices] = useState(() => new Set());

  useEffect(() => {
    setGlyphStats(loadGlyphStats(profile));
    setMathStats(loadMathStats(profile));
    setEngStats(loadEngStats(profile));
    setTvMinutes(loadTvMinutes(profile));
  }, [profile]);

  // no toggle: randomize is true by default — build deck once on mount
  useEffect(() => {
    const sanitized = RAW_CARDS.map((card) => ({ ...card, wordKannada: sanitizeKannada(card.wordKannada) }));
    setDeck(shuffleArray(sanitized));
    setCardIndex(0);
  }, []);

  // Unlock audio context on first interaction (required on iOS/Safari)
  useEffect(() => {
    function unlock() {
      const ctx = getAudioCtx();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    }
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  // prepare tiles & slots whenever card changes
  useEffect(() => {
    const base = clusters.map((g, i) => ({ g, idx: i, c: colors[i] }));
    let shuf = shuffleArray(base);
    let attempts = 0;
    // avoid accidentally leaving them in correct order
    while (shuf.map((t) => t.idx).join(",") === base.map((t) => t.idx).join(",") && attempts < 12) {
      shuf = shuffleArray(base);
      attempts++;
    }
    setTiles(shuf);
    setSlots(new Array(clusters.length).fill(null));
    setHasAttempted(false);
    setHintsUsed(0);
    setHintIndex(null);
    setHintedIndices(new Set());
    setTvMinutesLock(new Set());
    setHintVisible(false);
    setResult(null);
    setLastCorrectWord(null);
  }, [cardIndex, card.wordKannada]);

  // drag handlers
  function onDragStart(e, tileIndex) {
    e.dataTransfer.setData("text/plain", tileIndex.toString());
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOverSlot(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function onDropToSlot(e, slotIndex) {
    e.preventDefault();
    const tileIndexStr = e.dataTransfer.getData("text/plain");
    if (tileIndexStr === "") return;
    const tileIndex = Number(tileIndexStr);
    if (Number.isNaN(tileIndex)) return;
    const tile = tiles[tileIndex];
    if (!tile) return;
    const newTiles = tiles.filter((_, i) => i !== tileIndex);
    const existing = slots[slotIndex];
    const newSlots = [...slots];
    newSlots[slotIndex] = tile;
    setTiles(existing ? [...newTiles, existing] : newTiles);
    setSlots(newSlots);
    setResult(null);

    // award/penalize immediately for this placement (only once per slot per round)
    setTvMinutes((prev) => {
      if (tvMinutesLock.has(slotIndex)) return prev; // already scored
      const correctGlyph = clusters[slotIndex];
      const delta = tile.g === correctGlyph ? 1 : -3; // +1 for correct, -3 for incorrect
      const next = Math.max(0, prev + delta);
      saveTvMinutes(profile, next);
      setTvMinutesLock((p) => new Set([...p, slotIndex]));
      return next;
    });
  }

  // touch fallback (tap a tile to place in first empty slot)
  function placeTileToFirstEmpty(tileIdx) {
    const tile = tiles[tileIdx];
    if (!tile) return;
    const firstEmpty = slots.findIndex((s) => s === null);
    if (firstEmpty === -1) return;
    const newTiles = tiles.filter((_, i) => i !== tileIdx);
    const newSlots = [...slots];
    newSlots[firstEmpty] = tile;
    setTiles(newTiles);
    setSlots(newSlots);
    setResult(null);
    setHasAttempted(true);

    // award/penalize immediately for this placement (only once per slot per round)
    const placedIdx = firstEmpty;
    setTvMinutes((prev) => {
      if (tvMinutesLock.has(placedIdx)) return prev;
      const correctGlyph = clusters[placedIdx];
      const delta = tile.g === correctGlyph ? 1 : -3; // +1 correct, -3 incorrect
      const next = Math.max(0, prev + delta);
      saveTvMinutes(profile, next);
      setTvMinutesLock((p) => new Set([...p, placedIdx]));
      return next;
    });
  }

  function returnSlotToPool(slotIdx) {
    const tile = slots[slotIdx];
    if (!tile) return;
    const newSlots = [...slots];
    newSlots[slotIdx] = null;
    setSlots(newSlots);
    setTiles((prev) => [...prev, tile]);
    setResult(null);
    setHasAttempted(true);
  }

  function handleSubmit() {
    const assembled = slots.map((s) => (s ? s.g : "")).join("");
    const expected = clusters.join("");

    // update glyph stats for this profile
    const updated = { ...glyphStats };
    for (let i = 0; i < clusters.length; i++) {
      const key = clusters[i];
      const stat = updated[key] ? { ...updated[key] } : { attempts: 0, correct: 0 };
      stat.attempts = (stat.attempts || 0) + 1;
      const placed = slots[i] ? slots[i].g : "";
      // if this glyph was hinted, treat it as assisted: count attempt but do not count as correct
      const wasHinted = hintedIndices.has(i);
      if (!wasHinted && placed === key) stat.correct = (stat.correct || 0) + 1;
      updated[key] = stat;
    }
    setGlyphStats(updated);
    saveGlyphStats(profile, updated);

    // clear hinted indices for the next round
    setHintedIndices(new Set());
    const ok = assembled === expected;
    setResult(ok ? "correct" : "incorrect");
    setLastCorrectWord(ok ? null : expected);
  }

  function handleReset() {
    const base = clusters.map((g, i) => ({ g, idx: i, c: colors[i] }));
    setTiles(shuffleArray(base));
    setSlots(new Array(clusters.length).fill(null));
    setResult(null);
    setHintVisible(false);
    setHasAttempted(false);
    setLastCorrectWord(null);
  }

  function handleNext() {
    setCardIndex((ci) => (ci + 1) % deck.length);
  }

  function handleReshuffle() {
    // re-sanitize & reshuffle
    const sanitized = RAW_CARDS.map((card) => ({ ...card, wordKannada: sanitizeKannada(card.wordKannada) }));
    setDeck(shuffleArray(sanitized));
    setCardIndex(0);
    setHasAttempted(false);
  }

  function showHint(durationMs = 2200) {
    if (!hasAttempted) return; // gate hints until learner attempts
    if (hintsUsed >= 2) return; // max 2 hints per word

    // find the next slot index that is missing or incorrect
    const expected = clusters.join("");
    let nextIdx = null;
    for (let i = 0; i < clusters.length; i++) {
      const placed = slots[i] ? slots[i].g : "";
      if (placed !== clusters[i]) {
        nextIdx = i;
        break;
      }
    }
    if (nextIdx === null) return;

  setHintIndex(nextIdx);
  setHintsUsed((h) => h + 1);
  setHintedIndices((prev) => new Set([...prev, nextIdx]));
    setHintVisible(true);
    // hide hint after duration
    setTimeout(() => {
      setHintVisible(false);
      setHintIndex(null);
    }, durationMs);
  }

  const weakGlyphs = useMemo(() => {
    return Object.entries(glyphStats)
      .map(([g, s]) => ({ glyph: g, attempts: s.attempts || 0, correct: s.correct || 0, accuracy: s.attempts ? (s.correct || 0) / s.attempts : 1 }))
      .filter((x) => x.attempts > 0)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 12);
  }, [glyphStats]);

  function glyphColorFor(accuracy) {
    if (accuracy < 0.7) return "#fee2e2";
    if (accuracy < 0.9) return "#fff7ed";
    return "#ecfdf5";
  }

  // parent award handler
  function awardMinutesViaParent(e) {
    e.preventDefault();
    const PASSCODE = "282928";
    if (parentPass !== PASSCODE) {
      setParentError("Invalid passcode");
      return;
    }
    const m = Number(parentMinutes);
    if (!Number.isFinite(m) || m <= 0) {
      setParentError("Enter minutes > 0");
      return;
    }
    setTvMinutes((prev) => {
      const next = Math.max(0, prev + m);
      saveTvMinutes(profile, next);
      return next;
    });
    setParentError("");
    setParentPass("");
    setParentMinutes("");
    setShowParent(false);
  }

  function resetAllTvMinutesViaParent() {
    const PASSCODE = "282928";
    if (parentPass !== PASSCODE) {
      setParentError("Invalid passcode");
      return;
    }
    try {
      PROFILES.forEach((p) => saveTvMinutes(p, 0));
    } catch (e) {}
    setTvMinutes(0);
    setParentError("");
    setParentPass("");
    setParentMinutes("");
    setShowParent(false);
  }

  function quickAdjustTvMinutes(delta) {
    const PASSCODE = "282928";
    if (parentPass !== PASSCODE) {
      setParentError("Invalid passcode");
      return;
    }
    setTvMinutes((prev) => {
      const next = Math.max(0, prev + delta);
      saveTvMinutes(profile, next);
      return next;
    });
    setParentError("");
  }

  // Math mode state and helpers
  function allMathProblems() {
    const out = [];
    // Multiplication facts 3..9 × 2..10 (avoid trivial ×1)
    for (let a = 3; a <= 9; a++) {
      for (let b = 2; b <= 10; b++) out.push({ a, b, op: '×', cat: 'mul' });
    }
    // Replace trivial ×1 with larger patterns
    out.push({ a: 100, b: 1, op: '×', cat: 'mul' });
    out.push({ a: 10000, b: 1, op: '×', cat: 'mul' });
    // Tens by digit emphasis (e.g., 20×2, 30×3, generalize tens × 2..9)
    for (let t = 10; t <= 90; t += 10) {
      for (let d = 2; d <= 9; d++) out.push({ a: t, b: d, op: '×', cat: 'tens' });
    }
    // Hundreds by digit (e.g., 100×2..9, 200×2..9, ..., 900×2..9)
    for (let h = 100; h <= 900; h += 100) {
      for (let d = 2; d <= 9; d++) out.push({ a: h, b: d, op: '×', cat: 'hundreds' });
    }
    // Multiplication by zero focus: 10..99 × 0
    for (let a = 10; a <= 99; a++) out.push({ a, b: 0, op: '×', cat: 'mul0' });
    // Addition: 10..99 + 1..20
    for (let a = 10; a <= 99; a++) {
      for (let b = 1; b <= 20; b++) out.push({ a, b, op: '+', cat: 'add' });
    }
    // Subtraction: 20..99 − 1..20 (non-negative)
    for (let a = 20; a <= 99; a++) {
      for (let b = 1; b <= 20; b++) if (a - b >= 0) out.push({ a, b, op: '-', cat: 'sub' });
    }
    // Zero with + and - emphasis: a+0, a-0 for 10..99
    for (let a = 10; a <= 99; a++) {
      out.push({ a, b: 0, op: '+', cat: 'zero' });
      out.push({ a, b: 0, op: '-', cat: 'zero' });
    }
    // Place/Face value problems for 3-digit numbers
    for (let n = 100; n <= 999; n += 37) {
      for (let pos = 0; pos < 3; pos++) {
        out.push({ op: 'place', number: n, pos, cat: 'place' });
        out.push({ op: 'face', number: n, pos, cat: 'face' });
        out.push({ op: 'placeName', number: n, pos, cat: 'placeName' });
      }
    }
    // Bonus: 1-digit × 3-digit with high stakes
    const bonusBs = [123, 234, 345, 456, 567, 678, 789, 808, 909];
    for (let a = 2; a <= 9; a++) {
      for (const b of bonusBs) {
        out.push({ a, b, op: '×', bonus: true, cat: 'bonus' });
      }
    }
    return out;
  }

  function mathKey(q) {
    if (q.op === 'place') return `PV:${q.number}:${q.pos}`;
    if (q.op === 'face') return `FV:${q.number}:${q.pos}`;
    return `${q.a}${q.op}${q.b}`;
  }
  function correctAnswer(q) {
    if (q.op === '+') return q.a + q.b;
    if (q.op === '-') return q.a - q.b;
    if (q.op === '×') return q.a * q.b;
    if (q.op === 'placeName') {
      return q.pos === 0 ? 'ones' : q.pos === 1 ? 'tens' : 'hundreds';
    }
    const digits = String(q.number);
    const idx = digits.length - 1 - q.pos; // 0 -> ones, 1 -> tens, 2 -> hundreds
    const d = Number(digits[idx]);
    if (q.op === 'face') return d;
    // place value numeric
    return d * Math.pow(10, q.pos);
  }

function pickNextMath(stats, prevKey = null, opts = {}) {
    const { bonusFrequency = 0.15 } = opts;
    const facts = allMathProblems();
    const practice = [];
    const untested = [];
    const mastered = [];
    for (const f of facts) {
      const key = f.op === 'place' || f.op === 'face' || f.op === 'placeName' ? `${f.op}:${f.number}:${f.pos}` : `${f.a}${f.op}${f.b}`;
      const s = stats[key] || { attempts: 0, correct: 0 };
      const attempts = s.attempts || 0;
      const acc = attempts ? (s.correct || 0) / attempts : 0;
      if (attempts === 0) untested.push(f);
      else if (attempts >= 3 && acc >= 0.95) mastered.push(f);
      else practice.push(f);
    }
    // Prefer a blend of practice + untested so new facts still appear
    let basePool = [...practice, ...untested];
    if (!basePool.length) basePool = [...mastered];
    if (!basePool.length) basePool = [...facts];
    // Avoid repeating the immediate previous problem
    if (prevKey && basePool.length > 1) basePool = basePool.filter((f) => mathKey(f) !== prevKey);

    // Merge categories into operator groups to avoid bias toward multiplication
    const groups = {
      mul: [], // basic/tens/hundreds
      add: [],
      sub: [],
      zero: [], // +0, -0, ×0
      place: [],
      face: [],
      placeName: [],
      bonus: []
    };
    for (const f of basePool) {
      if (f.bonus) groups.bonus.push(f);
      else if (f.op === '×') {
        if (f.cat === 'mul' || f.cat === 'tens' || f.cat === 'hundreds') groups.mul.push(f);
        else if (f.cat === 'mul0') groups.zero.push(f);
        else groups.mul.push(f);
      } else if (f.op === '+') {
        if (f.b === 0) groups.zero.push(f); else groups.add.push(f);
      } else if (f.op === '-') {
        if (f.b === 0) groups.zero.push(f); else groups.sub.push(f);
      } else if (f.op === 'place') groups.place.push(f);
      else if (f.op === 'face') groups.face.push(f);
      else if (f.op === 'placeName') groups.placeName.push(f);
    }

    // Weighted sampling across groups (only among non-empty groups)
    const weights = {
      mul: 0.28,
      add: 0.2,
      sub: 0.2,
      zero: 0.15,
      place: 0.07,
      face: 0.06,
      placeName: 0.04
    };

    // Bonus override
    if (groups.bonus.length && Math.random() < bonusFrequency) {
      const arr = groups.bonus;
      return arr[Math.floor(Math.random() * arr.length)];
    }

    const nonEmpty = Object.keys(groups).filter((g) => g !== 'bonus' && groups[g].length);
    // Normalize weights across available groups
    const total = nonEmpty.reduce((sum, g) => sum + (weights[g] || 0), 0) || 1;
    let r = Math.random() * total;
    let chosen = nonEmpty[0];
    for (const g of nonEmpty) {
      const w = (weights[g] || 0);
      if (r <= w) { chosen = g; break; }
      r -= w;
    }
    let pool = groups[chosen] && groups[chosen].length ? groups[chosen] : basePool;
    if (!pool.length) pool = basePool;
    let pick = pool[Math.floor(Math.random() * pool.length)] || basePool[0] || facts[0];
    if (prevKey && mathKey(pick) === prevKey) {
      const alt = basePool.filter((f) => mathKey(f) !== prevKey);
      if (alt.length) pick = alt[Math.floor(Math.random() * alt.length)];
      else {
        const anyAlt = facts.filter((f) => mathKey(f) !== prevKey);
        if (anyAlt.length) pick = anyAlt[Math.floor(Math.random() * anyAlt.length)];
      }
    }
    return pick;
  }

  const [mathQ, setMathQ] = useState(() => pickNextMath(loadMathStats(PROFILES[0]) || {}, null));
  const [bonusReward, setBonusReward] = useState(20);
  const [bonusPenalty, setBonusPenalty] = useState(20);
  const [bonusFrequency, setBonusFrequency] = useState(0.15); // 0..1
  const [answer, setAnswer] = useState("");
  const answerRef = useRef(null);
  // per-question timer state
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentTimeLimit, setCurrentTimeLimit] = useState(60);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef(null);
  const timeLimitRef = useRef(60);
  const audioCtxRef = useRef(null);

  function getAudioCtx() {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      audioCtxRef.current = new AudioCtx();
    }
    return audioCtxRef.current;
  }

  function playBeep(frequency, duration = 0.18) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.start(now);
    osc.stop(now + duration);
  }
  function nextMathQuestion() {
    const prevKey = mathKey(mathQ);
    setMathQ(pickNextMath(mathStats, prevKey, { bonusFrequency }));
    setAnswer("");
    setResult(null);
  }
  function submitMath() {
    const correctAns = correctAnswer(mathQ);
    let isCorrect = false;
    if (mathQ.op === 'placeName') {
      const trimmed = String(answer || '').trim().toLowerCase();
      if (!trimmed) return; // ignore submit when blank
      isCorrect = trimmed === String(correctAns).toLowerCase();
    } else {
      const valTrim = String(answer || '').trim();
      if (valTrim === '') return;
      const valNum = Number(valTrim);
      if (!Number.isFinite(valNum)) return;
      isCorrect = valNum === correctAns;
    }
    // update per-fact stats
    const key = mathKey(mathQ);
    const updated = { ...mathStats };
    const stat = updated[key] ? { ...updated[key] } : { attempts: 0, correct: 0 };
    stat.attempts = (stat.attempts || 0) + 1;
    if (isCorrect) stat.correct = (stat.correct || 0) + 1;
    updated[key] = stat;
    setMathStats(updated);
    saveMathStats(profile, updated);

    // scoring: normal +2/-10, bonus adjustable
    setTvMinutes((prev) => {
      const delta = mathQ.bonus ? (isCorrect ? bonusReward : -bonusPenalty) : (isCorrect ? 2 : -10);
      const next = Math.max(0, prev + delta);
      saveTvMinutes(profile, next);
      return next;
    });

    setResult(isCorrect ? 'correct' : 'incorrect');
  }

  // Timeout handlers
  function handleMathTimeout() {
    if (result) return; // already answered
    // mark incorrect without user input
    const key = mathKey(mathQ);
    const updated = { ...mathStats };
    const stat = updated[key] ? { ...updated[key] } : { attempts: 0, correct: 0 };
    stat.attempts = (stat.attempts || 0) + 1;
    updated[key] = stat;
    setMathStats(updated);
    saveMathStats(profile, updated);

    setTvMinutes((prev) => {
      const delta = mathQ.bonus ? -bonusPenalty : -10;
      const next = Math.max(0, prev + delta);
      saveTvMinutes(profile, next);
      return next;
    });
    setTimedOut(true);
    setResult('incorrect');
    setAnswer("");
  }

  function handleEnglishTimeout() {
    if (result) return;
    setTimedOut(true);
    // Record as incorrect
    markEnglish(false);
    setAnswer("");
  }
  // If user switches to Math mode mid-session, seed a sensible question once
  useEffect(() => {
    if (mode === 'math') {
      setMathQ((q) => pickNextMath(mathStats, mathKey(q), { bonusFrequency }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, bonusFrequency]);
  const weakFacts = useMemo(() => {
    return Object.entries(mathStats)
      .map(([k, s]) => ({ fact: k, attempts: s.attempts || 0, correct: s.correct || 0, accuracy: s.attempts ? (s.correct || 0) / s.attempts : 1 }))
      .filter((x) => x.attempts > 0)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 12);
  }, [mathStats]);

  // Math form handler: Enter submits; if already answered, Enter goes to Next
  function handleMathFormSubmit(e) {
    e.preventDefault();
    if (mode !== 'math') return;
    if (result) {
      if (!String(answer || '').trim()) return;
      nextMathQuestion();
    } else {
      submitMath();
    }
  }


  // Global Enter handler for Kannada mode: Enter submits; if already correct, Enter goes to Next
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Enter') return;
      // Ignore when typing in inputs or modals
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target && e.target.isContentEditable)) return;
      if (showParent) return;
      if (mode !== 'kannada') return;
      e.preventDefault();
      if (!result) handleSubmit();
      else if (result === 'correct') handleNext();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mode, result, showParent, slots, tiles]);

  // Focus math answer input when math question changes or mode switches
  useEffect(() => {
    if (mode === 'math' && answerRef.current) {
      try {
        answerRef.current.focus();
        answerRef.current.select();
      } catch {}
    }
  }, [mode, mathQ]);

  // English reading mode state
  const [engDeck, setEngDeck] = useState(() => shuffleArray(ENGLISH_WORDS).slice(0, 200));
  const [engIndex, setEngIndex] = useState(0);
  const engWord = useMemo(() => engDeck[engIndex] || engDeck[0] || ENGLISH_WORDS[0], [engDeck, engIndex]);
  function markEnglish(correct) {
    const key = engWord;
    const updated = { ...engStats };
    const stat = updated[key] ? { ...updated[key] } : { attempts: 0, correct: 0 };
    stat.attempts = (stat.attempts || 0) + 1;
    if (correct) stat.correct = (stat.correct || 0) + 1;
    updated[key] = stat;
    setEngStats(updated);
    saveEngStats(profile, updated);
    // scoring: reward reading, small penalty otherwise
    setTvMinutes((prev) => {
      const delta = correct ? 2 : -1;
      const next = Math.max(0, prev + delta);
      saveTvMinutes(profile, next);
      return next;
    });
    setResult(correct ? 'correct' : 'incorrect');
  }
  function nextEnglish() {
    setEngIndex((i) => (i + 1) % engDeck.length);
    setResult(null);
  }
  function reshuffleEnglish() {
    setEngDeck(shuffleArray(ENGLISH_WORDS).slice(0, 200));
    setEngIndex(0);
    setResult(null);
  }
  const weakEnglish = useMemo(() => {
    return Object.entries(engStats)
      .map(([w, s]) => ({ word: w, attempts: s.attempts || 0, correct: s.correct || 0, accuracy: s.attempts ? (s.correct || 0) / s.attempts : 1 }))
      .filter((x) => x.attempts > 0)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 12);
  }, [engStats]);

  // Start/Reset 15s timer for Math and English
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimedOut(false);
    let limit = 60;
    if (mode === 'math') {
      limit = getMathTimeLimit(mathQ);
    } else if (mode === 'english') {
      limit = 60;
    }
    timeLimitRef.current = limit;
    setCurrentTimeLimit(limit);
    if (result) return;
    if (mode !== 'math' && mode !== 'english') return;
    setTimeLeft(limit);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          if (mode === 'math') handleMathTimeout();
          else if (mode === 'english') handleEnglishTimeout();
          return 0;
        }
        const next = t - 1;
        if (next > 0 && next <= Math.min(5, timeLimitRef.current)) playBeep(next <= 2 ? 1400 : 950, 0.12);
        return next;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [mode, mathQ, engIndex]);

  // Stop timer once result is shown
  useEffect(() => {
    if (result && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [result]);

  // Audio cues for outcomes
  useEffect(() => {
    if (!result) return;
    if (result === 'correct') playBeep(1568, 0.25);
    else playBeep(330, 0.3);
  }, [result]);

  return (
    <>
    <style>{`
      @keyframes pulseBadge {0%{transform:scale(1); box-shadow:0 0 0 0 rgba(245,158,11,.45);} 70%{transform:scale(1.03); box-shadow:0 0 0 12px rgba(245,158,11,0);} 100%{transform:scale(1); box-shadow:0 0 0 0 rgba(245,158,11,0);}}
      .bonus-badge { animation: pulseBadge 1.2s infinite; }
    `}</style>
    <div style={{ minHeight: "100vh", padding: 20, fontFamily: "Inter, system-ui, sans-serif", background: "linear-gradient(180deg,#f6f8ff 0%, #fff 60%)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div>
              <label style={{ marginRight: 8, color: "#6b7280", fontWeight: 700 }}>Learner:</label>
              <select value={profile} onChange={(e) => {
                  const next = e.target.value;
                  // persist current profile minutes
                  saveTvMinutes(profile, tvMinutes);
                  setProfile(next);
                  // load next profile minutes (effect handles setTvMinutes)
                }} style={{ padding: "6px 10px", borderRadius: 8 }}>
                {PROFILES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ margin: '0 8px 0 12px', color: '#6b7280', fontWeight: 700 }}>Mode:</label>
              <select value={mode} onChange={(e) => { setMode(e.target.value); setResult(null); }} style={{ padding: "6px 10px", borderRadius: 8 }}>
                <option value="kannada">Kannada</option>
                <option value="math">Math</option>
                <option value="english">English</option>
              </select>
            </div>
            {/* Arrange-only: mode and randomize are fixed (random by default) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ background: "#f3f4f6", padding: "6px 10px", borderRadius: 8, fontWeight: 700 }} title="Allowed TV minutes based on practice">TV: {tvMinutes} min</div>
              <button onClick={() => { setShowParent(true); setParentError(""); }} title="Parent controls" style={{ padding: '6px 10px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Parent</button>
            </div>
          </div>
          {mode === 'kannada' ? (
            <div style={{ color: "#6b7280" }}>Card {cardIndex + 1} / {deck.length}</div>
          ) : mode === 'math' ? (
            <div style={{ color: "#6b7280" }}>Math practice</div>
          ) : (
            <div style={{ color: "#6b7280" }}>Word {engIndex + 1} / {engDeck.length}</div>
          )}
        </div>

        <div style={{ background: "white", padding: 20, borderRadius: 12, boxShadow: "0 12px 40px rgba(12,20,40,0.06)" }}>
          {mode === 'kannada' ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 34, fontWeight: 900 }}>{card.transliterationHi || card.transliteration}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, color: "#6b7280" }}>Arrange the word for</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{card.transliterationHi ? "" : card.transliteration}</div>
            </div>
          </div>
          ) : mode === 'math' ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 32, color: '#4b5563', display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700 }}>
                Solve the problem
                {mathQ.bonus && (
                  <span className="bonus-badge" style={{ padding: '4px 8px', background: '#fef3c7', color: '#92400e', borderRadius: 9999, fontSize: 12, fontWeight: 800 }}>Bonus: +20 / −20</span>
                )}
              </div>
              {mathQ.op === 'place' || mathQ.op === 'face' ? (
                <div style={{ fontSize: 42, fontWeight: 900 }}>
                  {mathQ.op === 'place' ? 'Place value of digit' : 'Face value of digit'}{' '}
                  <span style={{ padding: '2px 8px', background: '#eef2ff', borderRadius: 8 }}>{String(mathQ.number).charAt(String(mathQ.number).length - 1 - mathQ.pos)}</span>
                  {' '}in {mathQ.number}
                </div>
              ) : mathQ.op === 'placeName' ? (
                <div style={{ fontSize: 42, fontWeight: 900 }}>
                  Which place is{' '}
                  <span style={{ padding: '2px 8px', background: '#eef2ff', borderRadius: 8 }}>{String(mathQ.number).charAt(String(mathQ.number).length - 1 - mathQ.pos)}</span>
                  {' '}in {mathQ.number}?
                </div>
              ) : (
                <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: 1 }}>{mathQ.a} {mathQ.op} {mathQ.b}</div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: '#6b7280' }}>Enter the answer</div>
              <div style={{ marginTop: 8, fontWeight: 800, fontSize: 16, display: 'inline-block', padding: '6px 12px', borderRadius: 999, background: timeLeft <= 3 ? '#fee2e2' : (timeLeft <= 7 ? '#fef3c7' : '#eef2ff'), color: timeLeft <= 3 ? '#991b1b' : '#374151' }}>⏱ {timeLeft}s</div>
            </div>
          </div>
          ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 32, color: '#4b5563', fontWeight: 700 }}>Read the word</div>
              <div style={{ fontSize: 60, fontWeight: 900, letterSpacing: 1 }}>{engWord}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: '#6b7280' }}>Tap if read or not</div>
              <div style={{ marginTop: 8, fontWeight: 800, fontSize: 16, display: 'inline-block', padding: '6px 12px', borderRadius: 999, background: timeLeft <= 3 ? '#fee2e2' : (timeLeft <= 7 ? '#fef3c7' : '#eef2ff'), color: timeLeft <= 3 ? '#991b1b' : '#374151' }}>⏱ {timeLeft}s</div>
            </div>
          </div>
          )}

          <div>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 18, alignItems: 'start' }}>
              <div style={{ flex: 1 }}>

              {mode === 'kannada' ? (
              <>
              {/* Tile pool */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {tiles.map((tile, i) => (
                    <div key={`${tile.g}-${i}`} style={{ position: "relative" }}>
                      {hintVisible && hintIndex !== null && hintIndex === tile.idx && (
                        <div style={{ position: "absolute", top: -10, right: -10, width: 28, height: 28, borderRadius: 14, background: "rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{tile.idx + 1}</div>
                      )}
                      <div draggable onDragStart={(e) => onDragStart(e, i)} onClick={() => placeTileToFirstEmpty(i)} style={{ cursor: "grab", userSelect: "none", background: tile.c, padding: "16px 18px", borderRadius: 12, fontSize: 36, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 76, minHeight: 72, boxShadow: hintVisible && hintIndex === tile.idx ? "0 12px 36px rgba(16,185,129,0.18)" : "0 8px 28px rgba(0,0,0,0.06)", outline: hintVisible && hintIndex === tile.idx ? "3px solid rgba(16,185,129,0.12)" : "none" }} title="Drag to a slot or tap to place">{tile.g}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slots */}
              <div style={{ marginBottom: 18, padding: 12, background: "#f7fafc", borderRadius: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "nowrap", minHeight: 92 }}>
                  {slots.map((slot, i) => (
                    <div key={i} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                      {hintVisible && hintIndex === i && (<div style={{ position: "absolute", top: -10, right: -10, width: 28, height: 28, borderRadius: 14, background: "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{i + 1}</div>)}
                      <div onDragOver={onDragOverSlot} onDrop={(e) => onDropToSlot(e, i)} onClick={() => returnSlotToPool(i)} style={{ width: 86, height: 86, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: slot ? slot.c : "white", boxShadow: hintVisible && hintIndex === i ? "0 12px 36px rgba(16,185,129,0.12)" : slot ? "0 10px 30px rgba(0,0,0,0.06)" : "inset 0 0 0 2px rgba(0,0,0,0.04)", fontSize: 42, cursor: slot ? "pointer" : "copy", outline: hintVisible && hintIndex === i ? "3px solid rgba(16,185,129,0.08)" : "none" }} title={slot ? "Click to return to pool" : "Drop tile here"}>{slot ? slot.g : ""}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button onClick={handleSubmit} style={{ padding: "12px 22px", background: "#10b981", color: "white", border: "none", borderRadius: 14, cursor: "pointer", fontWeight: 800, fontSize: 18 }}>Submit</button>
                <button onClick={() => showHint()} disabled={!hasAttempted || hintsUsed >= 2} title={!hasAttempted ? "Place at least one tile first to enable hint" : hintsUsed >= 2 ? "No hints remaining for this word" : `Hints used: ${hintsUsed}/2`} style={{ padding: "12px 20px", background: "#fef3c7", border: "none", borderRadius: 14, cursor: !hasAttempted || hintsUsed >= 2 ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 18, opacity: !hasAttempted ? 0.6 : 1 }}>{`Hint (${2 - hintsUsed} left)`}</button>

                <div style={{ position: "relative" }} ref={moreRef}>
                  <button onClick={() => setShowMore((s) => !s)} aria-expanded={showMore} style={{ listStyle: "none", padding: "12px 20px", borderRadius: 14, background: "#eef2ff", cursor: "pointer", fontWeight: 700, fontSize: 18 }}>More ▾</button>
                  {showMore && (
                    <div style={{ position: "absolute", right: 0, marginTop: 8, padding: 12, background: "white", borderRadius: 10, boxShadow: "0 10px 40px rgba(12,20,40,0.08)", minWidth: 160 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <button onClick={() => { handleReset(); setShowMore(false); }} style={{ padding: "10px 12px", borderRadius: 8, background: "#fff", border: "1px solid #e6e6e6", cursor: "pointer", textAlign: "left" }}>Reset tiles</button>
                        <button onClick={() => { handleReshuffle(); setShowMore(false); }} style={{ padding: "10px 12px", borderRadius: 8, background: "#fff", border: "1px solid #e6e6e6", cursor: "pointer", textAlign: "left" }}>Reshuffle deck</button>
                      </div>
                    </div>
                  )}
                </div>

                {result === "correct" && <button onClick={handleNext} style={{ padding: "12px 22px", background: "#bfdbfe", borderRadius: 14, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 18 }}>Next</button>}
                {result === "correct" && <div style={{ marginLeft: 6, color: "#166534", fontWeight: 800 }}>✅ Correct</div>}
                {result === "incorrect" && (
                  <div style={{ marginLeft: 6, color: "#b91c1c", fontWeight: 800 }}>
                    ❌ Incorrect — answer: {lastCorrectWord || clusters.join("")}
                  </div>
                )}
              </div>
              </>
              ) : mode === 'math' ? (
                <>
                <form onSubmit={handleMathFormSubmit} style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                  {(mathQ.op === '+' || mathQ.op === '-' || mathQ.op === '×' || mathQ.op === 'place' || mathQ.op === 'face') && (
                    <input ref={answerRef} inputMode="numeric" pattern="[0-9]*" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Answer" style={{ padding: '16px 20px', border: '2px solid #d1d5db', borderRadius: 14, fontSize: 28, width: 220, fontWeight: 600 }} />
                  )}
                  {mathQ.op === 'placeName' && (
                    <select ref={answerRef} value={answer} onChange={(e) => setAnswer(e.target.value)} style={{ padding: '16px 18px', border: '2px solid #d1d5db', borderRadius: 14, fontSize: 22, fontWeight: 600 }}>
                      <option value="">Select place</option>
                      <option value="ones">ones</option>
                      <option value="tens">tens</option>
                      <option value="hundreds">hundreds</option>
                    </select>
                  )}
                  <button type="submit" style={{ padding: "14px 28px", background: "#10b981", color: "white", border: "none", borderRadius: 14, cursor: "pointer", fontWeight: 800, fontSize: 20, boxShadow: '0 8px 18px rgba(16,185,129,0.25)' }}>Submit</button>
                  {result && (
                    <>
                    {result === 'correct' && <div style={{ color: '#166534', fontWeight: 800, fontSize: 20 }}>✅ Correct</div>}
                    {result === 'incorrect' && <div style={{ color: '#b91c1c', fontWeight: 800, fontSize: 20 }}>{timedOut ? '⏰ Time up — ' : '❌ Incorrect — '} {String(correctAnswer(mathQ))}</div>}
                    </>
                  )}
                  {result && <button type="button" onClick={nextMathQuestion} disabled={!String(answer || '').trim()} style={{ padding: '14px 26px', background: '#bfdbfe', borderRadius: 14, border: 'none', cursor: String(answer || '').trim() ? 'pointer' : 'not-allowed', fontWeight: 800, fontSize: 20, opacity: String(answer || '').trim() ? 1 : 0.6 }}>Next</button>}
                </form>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => markEnglish(true)} style={{ padding: '14px 24px', background: '#dcfce7', color: '#166534', border: '2px solid #bbf7d0', borderRadius: 14, cursor: 'pointer', fontWeight: 800, fontSize: 20 }}>She read it</button>
                    <button type="button" onClick={() => markEnglish(false)} style={{ padding: '14px 24px', background: '#fee2e2', color: '#7f1d1d', border: '2px solid #fecaca', borderRadius: 14, cursor: 'pointer', fontWeight: 800, fontSize: 20 }}>Couldn't read</button>
                    {result && (
                      <>
                      {result === 'correct' && <div style={{ color: '#166534', fontWeight: 800, fontSize: 20 }}>✅ Great!</div>}
                      {result === 'incorrect' && <div style={{ color: '#b91c1c', fontWeight: 800, fontSize: 20 }}>{timedOut ? '⏰ Time up — try again' : '❌ Keep practicing'}</div>}
                      </>
                    )}
                    {result && <button type="button" onClick={nextEnglish} style={{ padding: '14px 26px', background: '#bfdbfe', borderRadius: 14, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 20 }}>Next</button>}
                  </div>
                </>
              )}
              </div>

              {/* Right panel */}
              <aside style={{ width: 320, position: 'sticky', top: 12 }}>
              <div style={{ padding: 14, borderRadius: 12, background: "white", boxShadow: "0 6px 24px rgba(12,20,40,0.04)" }}>
                {mode === 'kannada' ? (
                  <>
                  <h3 style={{ marginTop: 0 }}>Weak glyphs</h3>
                  <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>Lowest accuracy glyphs for {profile}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {weakGlyphs.length === 0 && <div style={{ gridColumn: "1 / -1", color: "#6b7280" }}>No stats yet — play a few rounds to collect data.</div>}
                    {weakGlyphs.map((w) => (
                      <div key={w.glyph} style={{ padding: 8, borderRadius: 8, background: glyphColorFor(w.accuracy), textAlign: "center" }} title={`${w.correct}/${w.attempts}`}>
                        <div style={{ fontSize: 28 }}>{w.glyph}</div>
                        <div style={{ fontSize: 12, fontWeight: 800 }}>{Math.round((w.accuracy || 0) * 100)}%</div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>{w.correct}/{w.attempts}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <button onClick={() => { localStorage.removeItem(statsKeyFor(profile)); setGlyphStats({}); }} style={{ padding: "8px 12px", borderRadius: 8, background: "#fee2e2", border: "none", cursor: "pointer" }}>Reset {profile}'s glyph stats</button>
                  </div>

                  <div style={{ marginTop: 16, fontSize: 13, color: "#6b7280" }}>
                    <div style={{ marginBottom: 8, fontWeight: 700 }}>Deck controls</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { setDeck((d) => shuffleArray(d)); setCardIndex(0); }} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e6e6e6", background: "white", cursor: "pointer" }}>Shuffle order</button>
                      <button onClick={() => { setCardIndex(0); }} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e6e6e6", background: "white", cursor: "pointer" }}>Go to first</button>
                    </div>
                  </div>
                  </>
                ) : mode === 'math' ? (
                  <>
                  <h3 style={{ marginTop: 0 }}>Weak math facts</h3>
                  <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>Lowest accuracy for {profile}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {weakFacts.length === 0 && <div style={{ gridColumn: "1 / -1", color: "#6b7280" }}>No stats yet — answer a few questions.</div>}
                    {weakFacts.map((w) => (
                      <div key={w.fact} style={{ padding: 8, borderRadius: 8, background: glyphColorFor(w.accuracy), textAlign: "center" }} title={`${w.correct}/${w.attempts}`}>
                        <div style={{ fontSize: 20 }}>{w.fact}</div>
                        <div style={{ fontSize: 12, fontWeight: 800 }}>{Math.round((w.accuracy || 0) * 100)}%</div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>{w.correct}/{w.attempts}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button onClick={() => { localStorage.removeItem(mathStatsKeyFor(profile)); setMathStats({}); }} style={{ padding: "8px 12px", borderRadius: 8, background: "#fee2e2", border: "none", cursor: "pointer" }}>Reset {profile}'s math stats</button>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Bonus settings</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'center' }}>
                      <label style={{ fontSize: 12 }}>Frequency</label>
                      <input type="number" min={0} max={1} step={0.05} value={bonusFrequency} onChange={(e) => setBonusFrequency(Math.max(0, Math.min(1, Number(e.target.value))))} style={{ padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 8 }} />
                      <label style={{ fontSize: 12 }}>Reward</label>
                      <input type="number" min={1} step={1} value={bonusReward} onChange={(e) => setBonusReward(Math.max(1, Number(e.target.value)))} style={{ padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 8 }} />
                      <label style={{ fontSize: 12 }}>Penalty</label>
                      <input type="number" min={1} step={1} value={bonusPenalty} onChange={(e) => setBonusPenalty(Math.max(1, Number(e.target.value)))} style={{ padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 8 }} />
                    </div>
                  </div>
                  </>
                ) : (
                  <>
                  <h3 style={{ marginTop: 0 }}>Weak words</h3>
                  <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>Lowest accuracy for {profile}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {weakEnglish.length === 0 && <div style={{ gridColumn: "1 / -1", color: "#6b7280" }}>No stats yet — practice a few words.</div>}
                    {weakEnglish.map((w) => (
                      <div key={w.word} style={{ padding: 8, borderRadius: 8, background: glyphColorFor(w.accuracy), textAlign: "center" }} title={`${w.correct}/${w.attempts}`}>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>{w.word}</div>
                        <div style={{ fontSize: 12, fontWeight: 800 }}>{Math.round((w.accuracy || 0) * 100)}%</div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>{w.correct}/{w.attempts}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => { localStorage.removeItem(engStatsKeyFor(profile)); setEngStats({}); }} style={{ padding: "8px 12px", borderRadius: 8, background: "#fee2e2", border: "none", cursor: "pointer" }}>Reset {profile}'s English stats</button>
                    <button onClick={() => { setEngDeck((d) => shuffleArray(d)); setEngIndex(0); }} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e6e6e6", background: "white", cursor: "pointer" }}>Shuffle order</button>
                    <button onClick={() => { setEngIndex(0); }} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e6e6e6", background: "white", cursor: "pointer" }}>Go to first</button>
                    <button onClick={reshuffleEnglish} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e6e6e6", background: "white", cursor: "pointer" }}>New 200 sample</button>
                  </div>
                  </>
                )}
              </div>
              </aside>

            </div>
            </div>
        </div>
      </div>
    </div>

    {/* Parent award modal */}
    {showParent && (
      <div onClick={() => setShowParent(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: 360, background: 'white', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Parent Controls</div>
            <button onClick={() => setShowParent(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
          </div>
          <form onSubmit={awardMinutesViaParent}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ fontSize: 13, color: '#6b7280' }}>Passcode</label>
              <input type="password" inputMode="numeric" pattern="[0-9]*" value={parentPass} onChange={(e) => setParentPass(e.target.value)} placeholder="6-digit passcode" style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 16 }} />

              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Quick adjust (Good/Bad behavior)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                  <button type="button" onClick={() => quickAdjustTvMinutes(-10)} style={{ padding: '10px 8px', background: '#fee2e2', color: '#7f1d1d', border: '1px solid #fecaca', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>−10</button>
                  <button type="button" onClick={() => quickAdjustTvMinutes(-5)} style={{ padding: '10px 8px', background: '#fee2e2', color: '#7f1d1d', border: '1px solid #fecaca', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>−5</button>
                  <button type="button" onClick={() => quickAdjustTvMinutes(-1)} style={{ padding: '10px 8px', background: '#fee2e2', color: '#7f1d1d', border: '1px solid #fecaca', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>−1</button>
                  <button type="button" onClick={() => quickAdjustTvMinutes(1)} style={{ padding: '10px 8px', background: '#dcfce7', color: '#14532d', border: '1px solid #bbf7d0', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>+1</button>
                  <button type="button" onClick={() => quickAdjustTvMinutes(5)} style={{ padding: '10px 8px', background: '#dcfce7', color: '#14532d', border: '1px solid #bbf7d0', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>+5</button>
                  <button type="button" onClick={() => quickAdjustTvMinutes(10)} style={{ padding: '10px 8px', background: '#dcfce7', color: '#14532d', border: '1px solid #bbf7d0', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>+10</button>
                </div>
              </div>

              <label style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>Custom award (minutes)</label>
              <input type="number" min={1} step={1} value={parentMinutes} onChange={(e) => setParentMinutes(e.target.value)} placeholder="e.g. 10" style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 16 }} />
              {parentError && <div style={{ color: '#b91c1c', fontWeight: 700 }}>{parentError}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <button type="submit" style={{ padding: '10px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>Award</button>
                <button type="button" onClick={() => setShowParent(false)} style={{ padding: '10px 12px', background: '#e5e7eb', color: '#111827', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>Close</button>
                <button type="button" onClick={resetAllTvMinutesViaParent} title="Requires passcode" style={{ padding: '10px 12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>Reset all TV minutes</button>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Changes apply to <b>{profile}</b>.</div>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}

function getMathTimeLimit(q) {
  if (!q) return 60;
  if (q.bonus) return 120;
  if (q.cat === 'zero' || q.cat === 'mul0' || q.cat === 'place' || q.cat === 'face' || q.cat === 'placeName') return 10;
  return 60;
}
