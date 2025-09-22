// Kannada Flashcards — first good version
// - Gate hints until an attempt
// - Single-step next-character hints (max 2 per word)
// - Mark hinted glyphs as assisted in stats
// - Live TV-minute incentive awarded/penalized on tile placement
import React, { useEffect, useMemo, useRef, useState } from "react";

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

const BASE_STATS_KEY = "kannada_glyph_stats_v1";
const PROFILES = ["Mishika", "Akshay"];
const TV_BASE_KEY = "kannada_tv_minutes_v1";

// Canonical deck (corrected Kannada spellings + Hindi transliterations)
const RAW_CARDS = [
  { id: "rama", wordKannada: "ರಾಮ", transliteration: "Rāma", transliterationHi: "राम" },
  { id: "seeta", wordKannada: "ಸೀತಾ", transliteration: "Sītā", transliterationHi: "सीता" },
  { id: "lakshmana", wordKannada: "ಲಕ್ಷ್ಮಣ", transliteration: "Lakṣmaṇa", transliterationHi: "लक्ष्मण" },
  { id: "bharata", wordKannada: "ಭರತ", transliteration: "Bharata", transliterationHi: "भरत" },
  { id: "shatrughna", wordKannada: "ಶತ್ರುಘ್ನ", transliteration: "Śatrughna", transliterationHi: "शत्रुघ्न" },
  { id: "dasharatha", wordKannada: "ದಶರಥ", transliteration: "Daśaratha", transliterationHi: "दशरथ" },
  { id: "kausalyaa", wordKannada: "ಕೌಸಲ್ಯಾ", transliteration: "Kausalyā", transliterationHi: "कौसल्या" },
  { id: "kaikeyii", wordKannada: "ಕೈಕೇಯೀ", transliteration: "Kaikeyī", transliterationHi: "कैकेयी" },
  { id: "sumitra", wordKannada: "ಸುಮಿತ್ರ", transliteration: "Sumitrā", transliterationHi: "सुमित्रा" },
  { id: "janaka", wordKannada: "ಜನಕ", transliteration: "Janaka", transliterationHi: "जनक" },
  { id: "vishvamitra", wordKannada: "ವಿಶ್ವಾಮಿತ್ರ", transliteration: "Viśvāmitra", transliterationHi: "विश्वामित्र" },
  { id: "agastya", wordKannada: "ಅಗಸ್ತ್ಯ", transliteration: "Agastya", transliterationHi: "अगस्त्य" },
  { id: "hanuman", wordKannada: "ಹನುಮಾನ", transliteration: "Hanumān", transliterationHi: "हनुमान" },
  { id: "sugreeva", wordKannada: "ಸುಗ್ರೀವ", transliteration: "Sugrīva", transliterationHi: "सुग्रीव" },
  { id: "vali", wordKannada: "ವಾಲೀ", transliteration: "Vālī", transliterationHi: "वाली" },
  { id: "jambavan", wordKannada: "ಜಾಂಬವಾನ್", transliteration: "Jāmbavān", transliterationHi: "जाम्भवान" },
  { id: "angada", wordKannada: "ಅಂಗದ", transliteration: "Aṅgada", transliterationHi: "अंगद" },
  { id: "vibhishana", wordKannada: "ವಿಭೀಷಣ", transliteration: "Vibhīṣaṇa", transliterationHi: "विभीषण" },
  { id: "ravana", wordKannada: "ರಾವಣ", transliteration: "Rāvaṇa", transliterationHi: "रावण" },
  { id: "mandodari", wordKannada: "ಮಂದೋದರೀ", transliteration: "Mandodarī", transliterationHi: "मंदोदरी" },
  { id: "meghanada", wordKannada: "ಮೇಘನಾದ", transliteration: "Meghanāda", transliterationHi: "मेघनाद" },
  { id: "indrajit", wordKannada: "ಇಂದ್ರಜಿತ್", transliteration: "Indrajit", transliterationHi: "इंद्रजित" },
  { id: "kumbhakarna", wordKannada: "ಕುಂಭಕರ್ಣ", transliteration: "Kumbhakarṇa", transliterationHi: "कुंभकर्ण" },
  { id: "shurpanakha", wordKannada: "ಶೂರ್ಪಣಖಾ", transliteration: "Śūrpaṇakhā", transliterationHi: "शूर्पणखा" },
  { id: "maricha", wordKannada: "ಮಾರೀಚ", transliteration: "Mārīca", transliterationHi: "मारिच" },
  { id: "tadaka", wordKannada: "ತಾಡಕಾ", transliteration: "Tāḍakā", transliterationHi: "ताड़का" },
  { id: "ahilya", wordKannada: "ಅಹಿಲ್ಯಾ", transliteration: "Ahalyā", transliterationHi: "अहल्या" },
  { id: "gautama", wordKannada: "ಗೌತಮ", transliteration: "Gautama", transliterationHi: "गौतम" },
  { id: "jatayu", wordKannada: "ಜಟಾಯು", transliteration: "Jaṭāyu", transliterationHi: "जटायु" },
  { id: "sampati", wordKannada: "ಸಂಪಾತೀ", transliteration: "Sampātī", transliterationHi: "संपाती" },
  { id: "nala", wordKannada: "ನಲ", transliteration: "Nala", transliterationHi: "नल" },
  { id: "nila", wordKannada: "ನೀಲ", transliteration: "Nīla", transliterationHi: "नील" },
  { id: "lava", wordKannada: "ಲವ", transliteration: "Lava", transliterationHi: "लव" },
  { id: "kusha", wordKannada: "ಕುಶ", transliteration: "Kusha", transliterationHi: "कुश" },
  { id: "urmila", wordKannada: "ಉರ್ಮಿಲಾ", transliteration: "Urmila", transliterationHi: "उर्मिला" },
  { id: "mandavi", wordKannada: "ಮಾಂಡವೀ", transliteration: "Mandavi", transliterationHi: "मांडवी" },
  { id: "shrutakirti", wordKannada: "ಶ್ರುತಕೀರ್ತಿ", transliteration: "Shrutakirti", transliterationHi: "श्रुतकीर्ति" },
  { id: "vashistha", wordKannada: "ವಶಿಷ್ಠ", transliteration: "Vashistha", transliterationHi: "वशिष्ठ" },
  { id: "vishrava", wordKannada: "ವಿಶ್ರವ", transliteration: "Vishrava", transliterationHi: "विश्रव" },
  { id: "narada", wordKannada: "ನಾರದ", transliteration: "Narada", transliterationHi: "नारद" },
  { id: "valmiki", wordKannada: "ವಾಲ್ಮೀಕಿ", transliteration: "Valmiki", transliterationHi: "वाल्मीकि" },
  { id: "garuda", wordKannada: "ಗರುಡ", transliteration: "Garuda", transliterationHi: "गरुड़" },
  { id: "khara", wordKannada: "ಖರ", transliteration: "Khara", transliterationHi: "खर" },
  { id: "dushana", wordKannada: "ದೂಷಣ", transliteration: "Dushana", transliterationHi: "दूषण" },
  { id: "trishira", wordKannada: "ತ್ರಿಶಿರಾ", transliteration: "Trishira", transliterationHi: "त्रिशिरा" },
  { id: "akampana", wordKannada: "ಅಕಂಪನ", transliteration: "Akampana", transliterationHi: "अकंपन" },
  { id: "atikaya", wordKannada: "ಅतಿಕಾಯ", transliteration: "Atikaya", transliterationHi: "अतिकाय" },
  { id: "prahasta", wordKannada: "ಪ್ರಹಸ್ತ", transliteration: "Prahasta", transliterationHi: "प्रहस्त" },
  { id: "kabandha", wordKannada: "ಕಬಂಧ", transliteration: "Kabandha", transliterationHi: "कबन्ध" },
  { id: "mandhara", wordKannada: "ಮಂಥರಾ", transliteration: "Mandhara", transliterationHi: "मंथरा" },
  { id: "tara", wordKannada: "ತಾರಾ", transliteration: "Tara", transliterationHi: "तारा" },
];

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

export default function App() {
  const [profile, setProfile] = useState(PROFILES[0]);
  const [mode, setMode] = useState("arrange"); // 'arrange' | 'mcq'

  // build sanitized deck on first render
  const [deck, setDeck] = useState(() => {
    const sanitized = RAW_CARDS.map((card) => {
      const s = sanitizeKannada(card.wordKannada);
      if (s !== card.wordKannada) console.warn("Sanitized Kannada for:", card.id, { original: card.wordKannada, sanitized: s });
      return { ...card, wordKannada: s };
    });
    return shuffleArray(sanitized);
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

  const [glyphStats, setGlyphStats] = useState(() => loadGlyphStats(PROFILES[0]));
  const [tvMinutes, setTvMinutes] = useState(() => loadTvMinutes(PROFILES[0]));
  // track which slot indices have already been scored this round to avoid double-counting
  const [tvMinutesLock, setTvMinutesLock] = useState(() => new Set());

  // controlled "More" dropdown
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef(null);

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
    setTvMinutes(loadTvMinutes(profile));
  }, [profile]);

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
      const delta = tile.g === correctGlyph ? 1 : -1; // minutes
      const next = prev + delta;
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
      const delta = tile.g === correctGlyph ? 1 : -1;
      const next = prev + delta;
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
    setResult(assembled === expected ? "correct" : "incorrect");
  }

  function handleReset() {
    const base = clusters.map((g, i) => ({ g, idx: i, c: colors[i] }));
    setTiles(shuffleArray(base));
    setSlots(new Array(clusters.length).fill(null));
    setResult(null);
    setHintVisible(false);
    setHasAttempted(false);
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

  return (
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
              <label style={{ marginRight: 8, color: "#6b7280", fontWeight: 700 }}>Mode:</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8 }}>
                <option value="arrange">Arrange</option>
                <option value="mcq">Multiple choice</option>
              </select>
            </div>
            <div style={{ background: "#f3f4f6", padding: "6px 10px", borderRadius: 8, fontWeight: 700 }} title="Allowed TV minutes based on practice">TV: {tvMinutes} min</div>
          </div>
          <div style={{ color: "#6b7280" }}>Card {cardIndex + 1} / {deck.length}</div>
        </div>

        <div style={{ background: "white", padding: 20, borderRadius: 12, boxShadow: "0 12px 40px rgba(12,20,40,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 34, fontWeight: 900 }}>{card.transliterationHi || card.transliteration}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, color: "#6b7280" }}>Arrange the word for</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{card.transliterationHi ? "" : card.transliteration}</div>
            </div>
          </div>

          {mode === "arrange" ? (
            <div style={{ display: "flex", gap: 18 }}>
              <div style={{ flex: 1 }}>

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
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button onClick={handleSubmit} style={{ padding: "10px 18px", background: "#10b981", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 800 }}>Submit</button>
                <button onClick={() => showHint()} disabled={!hasAttempted || hintsUsed >= 2} title={!hasAttempted ? "Place at least one tile first to enable hint" : hintsUsed >= 2 ? "No hints remaining for this word" : `Hints used: ${hintsUsed}/2`} style={{ padding: "10px 14px", background: "#fef3c7", border: "none", borderRadius: 10, cursor: !hasAttempted || hintsUsed >= 2 ? "not-allowed" : "pointer", fontWeight: 700, opacity: !hasAttempted ? 0.6 : 1 }}>{`Hint (${2 - hintsUsed} left)`}</button>

                <div style={{ position: "relative" }} ref={moreRef}>
                  <button onClick={() => setShowMore((s) => !s)} aria-expanded={showMore} style={{ listStyle: "none", padding: "10px 14px", borderRadius: 10, background: "#eef2ff", cursor: "pointer", fontWeight: 700 }}>More ▾</button>
                  {showMore && (
                    <div style={{ position: "absolute", right: 0, marginTop: 8, padding: 12, background: "white", borderRadius: 10, boxShadow: "0 10px 40px rgba(12,20,40,0.08)", minWidth: 160 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <button onClick={() => { handleReset(); setShowMore(false); }} style={{ padding: "10px 12px", borderRadius: 8, background: "#fff", border: "1px solid #e6e6e6", cursor: "pointer", textAlign: "left" }}>Reset tiles</button>
                        <button onClick={() => { handleReshuffle(); setShowMore(false); }} style={{ padding: "10px 12px", borderRadius: 8, background: "#fff", border: "1px solid #e6e6e6", cursor: "pointer", textAlign: "left" }}>Reshuffle deck</button>
                      </div>
                    </div>
                  )}
                </div>

                {result === "correct" && <button onClick={handleNext} style={{ padding: "10px 16px", background: "#bfdbfe", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 800 }}>Next</button>}
                {result === "correct" && <div style={{ marginLeft: 6, color: "#166534", fontWeight: 800 }}>✅ Correct</div>}
                {result === "incorrect" && <div style={{ marginLeft: 6, color: "#b91c1c", fontWeight: 800 }}>❌ Incorrect — try again</div>}
              </div>
              </div>

              {/* Right panel */}
              <aside style={{ width: 320 }}>
              <div style={{ padding: 14, borderRadius: 12, background: "white", boxShadow: "0 6px 24px rgba(12,20,40,0.04)" }}>
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

              </div>
              </aside>
            </div>
          ) : (
            // MCQ mode: show Kannada glyph and multiple Hindi options
            <div style={{ display: "flex", gap: 18 }}>
              <div style={{ flex: 1 }}>
                <MCQQuestion
                  card={card}
                  deck={deck}
                  onAnswer={(isCorrect, glyph) => {
                    // immediate scoring: tv minutes and glyph stats
                    setTvMinutes((prev) => {
                      const delta = isCorrect ? 1 : -1;
                      const next = prev + delta;
                      saveTvMinutes(profile, next);
                      return next;
                    });

                    // update per-glyph stats for the Kannada glyph
                    const updated = { ...glyphStats };
                    const key = glyph;
                    const stat = updated[key] ? { ...updated[key] } : { attempts: 0, correct: 0 };
                    stat.attempts = (stat.attempts || 0) + 1;
                    if (isCorrect) stat.correct = (stat.correct || 0) + 1;
                    updated[key] = stat;
                    setGlyphStats(updated);
                    saveGlyphStats(profile, updated);

                    // advance to next card
                    setCardIndex((ci) => (ci + 1) % deck.length);
                  }}
                />

              </div>

              {/* Right panel */}
              <aside style={{ width: 320 }}>
                <div style={{ padding: 14, borderRadius: 12, background: "white", boxShadow: "0 6px 24px rgba(12,20,40,0.04)" }}>
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
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function MCQQuestion({ card, deck, onAnswer }) {
  // pick a single Kannada kernel glyph from the word that we can map to Devanagari
  const codepoints = Array.from(card.wordKannada || "");
  let kernel = null;
  for (const cp of codepoints) {
    if (KAN_TO_HI[cp]) {
      kernel = cp;
      break;
    }
  }

  // if we found a kernel mapping, quiz that single glyph; otherwise fall back to whole-word transliteration
  const correct = kernel ? KAN_TO_HI[kernel] : (card.transliterationHi || card.transliteration);

  // build distractors: if kernel mode, use other mapped Devanagari letters; else use other card transliterations
  let others = [];
  if (kernel) {
    others = Object.values(KAN_TO_HI).filter((v) => v !== correct);
  } else {
    others = deck.map((c) => c.transliterationHi || c.transliteration).filter((t) => t !== correct);
  }

  const opts = shuffleArray([correct, ...shuffleArray(others).slice(0, 3)]).slice(0, 4);
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(false);

  function choose(opt) {
    if (locked) return;
    setSelected(opt);
    setLocked(true);
    const isCorrect = opt === correct;
    // return the Kannada glyph we quizzed (kernel or first codepoint fallback)
    const returnedGlyph = kernel ? kernel : (Array.from(card.wordKannada || "")[0] || "");
    setTimeout(() => onAnswer(isCorrect, returnedGlyph), 300);
  }

  return (
    <div style={{ background: "white", padding: 20, borderRadius: 12, boxShadow: "0 12px 40px rgba(12,20,40,0.06)" }}>
      <div style={{ fontSize: 48, fontWeight: 900, marginBottom: 18 }}>{kernel ? kernel : card.wordKannada}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        {opts.map((o) => (
          <button key={o} onClick={() => choose(o)} disabled={locked} style={{ padding: 14, borderRadius: 10, border: selected === o ? "2px solid #10b981" : "1px solid #e6e6e6", background: selected === o ? "#dcfce7" : "white", cursor: locked ? "not-allowed" : "pointer", fontSize: 18 }}>{o}</button>
        ))}
      </div>
    </div>
  );
}
