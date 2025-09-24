// Kannada Flashcards — first good version
// - Gate hints until an attempt
// - Single-step next-character hints (max 2 per word)
// - Mark hinted glyphs as assisted in stats
// - Live TV-minute incentive awarded/penalized on tile placement
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useModeContext } from "./ModeContext";
import { RAW_CARDS, PROFILES, BASE_STATS_KEY, TV_BASE_KEY, ENGLISH_WORDS, KAN_TO_HI as DATA_KAN_TO_HI, KAN_MATRAS, HI_TO_KAN, HI_MATRAS } from "../data";
import { scorePlacementDelta, scoreRoundDelta, scoreEnglishDelta, clampMinutes } from "../domain/scoring";
import { loadTvMinutes as loadTvMin, saveTvMinutes as saveTvMin, loadGlyphStats as loadGlyph, saveGlyphStats as saveGlyph, loadMathStats as loadMath, saveMathStats as saveMath, loadEngStats as loadEng, saveEngStats as saveEng } from "../domain/statsStore";
import { loadMasteryData, saveMasteryData, loadActiveSet, saveActiveSet, loadProgress, saveProgress, loadUndoState, saveUndoState, clearUndoState } from "../domain/masteryStore";
import { 
  initWordProgress, 
  updateWordProgress, 
  shouldCreateActiveSet, 
  createActiveSet, 
  isActiveSetCompleted, 
  getNextWordFromActiveSet, 
  getProgressStats, 
  calculateTotalSets,
  resetCurrentSet,
  resetAllMastery,
  getUnknownWords,
  getUntestedWords,
  UNDO_TIMEOUT_MS,
  ACTIVE_SET_SIZE,
  MASTERY_STREAK_REQUIRED
} from "../domain/masteryLogic";
import KannadaRound from "../features/kannada/KannadaRound";
import { useKannadaRound } from "../features/kannada/useKannadaRound";

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

function formatGlyphName(g, { showRoman = true } = {}) {
  const script = scriptForGlyph(g);
  const roman = showRoman ? romanForAny(g) : '';
  const counterpart = counterpartForGlyph(g);
  if (script === 'kn') {
    if (VOWEL_SIGNS_KN.has(g)) {
      return `vowel sign ${g}${roman || counterpart ? ` (${roman}${roman && counterpart ? ' / ' : ''}${counterpart || ''})` : ''}`;
    }
    // Show halant/virama with a dotted circle so it renders visibly
    if (g === '್') return `halant (${'◌್'}${counterpart ? ` / ${'◌्'}` : ''})`;
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
    // Show halant/virama with a dotted circle so it renders visibly
    if (g === '्') return `halant (${'◌्'}${counterpart ? ` / ${'◌್'}` : ''})`;
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

// tvKeyFor kept for compatibility but use domain store
function tvKeyFor(profile) { return `${TV_BASE_KEY}::${profile}`; }

function loadTvMinutes(profile) { return loadTvMin(profile); }

function saveTvMinutes(profile, minutes) { return saveTvMin(profile, minutes); }

function loadGlyphStats(profile) { return loadGlyph(profile, 'kn'); }

function saveGlyphStats(profile, s) { return saveGlyph(profile, s, 'kn'); }

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
function loadMathStats(profile) { return loadMath(profile); }
function saveMathStats(profile, s) { return saveMath(profile, s); }

// English reading stats (per word)
function engStatsKeyFor(profile) { return `${BASE_STATS_KEY}_eng_v1::${profile}`; }
function loadEngStats(profile) { return loadEng(profile); }
function saveEngStats(profile, s) { return saveEng(profile, s); }

export default function AppShell() {
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

  const PROFILES_STORAGE_KEY = 'kannada_profiles_v1';
  function loadProfilesList() {
    try { const raw = localStorage.getItem(PROFILES_STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
  }
  function saveProfilesList(list) { try { localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(list)); } catch {} }
  const [profiles, setProfiles] = useState(() => {
    const extra = loadProfilesList();
    const merged = [...PROFILES, ...extra].filter(Boolean);
    // de-dupe case-insensitive
    const seen = new Set();
    return merged.filter((p) => { const k = String(p).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  });
  const [profile, setProfile] = useState(() => (profiles[0] || PROFILES[0]));
  function addProfile() {
    const name = (window.prompt('New learner name?') || '').trim();
    if (!name) return;
    const lower = name.toLowerCase();
    if (profiles.some((p) => String(p).toLowerCase() === lower)) return setProfile(name); // already exists
    const nextList = [...profiles, name];
    setProfiles(nextList);
    saveProfilesList(nextList.filter((p) => !PROFILES.includes(p)));
    setProfile(name);
    // initialize TV minutes
    saveTvMinutes(name, loadTvMinutes(name));
  }
  // Arrange-only app: randomize by default (no UI toggle)
  const [randomize] = useState(true);
  // App mode: 'kannada' | 'math' | 'english'
  const { modes, activeModeId: mode, setActiveModeId: setMode } = useModeContext();

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

  const { directionMeta: dirMeta2, targetScript, promptScript, promptWord, targetWord, clusters, tileColorFor, tiles, slots, onDragStart, onDragOverSlot, onDropToSlot, placeTileToFirstEmpty, returnSlotToPool } = useKannadaRound({
    card, direction, theme, TILE_HUES, paletteFor, isVowelGlyph,
    onPlacement: (isCorrect, slotIndex) => {
      setTvMinutes((prev) => {
        if (tvMinutesLock.has(slotIndex)) return prev;
        const delta = scorePlacementDelta(isCorrect);
        const next = clampMinutes(prev + delta);
        saveTvMinutes(profile, next);
        setTvMinutesLock((p) => new Set([...p, slotIndex]));
        return next;
      });
    },
    onAttempt: () => setHasAttempted(true)
  });
  // prefer hook’s computed meta (same value); keep legacy var for compatibility
  const _directionMeta = dirMeta2 || directionMeta;

  // tileColorFor and clusters are provided by the hook

  // tiles/slots managed by hook
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

  // English Mastery System State
  const [masteryData, setMasteryData] = useState(() => loadMasteryData(PROFILES[0]));
  const [activeSet, setActiveSet] = useState(() => loadActiveSet(PROFILES[0]));
  const [progress, setProgress] = useState(() => loadProgress(PROFILES[0]));
  const [undoState, setUndoState] = useState(null);
  const [currentWord, setCurrentWord] = useState(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    function onResize() { setWindowWidth(window.innerWidth); }
    if (typeof window !== 'undefined') window.addEventListener('resize', onResize);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('resize', onResize); };
  }, []);
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
    
    // Load mastery system data for the new profile
    setMasteryData(loadMasteryData(profile));
    setActiveSet(loadActiveSet(profile));
    setProgress(loadProgress(profile));
    setUndoState(null);
    clearUndoState(profile);
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

  // reset round-dependent state on card/target change
  useEffect(() => {
    setHasAttempted(false);
    setTvMinutesLock(new Set());
    setResult(null);
    setLastCorrectWord(null);
    setShowTargetAnswer(false);
    setMicroFeedback(null);
  }, [cardIndex, targetWord, direction]);

  // drag/touch handlers now live in the hook

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
        const next = clampMinutes(prev + scoreRoundDelta(false));
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
        const showRoman = direction !== 'kn-to-hi';
        // Always show the formatted glyph name instead of generic fallback
        setMicroFeedback(formatGlyphName(g, { showRoman }));
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

  // Helper to pick a readable tile background and text color for a word's progress
  function tileBackgroundFor({ wp, accuracy }, themeMode = 'light') {
    // Return object { bg, color }
    // Dark theme mapping: mirror the light pastel semantics using saturated dark variants
    if (wp.mastered) return { bg: themeMode === 'dark' ? '#065f46' : '#dcfce7', color: themeMode === 'dark' ? '#ecfdf5' : '#065f46' };
    // Unattempted: neutral, matches panel tone
    if (!wp.attempts || wp.attempts === 0) return { bg: themeMode === 'dark' ? themeColors.panel : '#f1f5f9', color: themeMode === 'dark' ? '#e6eef6' : '#374151' };
    // Zero accuracy after attempts -> clear red alert
    if (wp.attempts > 0 && accuracy === 0) return { bg: themeMode === 'dark' ? '#881337' : '#fee2e2', color: themeMode === 'dark' ? '#fff' : '#7f1d1d' };
    // Near mastery (streak >= 3): amber/yellow
    if (wp.streak >= 3) return { bg: themeMode === 'dark' ? '#b45309' : '#fef3c7', color: themeMode === 'dark' ? '#fff' : '#92400e' };
    // Some progress (streak >=1): gentle rose/secondary
    if (wp.streak >= 1) return { bg: themeMode === 'dark' ? '#6b213f' : '#fef7ff', color: themeMode === 'dark' ? '#fff' : '#6b213f' };
    // fallback: use glyphColorFor but convert to solid-ish in dark mode for contrast
    const g = glyphColorFor(accuracy, themeMode);
    if (themeMode === 'dark') {
      // Map translucent tints to solid readable backgrounds in dark mode
      if (g.includes('rgba')) return { bg: '#111827', color: '#e6edf3' };
      return { bg: g, color: '#fff' };
    }
    return { bg: g, color: '#111827' };
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
      const next = clampMinutes(prev + scoreRoundDelta(isCorrect));
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
      const next = clampMinutes(prev + scoreRoundDelta(false));
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

  // English Mastery System Logic
  
  // Initialize current word and manage active set creation
  useEffect(() => {
    // Check if we should create an active set
    if (shouldCreateActiveSet(masteryData, activeSet)) {
      const newSetNumber = (progress.setNumber || 0) + 1;
      const newActiveSet = createActiveSet(masteryData, newSetNumber);
      const updatedProgress = {
        ...progress,
        currentSetId: newActiveSet.setId,
        setNumber: newSetNumber,
        totalSets: calculateTotalSets(masteryData),
        masteredCount: 0
      };
      
      setActiveSet(newActiveSet);
      setProgress(updatedProgress);
      saveActiveSet(profile, newActiveSet);
      saveProgress(profile, updatedProgress);
    }
    
    // Set current word
    if (activeSet) {
      // Prefer the next non-mastered word from the active set
      let nextWord = getNextWordFromActiveSet(masteryData, activeSet);
      if (!nextWord) {
        // fallback: find first non-mastered word in activeSet.words
        const candidates = Array.isArray(activeSet.words) ? activeSet.words.filter((w) => { const wp = masteryData[w]; return !(wp && wp.mastered); }) : [];
        if (candidates.length) nextWord = candidates[0];
      }
      if (nextWord) setCurrentWord(nextWord);
      return;
    }

    // No active set exists: create from unmastered words (untested / unknown) or fallback
    const untestedWords = getUntestedWords(masteryData);
    if (untestedWords && untestedWords.length > 0) {
      setCurrentWord(untestedWords[Math.floor(Math.random() * untestedWords.length)]);
      return;
    }
    // final fallback to global list
    const pick = ENGLISH_WORDS[Math.floor(Math.random() * ENGLISH_WORDS.length)];
    setCurrentWord(pick);
  }, [masteryData, activeSet, progress, profile]);

  const engWord = currentWord || ENGLISH_WORDS[0];

  function markEnglish(correct) {
    if (!engWord) return;
    
    const timestamp = Date.now();
    
    // Store undo state
    const undoAction = {
      type: 'markEnglish',
      word: engWord,
      correct,
      oldProgress: masteryData[engWord] ? { ...masteryData[engWord] } : null,
      oldActiveSet: activeSet ? { ...activeSet } : null,
      oldProgressState: { ...progress },
      timestamp
    };
    setUndoState(undoAction);
    saveUndoState(profile, undoAction);
    
    // Clear undo state after timeout
    setTimeout(() => {
      setUndoState(null);
      clearUndoState(profile);
    }, UNDO_TIMEOUT_MS);
    
    // Update word progress
    const oldProgress = masteryData[engWord] || initWordProgress(engWord);
    const newProgress = updateWordProgress(oldProgress, correct, timestamp);
    
    const updatedMasteryData = {
      ...masteryData,
      [engWord]: newProgress
    };
    
    setMasteryData(updatedMasteryData);
    saveMasteryData(profile, updatedMasteryData);
    
    // Update legacy stats for compatibility
    const updated = { ...engStats };
    const stat = updated[engWord] ? { ...updated[engWord] } : { attempts: 0, correct: 0 };
    stat.attempts = (stat.attempts || 0) + 1;
    if (correct) stat.correct = (stat.correct || 0) + 1;
    updated[engWord] = stat;
    setEngStats(updated);
    saveEngStats(profile, updated);
    
    // Scoring: reward reading, small penalty otherwise
    setTvMinutes((prev) => {
      const next = clampMinutes(prev + scoreEnglishDelta(correct));
      saveTvMinutes(profile, next);
      return next;
    });
    
    setResult(correct ? 'correct' : 'incorrect');
    
    // Check if set is completed
    if (activeSet && isActiveSetCompleted(updatedMasteryData, activeSet)) {
      // Auto-advance to next set
      setTimeout(() => {
        advanceToNextSet(updatedMasteryData);
      }, 1000);
    }
  }

  function advanceToNextSet(currentMasteryData) {
    const unknownWords = getUnknownWords(currentMasteryData);
    
    if (unknownWords.length >= 12) {
      // Create next set
      const nextSetNumber = (progress.setNumber || 0) + 1;
      const newActiveSet = createActiveSet(currentMasteryData, nextSetNumber);
      const updatedProgress = {
        ...progress,
        currentSetId: newActiveSet.setId,
        setNumber: nextSetNumber,
        totalSets: calculateTotalSets(currentMasteryData),
        masteredCount: 0
      };
      
      setActiveSet(newActiveSet);
      setProgress(updatedProgress);
      saveActiveSet(profile, newActiveSet);
      saveProgress(profile, updatedProgress);
    } else if (unknownWords.length > 0) {
      // Create smaller final set
      const nextSetNumber = (progress.setNumber || 0) + 1;
      const finalSet = {
        setId: `set_${nextSetNumber}_${Date.now()}`,
        words: unknownWords,
        createdAt: Date.now(),
        setNumber: nextSetNumber
      };
      const updatedProgress = {
        ...progress,
        currentSetId: finalSet.setId,
        setNumber: nextSetNumber,
        totalSets: nextSetNumber,
        masteredCount: 0
      };
      
      setActiveSet(finalSet);
      setProgress(updatedProgress);
      saveActiveSet(profile, finalSet);
      saveProgress(profile, updatedProgress);
    } else {
      // All words mastered!
      setActiveSet(null);
      setProgress({ currentSetId: null, setNumber: 0, totalSets: 0, masteredCount: 0 });
      saveActiveSet(profile, null);
      saveProgress(profile, { currentSetId: null, setNumber: 0, totalSets: 0, masteredCount: 0 });
    }
  }

  function nextEnglish() {
    if (activeSet && Array.isArray(activeSet.words) && activeSet.words.length > 0) {
      // Pick a random word from the current practice set that is NOT mastered
      const candidates = activeSet.words.filter((w) => {
        const wp = masteryData[w];
        return !(wp && wp.mastered);
      });
      if (candidates.length > 0) {
        setCurrentWord(candidates[Math.floor(Math.random() * candidates.length)]);
      } else {
        // All words mastered in this set; fallback to rotation logic
        const nextWord = getNextWordFromActiveSet(masteryData, activeSet);
        if (nextWord) setCurrentWord(nextWord);
      }
    } else {
      // If no active set, pick a random untested word
      const untestedWords = getUntestedWords(masteryData);
      if (untestedWords.length > 0) {
        setCurrentWord(untestedWords[Math.floor(Math.random() * untestedWords.length)]);
      }
    }
    setResult(null);
  }

  // Control functions
  function undoLastTap() {
    if (!undoState || Date.now() - undoState.timestamp > UNDO_TIMEOUT_MS) {
      setUndoState(null);
      clearUndoState(profile);
      return;
    }
    
    // Restore previous state
    if (undoState.oldProgress) {
      const restoredMasteryData = {
        ...masteryData,
        [undoState.word]: undoState.oldProgress
      };
      setMasteryData(restoredMasteryData);
      saveMasteryData(profile, restoredMasteryData);
    } else {
      // Remove the word from mastery data
      const restoredMasteryData = { ...masteryData };
      delete restoredMasteryData[undoState.word];
      setMasteryData(restoredMasteryData);
      saveMasteryData(profile, restoredMasteryData);
    }
    
    // Restore progress and active set
    if (undoState.oldActiveSet) {
      setActiveSet(undoState.oldActiveSet);
      saveActiveSet(profile, undoState.oldActiveSet);
    }
    setProgress(undoState.oldProgressState);
    saveProgress(profile, undoState.oldProgressState);
    
    // Clear undo state
    setUndoState(null);
    clearUndoState(profile);
    setResult(null);
  }

  function resetCurrentSetMastery() {
    if (!activeSet) return;
    
    const resetMasteryData = resetCurrentSet(masteryData, activeSet);
    setMasteryData(resetMasteryData);
    saveMasteryData(profile, resetMasteryData);
    
    // Reset progress for this set
    const updatedProgress = {
      ...progress,
      masteredCount: 0
    };
    setProgress(updatedProgress);
    saveProgress(profile, updatedProgress);
    
    setResult(null);
  }

  function resetAllMasteryProgress() {
    const emptyMasteryData = resetAllMastery();
    setMasteryData(emptyMasteryData);
    saveMasteryData(profile, emptyMasteryData);
    
    // Clear active set and progress
    setActiveSet(null);
    setProgress({ currentSetId: null, setNumber: 0, totalSets: 0, masteredCount: 0 });
    saveActiveSet(profile, null);
    saveProgress(profile, { currentSetId: null, setNumber: 0, totalSets: 0, masteredCount: 0 });
    
    setResult(null);
    setUndoState(null);
    clearUndoState(profile);
  }

  const weakEnglish = useMemo(() => {
    return Object.entries(masteryData)
      .map(([word, wp]) => ({ 
        word, 
        // Prefer legacy engStats (stores correct count) when available for accurate accuracy calculation
        attempts: wp.attempts || 0,
        correct: (engStats && engStats[word] && Number(engStats[word].correct)) ? Number(engStats[word].correct) : 0,
        accuracy: (engStats && engStats[word] && Number(engStats[word].attempts)) ? (Number(engStats[word].correct || 0) / Number(engStats[word].attempts || 1)) : (wp.attempts ? (wp.streak > 0 ? (wp.streak / wp.attempts) : 0) : 1),
        streak: wp.streak,
        mastered: wp.mastered
      }))
      .filter((x) => x.attempts > 0)
      .sort((a, b) => {
        // Mastered words at bottom
        if (a.mastered !== b.mastered) return a.mastered - b.mastered;
        // Then by accuracy (lower first)
        return a.accuracy - b.accuracy;
      })
      .slice(0, 20); // Show more for mastery system
  }, [masteryData]);

  // Progress statistics
  const progressStats = useMemo(() => {
    return getProgressStats(masteryData, activeSet, progress);
  }, [masteryData, activeSet, progress]);

  // Combine active set words and weak English words into a single list for the right panel.
  // Active set words come first; then fill with recent weak words (no duplicates). Limit to ACTIVE_SET_SIZE.
  const rightPanelWords = useMemo(() => {
    const active = activeSet && Array.isArray(activeSet.words) ? activeSet.words : [];
    const weakList = weakEnglish.map(w => w.word);
    const combined = [...active, ...weakList.filter(w => !active.includes(w))].slice(0, ACTIVE_SET_SIZE);
    return combined.map(word => {
      const wp = masteryData[word] || { word, streak: 0, attempts: 0, lastSeen: 0, mastered: false };
      const weakInfo = weakEnglish.find(w => w.word === word) || null;
      return { word, wp, weakInfo, fromActive: active.includes(word) };
    });
  }, [activeSet, weakEnglish, masteryData]);

  // Ensure there's always at least one word to display in English practice.
  const displayPanelData = useMemo(() => {
    // If we have combined panel words, use those
    if (rightPanelWords && rightPanelWords.length) return rightPanelWords.map(({ word, wp }) => ({ word, wp }));

    // Fallback: prefer currentWord, then untested words, then global ENGLISH_WORDS
    const cw = currentWord;
    if (cw) return [{ word: cw, wp: masteryData[cw] || { word: cw, streak: 0, attempts: 0, lastSeen: 0, mastered: false } }];
    const untested = getUntestedWords(masteryData || {});
    if (untested && untested.length) {
      const pick = untested[Math.floor(Math.random() * untested.length)];
      return [{ word: pick, wp: masteryData[pick] || { word: pick, streak: 0, attempts: 0, lastSeen: 0, mastered: false } }];
    }
    // final fallback
    const pick = ENGLISH_WORDS[Math.floor(Math.random() * ENGLISH_WORDS.length)];
    return [{ word: pick, wp: masteryData[pick] || { word: pick, streak: 0, attempts: 0, lastSeen: 0, mastered: false } }];
  }, [rightPanelWords, currentWord, masteryData]);

  // Start/Reset timers per mode (unified 120s timer for all modes)
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    // Keep timers for math and kannada only. English practice uses no timer per new UX.
    if (mode === 'math' || mode === 'kannada') {
      let limit = 120;
      timeLimitRef.current = limit;
      setCurrentTimeLimit(limit);
      if (result) return;
      setTimedOut(false);
      setTimeLeft(limit);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            if (mode === 'math') handleMathTimeout();
            else if (mode === 'kannada') handleKannadaTimeout();
            return 0;
          }
          const next = t - 1;
          if (next > 0 && next <= Math.min(5, timeLimitRef.current)) playBeep(next <= 2 ? 1400 : 950, 0.12);
          return next;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [mode, mathQ, engWord, cardIndex, result]);

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
    if (result === 'correct') {
      playBeep(1568, 0.25);
      // pulse fill briefly
      setFillPulse(true);
      setTimeout(() => setFillPulse(false), 480);
    } else {
      // wrong answer: low beep and shake
      playBeep(220, 0.28);
      setShakeWord(true);
      setTimeout(() => setShakeWord(false), 520);
    }
  }, [result]);

  // Celebrate when a word becomes mastered
  useEffect(() => {
    if (!result) return;
    if (result === 'correct') {
      const w = engWord || '';
      const wp = (masteryData && masteryData[w]) ? masteryData[w] : null;
      if (wp && wp.mastered) {
        // success chime
        playBeep(1760, 0.32);
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 1200);
      }
    }
  }, [result, masteryData, engWord]);

  const timerBadgeStyle = useMemo(() => {
    const background = timeLeft <= 3 ? themeColors.timerCritical : (timeLeft <= 7 ? themeColors.timerWarning : themeColors.timerDefault);
    const color = timeLeft <= 3 ? (theme === 'dark' ? '#fecaca' : '#991b1b') : themeColors.timerText;
    return { background, color };
  }, [timeLeft, themeColors, theme]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shakeWord, setShakeWord] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [fillPulse, setFillPulse] = useState(false);

  return (
    <>
    <style>{`
      @keyframes pulseBadge {0%{transform:scale(1); box-shadow:0 0 0 0 rgba(245,158,11,.45);} 70%{transform:scale(1.03); box-shadow:0 0 0 12px rgba(245,158,11,0);} 100%{transform:scale(1); box-shadow:0 0 0 0 rgba(245,158,11,0);}}
      @keyframes tilePop { 0% { transform: scale(0.96); opacity: 0.95 } 60% { transform: scale(1.03); } 100% { transform: scale(1); opacity: 1 }}
      @keyframes shake { 0% { transform: translateX(0) } 20% { transform: translateX(-10px) } 40% { transform: translateX(8px) } 60% { transform: translateX(-6px) } 80% { transform: translateX(4px) } 100% { transform: translateX(0) }}
      @keyframes celebratePop { 0% { transform: scale(0.96); opacity: 0 } 50% { transform: scale(1.06); opacity: 1 } 100% { transform: scale(1); opacity: 1 }}
  @keyframes confettiFall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1 } 100% { transform: translateY(80vh) rotate(720deg); opacity: 0.9 }}
  @keyframes confettiSwing { 0% { transform: translateX(0) } 50% { transform: translateX(12px) } 100% { transform: translateX(0) }}
  @keyframes sparklePulse { 0% { transform: scale(0.9); opacity: 0 } 50% { transform: scale(1.08); opacity: 1 } 100% { transform: scale(1); opacity: 0 }}
  .word-glow { text-shadow: 0 6px 18px rgba(255,165,85,0.14), 0 2px 8px rgba(0,0,0,0.12); }
  .word-sparkle { position: absolute; width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 12px rgba(255,255,255,0.9); opacity: 0; animation: sparklePulse 1100ms ease forwards; }
      .bonus-badge { animation: pulseBadge 1.2s infinite; }
      .word-shake { animation: shake 520ms cubic-bezier(.36,.07,.19,.97); }
      .word-fill-pulse { transform-origin: center; animation: celebratePop 420ms ease; }
      .confetti { position: absolute; pointer-events: none; left: 0; right: 0; top: 0; bottom: 0; overflow: visible; z-index: 60; }
      .confetti-item { position: absolute; width: 10px; height: 16px; border-radius: 2px; opacity: 0.95; transform-origin: center; animation-name: confettiFall, confettiSwing; animation-duration: 1100ms, 900ms; animation-timing-function: linear, ease-in-out; animation-iteration-count: 1, infinite; }

      /* Rainbow fill and sparkle */
      .rainbow-text { display: inline-block; position: relative; }
      .rainbow-base { color: var(--rainbow-fallback, #111827); }
      .rainbow-overlay { position: absolute; left: 0; top: 0; bottom: 0; overflow: hidden; width: 0%; transition: width 420ms cubic-bezier(.2,.9,.2,1); }
      .rainbow-gradient {
        background: linear-gradient(90deg, #ff4d4d 0%, #ff8a3d 20%, #ffd24d 40%, #4dd08a 60%, #5db3ff 80%, #b98bff 100%);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        display: inline-block;
      }
      .rainbow-glow { filter: drop-shadow(0 8px 28px rgba(120, 86, 255, 0.14)); }
      .rainbow-locked { box-shadow: 0 6px 30px rgba(120,86,255,0.12); border-radius: 6px; }
      .sparkle { position: absolute; left: 50%; top: -12px; transform: translateX(-50%); width: 36px; height: 36px; pointer-events: none; opacity: 0; transition: opacity 360ms ease; }
      .sparkle.visible { opacity: 1; animation: celebratePop 680ms ease; }

      /* Bottom mini-tiles */
      .mini-tiles { display:flex; gap:10px; align-items:center; justify-content:center; padding:12px 8px; }
      .mini-tile { position:relative; width:56px; height:56px; border-radius:999px; display:flex; align-items:center; justify-content:center; font-weight:800; cursor:pointer; user-select:none; box-shadow: 0 6px 20px rgba(2,6,23,0.06); border: 2px solid rgba(0,0,0,0.06); background: var(--mini-bg, rgba(255,255,255,0.9)); }
      .mini-fill { position: absolute; left:0; top:0; bottom:0; overflow:hidden; width:0%; border-radius:999px; display:flex; align-items:center; justify-content:center; }
      .mini-label { position:relative; z-index:2; color: var(--mini-label, #111827); font-size:14px; }
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
                {profiles.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button onClick={addProfile} title="Add learner" style={{ marginLeft: 8, padding: '6px 10px', borderRadius: 8, border: `1px solid ${themeColors.border}`, background: themeColors.control, color: themeColors.textPrimary, cursor: 'pointer', fontWeight: 800 }}>＋</button>
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
              <div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 8 }}>
                  {DIRECTION_OPTIONS && Object.values(DIRECTION_OPTIONS).map((opt) => {
                    const isActive = direction === opt.value;
                    const bg = isActive ? choose('#10b981', 'rgba(16,185,129,0.25)') : themeColors.control;
                    const textColor = isActive ? (theme === 'dark' ? '#d1fae5' : 'white') : themeColors.textPrimary;
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
                {/* Active set quick toggle (compact icon in header) */}
                {mode === 'english' && (
                  <button onClick={() => setDrawerOpen(s => !s)} title={drawerOpen ? 'Hide active set' : 'Show active set'} style={{ marginLeft: 8, width: 44, height: 36, borderRadius: 10, border: `1px solid ${themeColors.border}`, background: themeColors.control, color: themeColors.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    📚
                  </button>
                )}
            </div>
          </div>
          {mode === 'kannada' ? (
            <div style={{ color: themeColors.textMuted }}>Card {cardIndex + 1} / {deck.length}</div>
          ) : mode === 'math' ? (
            <div style={{ color: themeColors.textMuted }}>Math practice</div>
          ) : (
            <div style={{ color: themeColors.textMuted }}>English practice</div>
          )}
        </div>

        <div style={{ background: themeColors.surface, padding: 20, borderRadius: 12, boxShadow: themeColors.elevatedShadow, transition: "background 0.3s ease, box-shadow 0.3s ease" }}>
          {mode === 'kannada' ? (
            <div style={{ height: 0 }} />
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
                // ENGLISH SIMPLIFIED PRACTICE UI
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, marginBottom: 8 }}>
                  <div style={{ fontSize: 20, color: themeColors.textMuted, fontWeight: 700 }}>Read the word</div>
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 260 }}>
                    {/* Prominent single-word display with progressive color fill */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', maxWidth: windowWidth > 1400 ? '1200px' : '100%', padding: '18px 12px' }}>
                      <div aria-live="polite" style={{ position: 'relative', display: 'inline-block', lineHeight: 1 }}>
                          {(() => {
                          const w = engWord || '';
                          const wp = (masteryData && masteryData[w]) ? masteryData[w] : { streak: 0, attempts: 0 };
                          const streak = Math.max(0, Math.min(MASTERY_STREAK_REQUIRED || 5, wp.streak || 0));
                          const pct = Math.round((streak / (MASTERY_STREAK_REQUIRED || 5)) * 100);
                          const baseStyle = { display: 'inline-block', fontSize: 'clamp(48px, 10vw, 140px)', fontWeight: 900, letterSpacing: 1, padding: '6px 8px', lineHeight: 1 };
                          const isMastered = streak >= (MASTERY_STREAK_REQUIRED || 5);
                          return (
                            <div className="rainbow-text" style={{ position: 'relative', display: 'inline-block', textAlign: 'center' }}>
                              <div className="rainbow-base large-word" style={{ ...baseStyle, color: themeColors.textMuted }}>{w}</div>
                              <div className={`rainbow-overlay ${celebrate ? 'rainbow-locked rainbow-glow' : ''}`} style={{ width: `${pct}%` }} aria-hidden>
                                <div className="rainbow-gradient large-word" style={{ ...baseStyle }}>{w}</div>
                              </div>
                              <div className={`sparkle ${celebrate ? 'visible' : ''}`} aria-hidden>
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l1.8 4.6L18.8 8l-4 2.8L13.6 16 12 13l-1.6 3-1.2-5.2L5 8l4.2-1.4L12 2z" fill="#fff" opacity="0.9"/></svg>
                              </div>
                              {celebrate && (
                                <>
                                  <div className="confetti" aria-hidden>
                                    {['#ff6b6b','#ffd166','#8ce99a','#74c0fc','#b197fc','#ffb4c6'].map((c, i) => {
                                      const left = 8 + i * 12 + (i % 2 === 0 ? 0 : 6);
                                      const delay = i * 80;
                                      const style = { left: `${left}%`, top: '-10vh', background: c, animationDelay: `${delay}ms, ${delay + 60}ms`, transform: `translateX(${(i % 2 === 0 ? -6 : 6)}px)` };
                                      return <div key={`cf-${i}`} className="confetti-item" style={style} />;
                                    })}
                                  </div>
                                  {isMastered && (
                                    <>
                                      <div className="word-sparkle" style={{ right: '-6px', top: '-12px', background: '#fff9c4' }} />
                                      <div className="word-sparkle" style={{ left: '6px', top: '-18px', background: '#ffe1ff', animationDelay: '120ms' }} />
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      {/* Bottom mirrored mini-tiles showing active set progress (always visible) */}
                      <div style={{ marginTop: 18 }}>
                        <div className="mini-tiles" role="list" aria-label="Active set progress">
                          {(() => {
                            // Prefer explicit activeSet words; otherwise use rightPanelWords or fall back to ENGLISH_WORDS
                            const sourceWords = (activeSet && Array.isArray(activeSet.words) && activeSet.words.length)
                              ? activeSet.words
                              : (rightPanelWords && rightPanelWords.length ? rightPanelWords.map(r => r.word) : ENGLISH_WORDS.slice(0, ACTIVE_SET_SIZE));
                            return sourceWords.slice(0, ACTIVE_SET_SIZE).map((w) => {
                              const pct = Math.round(((masteryData[w]?.streak || 0) / (MASTERY_STREAK_REQUIRED || 5)) * 100);
                              return (
                                <div key={w} className="mini-tile" role="listitem" onClick={() => { setCurrentWord(w); setResult(null); }} title={`Practice ${w}`}>
                                  <div className="mini-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #ff4d4d 0%, #ff8a3d 20%, #ffd24d 40%, #4dd08a 60%, #5db3ff 80%, #b98bff 100%)' }} aria-hidden></div>
                                  <div className="mini-label">{w}</div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action buttons: centered and larger, immediately under the word */}
                    <div style={{ marginTop: 18, width: '100%', display: 'flex', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', gap: 18, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => { markEnglish(true); playBeep(1568, 0.16); nextEnglish(); }} style={{ padding: '18px 34px', background: '#10b981', color: 'white', border: 'none', borderRadius: 16, cursor: 'pointer', fontWeight: 900, fontSize: 22, boxShadow: '0 12px 30px rgba(16,185,129,0.14)' }} onMouseDown={(e)=>e.currentTarget.style.transform='translateY(2px)'} onMouseUp={(e)=>e.currentTarget.style.transform='translateY(0)'} onMouseLeave={(e)=>e.currentTarget.style.transform='translateY(0)'}>She read it</button>
                        <button type="button" onClick={() => { markEnglish(false); playBeep(330, 0.18); nextEnglish(); }} style={{ padding: '18px 34px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 16, cursor: 'pointer', fontWeight: 900, fontSize: 22, boxShadow: '0 12px 30px rgba(239,68,68,0.12)' }} onMouseDown={(e)=>e.currentTarget.style.transform='translateY(2px)'} onMouseUp={(e)=>e.currentTarget.style.transform='translateY(0)'} onMouseLeave={(e)=>e.currentTarget.style.transform='translateY(0)'}>Couldn't read</button>
                      </div>
                    </div>
                  </div>
                </div>
          )}

          <div>
            <div style={{ display: 'block', gap: 18, alignItems: 'start' }}>
              <div style={{ width: '100%' }}>

              {mode === 'kannada' ? (
                <KannadaRound
                  promptWord={promptWord || (direction === 'hi-to-kn' ? (card.transliterationHi || card.transliteration || '') : card.wordKannada || '')}
                  directionMeta={directionMeta}
                  showTargetAnswer={showTargetAnswer}
                  setShowTargetAnswer={setShowTargetAnswer}
                  targetWord={targetWord}
                  timerBadgeStyle={timerBadgeStyle}
                  timeLeft={timeLeft}
                  tiles={tiles}
                  onDragStart={onDragStart}
                  placeTileToFirstEmpty={placeTileToFirstEmpty}
                  slots={slots}
                  onDragOverSlot={onDragOverSlot}
                  onDropToSlot={onDropToSlot}
                  returnSlotToPool={returnSlotToPool}
                  choose={choose}
                  themeColors={themeColors}
                  handleSubmit={handleSubmit}
                  result={result}
                  microFeedback={microFeedback}
                  handleNext={handleNext}
                  timedOut={timedOut}
                  onSelectWord={selectedCard => {
                    const idx = deck.findIndex(c => c.id === selectedCard.id);
                    if (idx !== -1) setCardIndex(idx);
                  }}
                />
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
                  {/* Progress indicators removed per UX request to simplify English practice UI */}

                  {/* (removed inline word progress strip for a cleaner UI) */}

                  {/* Main practice screen — primary actions and progress indicators are intentionally minimal. Legend and detailed status live in the Active Set drawer. */}

                  {/* Bottom active-set / weak-words strip removed to keep learner focus on the central word */}

                  {/* Control buttons */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                    {undoState && Date.now() - undoState.timestamp <= UNDO_TIMEOUT_MS && (
                      <button type="button" onClick={undoLastTap} style={{ padding: '8px 16px', background: '#fbbf24', color: '#92400e', border: '1px solid #d97706', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                        Undo last tap ({Math.ceil((UNDO_TIMEOUT_MS - (Date.now() - undoState.timestamp)) / 1000)}s)
                      </button>
                    )}
                  </div>
                </>
              )}
              </div>

              {/* Right panel removed — reclaimed space for larger responsive grid */}

            </div>
            {/* right-side drawer removed - active set is now inline below the word */}
            </div>
        </div>
      </div>
    </div>
    {/* Persistent small footer for learner goal (non-intrusive) */}
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 8, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ pointerEvents: 'auto', background: themeColors.surfaceSubtle, padding: '6px 12px', borderRadius: 999, fontSize: 12, color: themeColors.textMuted, boxShadow: themeColors.softShadow, border: `1px solid ${themeColors.softBorder}` }}>Goal: fully color each word by getting it correct {MASTERY_STREAK_REQUIRED} times</div>
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
                  <button type="button" onClick={() => { resetAllMasteryProgress(); localStorage.removeItem(engStatsKeyFor(profile)); setEngStats({}); }} style={{ padding: '8px 12px', background: '#fee2e2', color: '#7f1d1d', border: '1px solid #fecaca', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>Reset {profile}'s English mastery</button>
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
