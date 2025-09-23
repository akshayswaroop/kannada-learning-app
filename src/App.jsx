// Kannada Flashcards — first good version
// - Gate hints until an attempt
// - Single-step next-character hints (max 2 per word)
// - Mark hinted glyphs as assisted in stats
// - Live TV-minute incentive awarded/penalized on tile placement
import React, { useEffect, useMemo, useRef, useState } from "react";
import { RAW_CARDS, PROFILES, BASE_STATS_KEY, TV_BASE_KEY, ENGLISH_WORDS, KAN_TO_HI as DATA_KAN_TO_HI, KAN_MATRAS, HI_TO_KAN, HI_MATRAS } from "./data";

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

const KAN_TO_HI = { ...DATA_KAN_TO_HI, ...KAN_MATRAS };
const HI_TO_KAN_ALL = { ...HI_TO_KAN, ...HI_MATRAS };

// Regex helpers for script detection (allow zero-width joiner/non-joiner)
const KANNADA_RE = /[ಀ-೿]/u;
const DEVANAGARI_RE = /[ऀ-ॿ]/u;
const ALLOWED_JOINERS = new Set(['\u200d', '\u200c']);

function sanitizeByScript(s, tester) {
  if (!s) return "";
  return Array.from(s).filter((ch) => tester.test(ch) || ch === " " || ALLOWED_JOINERS.has(ch)).join("");
}
function sanitizeKannada(s) {
  return sanitizeByScript(s, KANNADA_RE);
}
function sanitizeHindi(s) {
  return sanitizeByScript(s, DEVANAGARI_RE);
}

function cardSupportsDirection(card, direction) {
  if (!card) return false;
  if (direction === 'hi-to-kn') {
    return Boolean((card.wordKannada || '').length && ((card.transliterationHi && card.transliterationHi.length) || (card.transliteration && card.transliteration.length)));
  }
  if (direction === 'kn-to-hi') {
    return Boolean((card.wordHindi || '').length && (card.wordKannada || '').length);
  }
  return false;
}

function findNextSupportedIndex(deck, startIndex, direction) {
  if (!deck.length) return 0;
  const len = deck.length;
  for (let step = 1; step <= len; step++) {
    const idx = (startIndex + step) % len;
    if (cardSupportsDirection(deck[idx], direction)) return idx;
  }
  return startIndex;
}

function paletteFor(n) {
  const palette = ["#FFB4C6", "#FFD6A5", "#FDFFB6", "#CAFFBF", "#9BF6FF", "#BDB2FF", "#C8A2FF", "#FFC6FF"];
  return Array.from({ length: n }).map((_, i) => palette[i % palette.length]);
}

// Kannada independent vowels and vowel signs (treated as vowel category for cues)
const INDEPENDENT_VOWELS_KN = new Set(['ಅ','ಆ','ಇ','ಈ','ಉ','ಊ','ಋ','ೠ','ಎ','ಏ','ಐ','ಒ','ಓ','ಔ','ಅಂ','ಅಃ','ಁ']);
const VOWEL_SIGNS_KN = new Set(['ಾ','ಿ','ೀ','ು','ೂ','ೃ','ೄ','ೆ','ೇ','ೈ','ೊ','ೋ','ೌ','ಂ','ಃ','ಁ']);
const INDEPENDENT_VOWELS_HI = new Set(
  Object.entries(HI_TO_KAN).
    filter(([, kn]) => INDEPENDENT_VOWELS_KN.has(kn)).
    map(([hi]) => hi)
);
const VOWEL_SIGNS_HI = new Set(Object.keys(HI_MATRAS));

function scriptForGlyph(ch) {
  if (KANNADA_RE.test(ch)) return 'kn';
  if (DEVANAGARI_RE.test(ch)) return 'hi';
  return 'other';
}

function isVowelGlyph(ch, scriptHint = null) {
  const script = scriptHint || scriptForGlyph(ch);
  if (script === 'kn') return INDEPENDENT_VOWELS_KN.has(ch) || VOWEL_SIGNS_KN.has(ch);
  if (script === 'hi') return INDEPENDENT_VOWELS_HI.has(ch) || VOWEL_SIGNS_HI.has(ch);
  return false;
}

// Gentle hue cues: consonants vs vowels; tuned for light/dark
const TILE_HUES = {
  light: {
    cons: ['#D1FAE5', '#BBF7D0', '#A7F3D0', '#86EFAC'],
    vowel: ['#E0E7FF', '#C7D2FE', '#E9D5FF', '#E0F2FE'],
  },
  dark: {
    cons: ['rgba(16,185,129,0.35)', 'rgba(34,197,94,0.35)', 'rgba(74,222,128,0.35)'],
    vowel: ['rgba(99,102,241,0.35)', 'rgba(56,189,248,0.35)', 'rgba(168,85,247,0.35)'],
  }
};

// Romanization for micro-feedback (subset; extend as needed)
const KAN_TO_ROMAN = {
  'ಅ':'a','ಆ':'aa','ಇ':'i','ಈ':'ii','ಉ':'u','ಊ':'uu','ಎ':'e','ಏ':'ee','ಐ':'ai','ಒ':'o','ಓ':'oo','ಔ':'au','ಅಂ':'am','ಅಃ':'ah',
  'ಋ':'ru','ೠ':'ruu','ಌ':'lru','ೡ':'lruu',
  'ಕ':'ka','ಖ':'kha','ಗ':'ga','ಘ':'gha','ಙ':'nga',
  'ಚ':'cha','ಛ':'chha','ಜ':'ja','ಝ':'jha','ಞ':'nya',
  'ಟ':'ta','ಠ':'tha','ಡ':'da','ಢ':'dha','ಣ':'na',
  'ತ':'ta','ಥ':'tha','ದ':'da','ಧ':'dha','ನ':'na',
  'ಪ':'pa','ಫ':'pha','ಬ':'ba','ಭ':'bha','ಮ':'ma',
  'ಯ':'ya','ರ':'ra','ಲ':'la','ವ':'va','ಶ':'sha','ಷ':'ssha','ಸ':'sa','ಹ':'ha','ಳ':'lla','ಱ':'rra'
  ,
  // vowel signs (matras)
  'ಾ':'aa','ಿ':'i','ೀ':'ii','ು':'u','ೂ':'uu','ೃ':'ru','ೄ':'ruu','ೆ':'e','ೇ':'ee','ೈ':'ai','ೊ':'o','ೋ':'oo','ೌ':'au','ಂ':'am','ಃ':'ah','ಁ':'anunasika',
  // halant / virama
  '್':'halant'
};
function romanFor(g) { return KAN_TO_ROMAN[g] || ''; }

function romanForAny(g) {
  const script = scriptForGlyph(g);
  if (script === 'kn') return romanFor(g);
  if (script === 'hi') {
    const kn = HI_TO_KAN_ALL[g];
    return kn ? romanFor(kn) : '';
  }
  return '';
}

function counterpartForGlyph(g) {
  const script = scriptForGlyph(g);
  if (script === 'kn') return KAN_TO_HI[g] || '';
  if (script === 'hi') return HI_TO_KAN_ALL[g] || '';
  return '';
}

function formatGlyphName(g) {
  const script = scriptForGlyph(g);
  const roman = romanForAny(g);
  const counterpart = counterpartForGlyph(g);
  if (script === 'kn') {
    if (VOWEL_SIGNS_KN.has(g)) {
      return `vowel sign ${g}${roman || counterpart ? ` (${roman}${roman && counterpart ? ' / ' : ''}${counterpart || ''})` : ''}`;
    }
    if (g === '್') return `halant (${counterpart || '्'})`;
    if (g === 'ಂ') return `anusvara (${counterpart || 'ं'})`;
    if (g === 'ಃ') return `visarga (${counterpart || 'ः'})`;
    if (g === 'ಁ') return `chandrabindu (${counterpart || 'ँ'})`;
    if (roman && counterpart) return `${g} (${roman} / ${counterpart})`;
    if (roman) return `${g} (${roman})`;
    if (counterpart) return `${g} (${counterpart})`;
    return g;
  }
  if (script === 'hi') {
    if (VOWEL_SIGNS_HI.has(g)) {
      return `matra ${g}${roman || counterpart ? ` (${roman}${roman && counterpart ? ' / ' : ''}${counterpart || ''})` : ''}`;
    }
    if (g === '्') return `halant (${counterpart || '್'})`;
    if (g === 'ं') return `anusvara (${counterpart || 'ಂ'})`;
    if (g === 'ः') return `visarga (${counterpart || 'ಃ'})`;
    if (g === 'ँ') return `chandrabindu (${counterpart || 'ಁ'})`;
    if (roman && counterpart) return `${g} (${roman} / ${counterpart})`;
    if (roman) return `${g} (${roman})`;
    if (counterpart) return `${g} (${counterpart})`;
    return g;
  }
  return g;
}

const THEME_STORAGE_KEY = "kannada_app_theme";
const THEMES = {
  light: {
    bodyBackground: "#f5f7ff",
    appBackground: "linear-gradient(180deg,#f6f8ff 0%, #fff 60%)",
    textPrimary: "#111827",
    textMuted: "#6b7280",
    surface: "#ffffff",
    surfaceSubtle: "#f3f4f6",
    panel: "#f7fafc",
    control: "#ffffff",
    controlHover: "#f9fafb",
    border: "#e5e7eb",
    softBorder: "rgba(0,0,0,0.08)",
    elevatedShadow: "0 12px 40px rgba(12,20,40,0.06)",
    softShadow: "0 10px 30px rgba(0,0,0,0.06)",
    insetShadow: "inset 0 0 0 2px rgba(0,0,0,0.04)",
    overlay: "rgba(17,24,39,0.35)",
    timerDefault: "#eef2ff",
    timerWarning: "#fef3c7",
    timerCritical: "#fee2e2",
    timerText: "#374151",
  },
  dark: {
    bodyBackground: "#020617",
    appBackground: "linear-gradient(180deg,#0f172a 0%, #0b1120 60%)",
    textPrimary: "#e2e8f0",
    textMuted: "#94a3b8",
    surface: "rgba(15,23,42,0.92)",
    surfaceSubtle: "rgba(148,163,184,0.12)",
    panel: "rgba(30,41,59,0.55)",
    control: "rgba(15,23,42,0.85)",
    controlHover: "rgba(30,41,59,0.7)",
    border: "rgba(148,163,184,0.32)",
    softBorder: "rgba(148,163,184,0.16)",
    elevatedShadow: "0 18px 50px rgba(2,6,23,0.65)",
    softShadow: "0 14px 36px rgba(2,6,23,0.5)",
    insetShadow: "inset 0 0 0 2px rgba(148,163,184,0.18)",
    overlay: "rgba(15,23,42,0.72)",
    timerDefault: "rgba(99,102,241,0.22)",
    timerWarning: "rgba(234,179,8,0.28)",
    timerCritical: "rgba(248,113,113,0.24)",
    timerText: "#f8fafc",
  },
};

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

const HINDI_STATS_BASE_KEY = `${BASE_STATS_KEY}_hi_v1`;
function hiStatsKeyFor(profile) {
  return `${HINDI_STATS_BASE_KEY}::${profile}`;
}
function loadHiStats(profile) {
  try {
    const raw = localStorage.getItem(hiStatsKeyFor(profile));
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}
function saveHiStats(profile, s) {
  try {
    localStorage.setItem(hiStatsKeyFor(profile), JSON.stringify(s));
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
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'dark' || stored === 'light') return stored;
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          return 'dark';
        }
      } catch {}
    }
    return 'light';
  });
  const themeColors = useMemo(() => THEMES[theme] || THEMES.light, [theme]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
    const body = document.body;
    if (body) {
      body.style.background = themeColors.bodyBackground;
      body.style.color = themeColors.textPrimary;
      body.dataset.theme = theme;
    }
    const root = document.documentElement;
    if (root) {
      root.style.background = themeColors.bodyBackground;
      root.style.color = themeColors.textPrimary;
    }
  }, [theme, themeColors]);
  const choose = (lightValue, darkValue) => (theme === 'dark' ? darkValue : lightValue);

  const [profile, setProfile] = useState(PROFILES[0]);
  // Arrange-only app: randomize by default (no UI toggle)
  const [randomize] = useState(true);
  // App mode: 'kannada' | 'math' | 'english'
  const [mode, setMode] = useState('kannada');

  // build sanitized deck on first render
  const [deck, setDeck] = useState(() => {
    const sanitized = RAW_CARDS.map((card) => ({
      ...card,
      wordKannada: sanitizeKannada(card.wordKannada),
      wordHindi: sanitizeHindi(card.transliterationHi || ""),
    }));
    return randomize ? shuffleArray(sanitized) : sanitized;
  });

  const [cardIndex, setCardIndex] = useState(0);
  const [direction, setDirection] = useState('hi-to-kn'); // hi-to-kn | kn-to-hi
  const DIRECTION_OPTIONS = {
    'hi-to-kn': { value: 'hi-to-kn', label: 'Hindi → Kannada', promptLabel: 'Hindi', targetLabel: 'Kannada' },
    'kn-to-hi': { value: 'kn-to-hi', label: 'Kannada → Hindi', promptLabel: 'Kannada', targetLabel: 'Hindi' },
  };
  const directionMeta = DIRECTION_OPTIONS[direction] || DIRECTION_OPTIONS['hi-to-kn'];
  const card = useMemo(() => deck[cardIndex] || deck[0] || RAW_CARDS[0], [deck, cardIndex]);

  useEffect(() => {
    if (!deck.length) return;
    if (cardSupportsDirection(card, direction)) return;
    const nextIdx = deck.findIndex((entry) => cardSupportsDirection(entry, direction));
    if (nextIdx !== -1 && nextIdx !== cardIndex) {
      setCardIndex(nextIdx);
    }
  }, [card, deck, direction, cardIndex]);

  const targetScript = direction === 'hi-to-kn' ? 'kn' : 'hi';
  const promptScript = direction === 'hi-to-kn' ? 'hi' : 'kn';
  const promptWord = useMemo(() => {
    if (!card) return '';
    if (direction === 'hi-to-kn') {
      if (card.wordHindi && card.wordHindi.length) return card.wordHindi;
      const sanitizedHi = sanitizeHindi(card.transliterationHi || '');
      if (sanitizedHi.length) return sanitizedHi;
      return card.transliterationHi || card.transliteration || '';
    }
    return card.wordKannada || '';
  }, [card, direction]);
  const targetWord = useMemo(() => {
    if (!card) return '';
    return direction === 'hi-to-kn' ? (card.wordKannada || '') : (card.wordHindi || '');
  }, [card, direction]);

  const clusters = useMemo(() => Array.from(targetWord || ""), [targetWord]);
  const colors = useMemo(() => paletteFor(clusters.length), [clusters.length]);
  // Build a stable color map per-card so the same glyph keeps the same color
  const glyphColorMap = useMemo(() => {
    const map = {};
    const themeMode = theme === 'dark' ? 'dark' : 'light';
    const vowelArr = (TILE_HUES[themeMode] && TILE_HUES[themeMode].vowel) || [];
    const consArr = (TILE_HUES[themeMode] && TILE_HUES[themeMode].cons) || [];
    let vi = 0;
    let ci = 0;
    for (const g of clusters) {
      if (map[g]) continue;
      if (isVowelGlyph(g, targetScript) && vowelArr.length) {
        map[g] = vowelArr[vi % vowelArr.length];
        vi++;
      } else if (!isVowelGlyph(g, targetScript) && consArr.length) {
        map[g] = consArr[ci % consArr.length];
        ci++;
      } else {
        // Fallback to general palette if themed arrays are missing
        const idx = Object.keys(map).length;
        map[g] = colors[idx % colors.length];
      }
    }
    return map;
  }, [clusters, theme, colors, targetScript]);

  function tileColorFor(glyph, idx) {
    return glyphColorMap[glyph] || colors[idx % colors.length];
  }

  const [tiles, setTiles] = useState([]);
  const [slots, setSlots] = useState([]);
  // track whether the learner has made an attempt (placed any tile) for the current card
  const [hasAttempted, setHasAttempted] = useState(false);
  const [result, setResult] = useState(null);
  const [lastCorrectWord, setLastCorrectWord] = useState(null);
  const [showTargetAnswer, setShowTargetAnswer] = useState(false);
  const [microFeedback, setMicroFeedback] = useState(null);

  const [glyphStatsKn, setGlyphStatsKn] = useState(() => loadGlyphStats(PROFILES[0]));
  const [glyphStatsHi, setGlyphStatsHi] = useState(() => loadHiStats(PROFILES[0]));
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

  // hints removed

  useEffect(() => {
    setGlyphStatsKn(loadGlyphStats(profile));
    setGlyphStatsHi(loadHiStats(profile));
    setMathStats(loadMathStats(profile));
    setEngStats(loadEngStats(profile));
    setTvMinutes(loadTvMinutes(profile));
  }, [profile]);

  // no toggle: randomize is true by default — build deck once on mount
  useEffect(() => {
    const sanitized = RAW_CARDS.map((card) => ({
      ...card,
      wordKannada: sanitizeKannada(card.wordKannada),
      wordHindi: sanitizeHindi(card.transliterationHi || ""),
    }));
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

  // prepare tiles & slots whenever target word changes
  useEffect(() => {
    const base = clusters.map((g, i) => ({ g, idx: i, c: tileColorFor(g, i) }));
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
    setTvMinutesLock(new Set());
    setResult(null);
    setLastCorrectWord(null);
    setShowTargetAnswer(false);
    setMicroFeedback(null);
  }, [cardIndex, targetWord, direction]);

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
    newSlots[slotIndex] = { ...tile, c: tileColorFor(tile.g, slotIndex) };
    setTiles(existing ? [...newTiles, existing] : newTiles);
    setSlots(newSlots);
    setResult(null);

    // award/penalize immediately for this placement (only once per slot per round)
    setTvMinutes((prev) => {
      if (tvMinutesLock.has(slotIndex)) return prev; // already scored
      const correctGlyph = clusters[slotIndex];
      const delta = tile.g === correctGlyph ? 1 : -5;
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
    newSlots[firstEmpty] = { ...tile, c: tileColorFor(tile.g, firstEmpty) };
    setTiles(newTiles);
    setSlots(newSlots);
    setResult(null);
    setHasAttempted(true);

    // award/penalize immediately for this placement (only once per slot per round)
    const placedIdx = firstEmpty;
    setTvMinutes((prev) => {
      if (tvMinutesLock.has(placedIdx)) return prev;
      const correctGlyph = clusters[placedIdx];
      const delta = tile.g === correctGlyph ? 1 : -5;
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
    const isKannadaTarget = targetScript === 'kn';
    const baseStats = isKannadaTarget ? glyphStatsKn : glyphStatsHi;
    const updated = { ...baseStats };
    for (let i = 0; i < clusters.length; i++) {
      const key = clusters[i];
      const stat = updated[key] ? { ...updated[key] } : { attempts: 0, correct: 0 };
      stat.attempts = (stat.attempts || 0) + 1;
      const placed = slots[i] ? slots[i].g : "";
      if (placed === key) stat.correct = (stat.correct || 0) + 1;
      updated[key] = stat;
    }
    if (isKannadaTarget) {
      setGlyphStatsKn(updated);
      saveGlyphStats(profile, updated);
    } else {
      setGlyphStatsHi(updated);
      saveHiStats(profile, updated);
    }

    // hints removed
    const ok = assembled === expected;
    setResult(ok ? "correct" : "incorrect");
    setLastCorrectWord(ok ? null : expected);
    if (!ok) {
      setTvMinutes((prev) => {
        const next = Math.max(0, prev - 2);
        saveTvMinutes(profile, next);
        return next;
      });
      let wrongIdx = null;
      for (let i = 0; i < clusters.length; i++) {
        const placed = slots[i] ? slots[i].g : "";
        if (placed !== clusters[i]) { wrongIdx = i; break; }
      }
      if (wrongIdx !== null) {
        const g = clusters[wrongIdx];
        setMicroFeedback(formatGlyphName(g));
      }
    } else {
      setMicroFeedback(null);
    }
  }

  function handleReset() {
    const base = clusters.map((g, i) => ({ g, idx: i, c: tileColorFor(g, i) }));
    setTiles(shuffleArray(base));
    setSlots(new Array(clusters.length).fill(null));
    setResult(null);
    setHasAttempted(false);
    setLastCorrectWord(null);
  }

  function handleNext() {
    setCardIndex((ci) => findNextSupportedIndex(deck, ci, direction));
  }

  function handleReshuffle() {
    // re-sanitize & reshuffle
    const sanitized = RAW_CARDS.map((card) => ({
      ...card,
      wordKannada: sanitizeKannada(card.wordKannada),
      wordHindi: sanitizeHindi(card.transliterationHi || ""),
    }));
    setDeck(shuffleArray(sanitized));
    setCardIndex(0);
    setHasAttempted(false);
  }

// hints removed

  function computeWeakGlyphs(stats) {
    return Object.entries(stats)
      .map(([g, s]) => ({ glyph: g, attempts: s.attempts || 0, correct: s.correct || 0, accuracy: s.attempts ? (s.correct || 0) / s.attempts : 1 }))
      .filter((x) => x.attempts > 0)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 12);
  }

  const weakGlyphsKn = useMemo(() => computeWeakGlyphs(glyphStatsKn), [glyphStatsKn]);
  const weakGlyphsHi = useMemo(() => computeWeakGlyphs(glyphStatsHi), [glyphStatsHi]);
  const activeWeakGlyphs = targetScript === 'kn' ? weakGlyphsKn : weakGlyphsHi;

function glyphColorFor(accuracy, themeMode = 'light') {
  if (themeMode === 'dark') {
    if (accuracy < 0.7) return "rgba(248,113,113,0.28)";
    if (accuracy < 0.9) return "rgba(234,179,8,0.25)";
    return "rgba(16,185,129,0.25)";
  }
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
  const [bonusReward, setBonusReward] = useState(1);
  const [bonusPenalty, setBonusPenalty] = useState(5);
  const [bonusFrequency, setBonusFrequency] = useState(0.15); // 0..1
  const [answer, setAnswer] = useState("");
  const answerRef = useRef(null);
  // per-question timer state
  const [timeLeft, setTimeLeft] = useState(120);
  const [currentTimeLimit, setCurrentTimeLimit] = useState(120);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef(null);
  const timeLimitRef = useRef(120);
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
    const delta = isCorrect ? 1 : -5;
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
    const delta = -5;
      const next = Math.max(0, prev + delta);
      saveTvMinutes(profile, next);
      return next;
    });
    setTimedOut(true);
    setResult('incorrect');
    setAnswer("");
  }

  function handleKannadaTimeout() {
    if (result) return;
    setTimedOut(true);
    handleSubmit();
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
      const delta = correct ? 1 : -5;
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

  // Start/Reset timers per mode (unified 120s timer for all modes)
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    let limit = 120;
    timeLimitRef.current = limit;
    setCurrentTimeLimit(limit);
    if (result) return;
    if (mode !== 'math' && mode !== 'english' && mode !== 'kannada') return;
    setTimedOut(false);
    setTimeLeft(limit);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          if (mode === 'math') handleMathTimeout();
          else if (mode === 'english') handleEnglishTimeout();
          else if (mode === 'kannada') handleKannadaTimeout();
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
  }, [mode, mathQ, engIndex, cardIndex, result]);

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

  const timerBadgeStyle = useMemo(() => {
    const background = timeLeft <= 3 ? themeColors.timerCritical : (timeLeft <= 7 ? themeColors.timerWarning : themeColors.timerDefault);
    const color = timeLeft <= 3 ? (theme === 'dark' ? '#fecaca' : '#991b1b') : themeColors.timerText;
    return { background, color };
  }, [timeLeft, themeColors, theme]);

  return (
    <>
    <style>{`
      @keyframes pulseBadge {0%{transform:scale(1); box-shadow:0 0 0 0 rgba(245,158,11,.45);} 70%{transform:scale(1.03); box-shadow:0 0 0 12px rgba(245,158,11,0);} 100%{transform:scale(1); box-shadow:0 0 0 0 rgba(245,158,11,0);}}
      .bonus-badge { animation: pulseBadge 1.2s infinite; }
    `}</style>
    <div style={{ minHeight: "100vh", padding: 20, fontFamily: "Inter, system-ui, sans-serif", background: themeColors.appBackground, color: themeColors.textPrimary, transition: "background 0.4s ease, color 0.4s ease" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div>
              <label style={{ marginRight: 8, color: themeColors.textMuted, fontWeight: 700 }}>Learner:</label>
              <select value={profile} onChange={(e) => {
                  const next = e.target.value;
                  // persist current profile minutes
                  saveTvMinutes(profile, tvMinutes);
                  setProfile(next);
                  // load next profile minutes (effect handles setTvMinutes)
                }} style={{ padding: "6px 10px", borderRadius: 8, background: themeColors.control, color: themeColors.textPrimary, border: `1px solid ${themeColors.border}` }}>
                {PROFILES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ margin: '0 8px 0 12px', color: themeColors.textMuted, fontWeight: 700 }}>Mode:</label>
              <select value={mode} onChange={(e) => { setMode(e.target.value); setResult(null); }} style={{ padding: "6px 10px", borderRadius: 8, background: themeColors.control, color: themeColors.textPrimary, border: `1px solid ${themeColors.border}` }}>
                <option value="kannada">Kannada</option>
                <option value="math">Math</option>
                <option value="english">English</option>
              </select>
            </div>
            {mode === 'kannada' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 12 }}>
                <span style={{ color: themeColors.textMuted, fontWeight: 700 }}>Direction:</span>
                <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  {Object.values(DIRECTION_OPTIONS).map((opt) => {
                    const isActive = direction === opt.value;
                    const bg = isActive ? choose('#bbf7d0', 'rgba(16,185,129,0.24)') : themeColors.control;
                    const textColor = isActive ? choose('#064e3b', '#bbf7d0') : themeColors.textPrimary;
                    const borderColor = isActive ? choose('#0f9f7a', 'rgba(34,197,94,0.55)') : themeColors.border;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          if (direction === opt.value) return;
                          setDirection(opt.value);
                          setResult(null);
                          setCardIndex((idx) => cardSupportsDirection(deck[idx], opt.value) ? idx : findNextSupportedIndex(deck, idx, opt.value));
                        }}
                        style={{
                          padding: '8px 18px',
                          borderRadius: 9999,
                          border: `1px solid ${borderColor}`,
                          background: bg,
                          color: textColor,
                          cursor: 'pointer',
                          fontWeight: isActive ? 800 : 600,
                          letterSpacing: 0.2,
                          minWidth: 150,
                          textAlign: 'center',
                          transition: 'background 0.2s ease, color 0.2s ease, border 0.2s ease',
                          boxShadow: isActive ? choose('0 0 0 3px rgba(16,185,129,0.15)', '0 0 0 2px rgba(16,185,129,0.4)') : '0 0 0 1px rgba(15,23,42,0.2)',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Arrange-only: mode and randomize are fixed (random by default) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ background: themeColors.surfaceSubtle, padding: "6px 10px", borderRadius: 8, fontWeight: 700, color: themeColors.textPrimary }} title="Allowed TV minutes based on practice">TV: {tvMinutes} min</div>
              <button onClick={() => { setShowParent(true); setParentError(""); }} title="Parent controls" style={{ padding: '6px 10px', border: `1px solid ${themeColors.border}`, background: themeColors.control, color: themeColors.textPrimary, borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Parent</button>
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ padding: '6px 12px', borderRadius: 9999, border: `1px solid ${themeColors.border}`, background: themeColors.control, color: themeColors.textPrimary, cursor: 'pointer', fontWeight: 700 }} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
                {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
              </button>
            </div>
          </div>
          {mode === 'kannada' ? (
            <div style={{ color: themeColors.textMuted }}>Card {cardIndex + 1} / {deck.length}</div>
          ) : mode === 'math' ? (
            <div style={{ color: themeColors.textMuted }}>Math practice</div>
          ) : (
            <div style={{ color: themeColors.textMuted }}>Word {engIndex + 1} / {engDeck.length}</div>
          )}
        </div>

        <div style={{ background: themeColors.surface, padding: 20, borderRadius: 12, boxShadow: themeColors.elevatedShadow, transition: "background 0.3s ease, box-shadow 0.3s ease" }}>
          {mode === 'kannada' ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 34, fontWeight: 900 }}>{promptWord || (direction === 'hi-to-kn' ? (card.transliterationHi || card.transliteration || '') : card.wordKannada || '')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: themeColors.textMuted }}>
                <span role="img" aria-label="switch languages">🔁</span>
                <span>Arrange this word in {directionMeta.targetLabel}</span>
                {showTargetAnswer && (
                  <div style={{ textAlign: 'center', marginTop: 4, fontSize: 40, fontWeight: 900, letterSpacing: 1, color: themeColors.textPrimary }}>
                    {targetWord}
                  </div>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right", display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <div style={{ fontSize: 13, color: themeColors.textMuted }}>{directionMeta.promptLabel} → {directionMeta.targetLabel}</div>
              {card.transliteration && (
                <div style={{ fontSize: 16, fontWeight: 600, color: themeColors.textMuted }}>{card.transliteration}</div>
              )}
              <div style={{ fontWeight: 800, fontSize: 16, display: 'inline-flex', alignItems: 'center', padding: '6px 12px', borderRadius: 999, background: timerBadgeStyle.background, color: timerBadgeStyle.color }}>⏱ {timeLeft}s</div>
            </div>
          </div>
          ) : mode === 'math' ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 32, color: themeColors.textPrimary, display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700 }}>
                Solve the problem
                {mathQ.bonus && (
                  <span className="bonus-badge" style={{ padding: '4px 8px', background: '#fef3c7', color: '#92400e', borderRadius: 9999, fontSize: 12, fontWeight: 800 }}>Bonus: +20 / −20</span>
                )}
              </div>
              {mathQ.op === 'place' || mathQ.op === 'face' ? (
                <div style={{ fontSize: 42, fontWeight: 900 }}>
                  {mathQ.op === 'place' ? 'Place value of digit' : 'Face value of digit'}{' '}
                  <span style={{ padding: '2px 8px', background: choose('#eef2ff', 'rgba(99,102,241,0.28)'), borderRadius: 8 }}>{String(mathQ.number).charAt(String(mathQ.number).length - 1 - mathQ.pos)}</span>
                  {' '}in {mathQ.number}
                </div>
              ) : mathQ.op === 'placeName' ? (
                <div style={{ fontSize: 42, fontWeight: 900 }}>
                  Which place is{' '}
                  <span style={{ padding: '2px 8px', background: choose('#eef2ff', 'rgba(99,102,241,0.28)'), borderRadius: 8 }}>{String(mathQ.number).charAt(String(mathQ.number).length - 1 - mathQ.pos)}</span>
                  {' '}in {mathQ.number}?
                </div>
              ) : (
                <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: 1 }}>{mathQ.a} {mathQ.op} {mathQ.b}</div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: themeColors.textMuted }}>Enter the answer</div>
              <div style={{ marginTop: 8, fontWeight: 800, fontSize: 16, display: 'inline-block', padding: '6px 12px', borderRadius: 999, background: timerBadgeStyle.background, color: timerBadgeStyle.color }}>⏱ {timeLeft}s</div>
            </div>
          </div>
          ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 32, color: themeColors.textPrimary, fontWeight: 700 }}>Read the word</div>
              <div style={{ fontSize: 60, fontWeight: 900, letterSpacing: 1 }}>{engWord}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: themeColors.textMuted }}>Tap if read or not</div>
              <div style={{ marginTop: 8, fontWeight: 800, fontSize: 16, display: 'inline-block', padding: '6px 12px', borderRadius: 999, background: timerBadgeStyle.background, color: timerBadgeStyle.color }}>⏱ {timeLeft}s</div>
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
                      <div draggable onDragStart={(e) => onDragStart(e, i)} onClick={() => placeTileToFirstEmpty(i)} style={{ cursor: "grab", userSelect: "none", background: tile.c, color: "#0f172a", padding: "16px 18px", borderRadius: 12, fontSize: 36, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 76, minHeight: 72, boxShadow: "0 8px 28px rgba(0,0,0,0.06)", letterSpacing: 1 }} title="Drag to a slot or tap to place">{tile.g}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slots */}
              <div style={{ marginBottom: 18, padding: 12, background: themeColors.panel, borderRadius: 12, transition: "background 0.3s ease" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "nowrap", minHeight: 92 }}>
                  {slots.map((slot, i) => (
                    <div key={i} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div onDragOver={onDragOverSlot} onDrop={(e) => onDropToSlot(e, i)} onClick={() => returnSlotToPool(i)} style={{ width: 86, height: 86, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: slot ? slot.c : choose('#ffffff', 'rgba(15,23,42,0.9)'), color: slot ? '#0f172a' : themeColors.textPrimary, boxShadow: slot ? themeColors.softShadow : themeColors.insetShadow, fontSize: 42, cursor: slot ? "pointer" : "copy", letterSpacing: 1 }} title={slot ? "Click to return to pool" : "Drop tile here"}>{slot ? slot.g : ""}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls — only core actions for kids */}
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: 'wrap' }}>
                <button onClick={handleSubmit} style={{ padding: "12px 22px", background: "#10b981", color: "white", border: "none", borderRadius: 14, cursor: "pointer", fontWeight: 800, fontSize: 18 }}>Submit</button>
                

                {result === 'incorrect' && microFeedback && (
                  <div style={{ padding: '10px 12px', background: choose('#eef2ff', 'rgba(99,102,241,0.2)'), color: themeColors.textPrimary, borderRadius: 10, fontWeight: 800 }}>
                    The next glyph is {microFeedback}. Try again!
                  </div>
                )}

                {result === "correct" && <button onClick={handleNext} style={{ padding: "12px 22px", background: "#bfdbfe", borderRadius: 14, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 18 }}>Next</button>}
                {result === "correct" && <div style={{ marginLeft: 6, color: "#166534", fontWeight: 800 }}>✅ Correct</div>}
                {result === "incorrect" && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: choose('#fee2e2', 'rgba(248,113,113,0.2)'), color: choose('#991b1b', '#fecaca'), fontWeight: 900, fontSize: 18 }}>
                    {timedOut ? '⏰ Time up' : '❌ Not correct'}
                    {!showTargetAnswer && (
                      <button type="button" onClick={() => setShowTargetAnswer(true)} style={{ marginLeft: 6, padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 800, background: choose('#fde68a', 'rgba(234,179,8,0.25)'), color: themeColors.textPrimary }}>
                        Show {directionMeta.targetLabel}
                      </button>
                    )}
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
              <div style={{ padding: 14, borderRadius: 12, background: themeColors.surface, boxShadow: themeColors.softShadow, border: `1px solid ${themeColors.softBorder}`, transition: "background 0.3s ease" }}>
                {mode === 'kannada' ? (
                  <>
                  <h3 style={{ marginTop: 0 }}>Practice buddies ({directionMeta.targetLabel})</h3>
                  <div style={{ fontSize: 13, color: themeColors.textMuted, marginBottom: 10 }}>These {directionMeta.targetLabel.toLowerCase()} characters are learning with you, {profile}! Keep going.</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {activeWeakGlyphs.length === 0 && <div style={{ gridColumn: "1 / -1", color: themeColors.textMuted }}>Keep playing! We’ll track tricky letters for you.</div>}
                    {activeWeakGlyphs.map((w) => {
                      const counterpart = counterpartForGlyph(w.glyph);
                      const roman = romanForAny(w.glyph);
                      return (
                        <div key={`${direction}-${w.glyph}`} style={{ padding: 12, borderRadius: 12, background: glyphColorFor(w.accuracy, theme), textAlign: "center" }} title={`${w.correct}/${w.attempts}`}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, lineHeight: 1 }}>
                            <div style={{ fontSize: 32, fontWeight: 800 }}>{w.glyph}</div>
                            {counterpart && <div style={{ fontSize: 18, fontWeight: 700 }}>{counterpart}</div>}
                            {roman && <div style={{ fontSize: 12, fontWeight: 700, color: themeColors.textMuted }}>{roman}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  </>
                ) : mode === 'math' ? (
                  <>
                  <h3 style={{ marginTop: 0 }}>Weak math facts</h3>
                  <div style={{ fontSize: 13, color: themeColors.textMuted, marginBottom: 10 }}>Lowest accuracy for {profile}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {weakFacts.length === 0 && <div style={{ gridColumn: "1 / -1", color: themeColors.textMuted }}>No stats yet — answer a few questions.</div>}
                    {weakFacts.map((w) => (
                      <div key={w.fact} style={{ padding: 8, borderRadius: 8, background: glyphColorFor(w.accuracy, theme), textAlign: "center" }} title={`${w.correct}/${w.attempts}`}>
                        <div style={{ fontSize: 20 }}>{w.fact}</div>
                        <div style={{ fontSize: 12, fontWeight: 800 }}>{Math.round((w.accuracy || 0) * 100)}%</div>
                        <div style={{ fontSize: 11, color: themeColors.textMuted }}>{w.correct}/{w.attempts}</div>
                      </div>
                    ))}
                  </div>

                  </>
                ) : (
                  <>
                  <h3 style={{ marginTop: 0 }}>Weak words</h3>
                  <div style={{ fontSize: 13, color: themeColors.textMuted, marginBottom: 10 }}>Lowest accuracy for {profile}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {weakEnglish.length === 0 && <div style={{ gridColumn: "1 / -1", color: themeColors.textMuted }}>No stats yet — practice a few words.</div>}
                    {weakEnglish.map((w) => (
                      <div key={w.word} style={{ padding: 8, borderRadius: 8, background: glyphColorFor(w.accuracy, theme), textAlign: "center" }} title={`${w.correct}/${w.attempts}`}>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>{w.word}</div>
                        <div style={{ fontSize: 12, fontWeight: 800 }}>{Math.round((w.accuracy || 0) * 100)}%</div>
                        <div style={{ fontSize: 11, color: themeColors.textMuted }}>{w.correct}/{w.attempts}</div>
                      </div>
                    ))}
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
              <label style={{ fontSize: 13, color: themeColors.textMuted }}>Passcode</label>
              <input type="password" inputMode="numeric" pattern="[0-9]*" value={parentPass} onChange={(e) => setParentPass(e.target.value)} placeholder="6-digit passcode" style={{ padding: '10px 12px', border: `1px solid ${themeColors.border}`, borderRadius: 10, fontSize: 16, background: themeColors.control, color: themeColors.textPrimary }} />

              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 13, color: themeColors.textMuted, marginBottom: 6 }}>Quick adjust (Good/Bad behavior)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                  <button type="button" onClick={() => quickAdjustTvMinutes(-10)} style={{ padding: '10px 8px', background: '#fee2e2', color: '#7f1d1d', border: '1px solid #fecaca', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>−10</button>
                  <button type="button" onClick={() => quickAdjustTvMinutes(-5)} style={{ padding: '10px 8px', background: '#fee2e2', color: '#7f1d1d', border: '1px solid #fecaca', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>−5</button>
                  <button type="button" onClick={() => quickAdjustTvMinutes(-1)} style={{ padding: '10px 8px', background: '#fee2e2', color: '#7f1d1d', border: '1px solid #fecaca', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>−1</button>
                  <button type="button" onClick={() => quickAdjustTvMinutes(1)} style={{ padding: '10px 8px', background: '#dcfce7', color: '#14532d', border: '1px solid #bbf7d0', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>+1</button>
                  <button type="button" onClick={() => quickAdjustTvMinutes(5)} style={{ padding: '10px 8px', background: '#dcfce7', color: '#14532d', border: '1px solid #bbf7d0', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>+5</button>
                  <button type="button" onClick={() => quickAdjustTvMinutes(10)} style={{ padding: '10px 8px', background: '#dcfce7', color: '#14532d', border: '1px solid #bbf7d0', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>+10</button>
                </div>
              </div>

              <label style={{ fontSize: 13, color: themeColors.textMuted, marginTop: 6 }}>Custom award (minutes)</label>
              <input type="number" min={1} step={1} value={parentMinutes} onChange={(e) => setParentMinutes(e.target.value)} placeholder="e.g. 10" style={{ padding: '10px 12px', border: `1px solid ${themeColors.border}`, borderRadius: 10, fontSize: 16, background: themeColors.control, color: themeColors.textPrimary }} />
              {parentError && <div style={{ color: '#b91c1c', fontWeight: 700 }}>{parentError}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <button type="submit" style={{ padding: '10px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>Award</button>
                <button type="button" onClick={() => setShowParent(false)} style={{ padding: '10px 12px', background: choose('#e5e7eb', 'rgba(148,163,184,0.18)'), color: themeColors.textPrimary, border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>Close</button>
                <button type="button" onClick={resetAllTvMinutesViaParent} title="Requires passcode" style={{ padding: '10px 12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>Reset all TV minutes</button>
              </div>
              <hr style={{ border: 0, borderTop: `1px solid ${themeColors.border}`, margin: '12px 0' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 13, color: themeColors.textMuted, fontWeight: 700 }}>Advanced controls</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => { localStorage.removeItem(statsKeyFor(profile)); setGlyphStats({}); }} style={{ padding: '8px 12px', background: '#fee2e2', color: '#7f1d1d', border: '1px solid #fecaca', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>Reset {profile}'s glyph stats</button>
                  <button type="button" onClick={() => { handleReshuffle(); }} style={{ padding: '8px 12px', background: choose('#eef2ff', 'rgba(99,102,241,0.18)'), border: `1px solid ${themeColors.border}`, color: themeColors.textPrimary, borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>Reshuffle Kannada deck</button>
                  <button type="button" onClick={() => { setCardIndex(0); }} style={{ padding: '8px 12px', background: choose('#eef2ff', 'rgba(99,102,241,0.18)'), border: `1px solid ${themeColors.border}`, color: themeColors.textPrimary, borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>Go to first Kannada card</button>
                  <button type="button" onClick={() => { localStorage.removeItem(mathStatsKeyFor(profile)); setMathStats({}); }} style={{ padding: '8px 12px', background: '#fee2e2', color: '#7f1d1d', border: '1px solid #fecaca', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>Reset {profile}'s math stats</button>
                  <button type="button" onClick={() => { localStorage.removeItem(engStatsKeyFor(profile)); setEngStats({}); }} style={{ padding: '8px 12px', background: '#fee2e2', color: '#7f1d1d', border: '1px solid #fecaca', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>Reset {profile}'s English stats</button>
                  <button type="button" onClick={() => { setEngDeck((d) => shuffleArray(d)); setEngIndex(0); }} style={{ padding: '8px 12px', background: choose('#eef2ff', 'rgba(99,102,241,0.18)'), border: `1px solid ${themeColors.border}`, color: themeColors.textPrimary, borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>Shuffle English order</button>
                  <button type="button" onClick={reshuffleEnglish} style={{ padding: '8px 12px', background: choose('#eef2ff', 'rgba(99,102,241,0.18)'), border: `1px solid ${themeColors.border}`, color: themeColors.textPrimary, borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>New 200 English sample</button>
                </div>
              </div>
              <div style={{ fontSize: 12, color: themeColors.textMuted }}>Changes apply to <b>{profile}</b>.</div>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}

function getMathTimeLimit(q) {
  // Unified timer across the app
  return 120;
}
