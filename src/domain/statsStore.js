import { BASE_STATS_KEY, TV_BASE_KEY } from "../data";

// Key helpers
export function tvKeyFor(profile) { return `${TV_BASE_KEY}::${profile}`; }
export function glyphKeyFor(script, profile) {
  const suffix = script === 'hi' ? '_hi_v1' : '_v1';
  return `${BASE_STATS_KEY}${suffix}::${profile}`;
}
export function mathKeyFor(profile) { return `${BASE_STATS_KEY}_math_v1::${profile}`; }
export function engKeyFor(profile) { return `${BASE_STATS_KEY}_eng_v1::${profile}`; }

// TV minutes
export function loadTvMinutes(profile) {
  try { const raw = localStorage.getItem(tvKeyFor(profile)); return raw ? Number(raw) : 0; } catch { return 0; }
}
export function saveTvMinutes(profile, minutes) {
  try { localStorage.setItem(tvKeyFor(profile), String(minutes)); } catch {}
}

// Glyph stats (per script)
export function loadGlyphStats(profile, script = 'kn') {
  try { const raw = localStorage.getItem(glyphKeyFor(script, profile)); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
export function saveGlyphStats(profile, stats, script = 'kn') {
  try { localStorage.setItem(glyphKeyFor(script, profile), JSON.stringify(stats)); } catch {}
}

// Math stats
export function loadMathStats(profile) { try { const raw = localStorage.getItem(mathKeyFor(profile)); return raw ? JSON.parse(raw) : {}; } catch { return {}; } }
export function saveMathStats(profile, stats) { try { localStorage.setItem(mathKeyFor(profile), JSON.stringify(stats)); } catch {} }

// English stats
export function loadEngStats(profile) { try { const raw = localStorage.getItem(engKeyFor(profile)); return raw ? JSON.parse(raw) : {}; } catch { return {}; } }
export function saveEngStats(profile, stats) { try { localStorage.setItem(engKeyFor(profile), JSON.stringify(stats)); } catch {} }

