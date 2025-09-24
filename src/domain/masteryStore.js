/**
 * English Word Mastery System Storage
 * 
 * Data structures:
 * - Word progress: { word: string, streak: number, attempts: number, lastSeen: timestamp, mastered: boolean }
 * - Active set: { setId: string, words: string[], createdAt: timestamp }
 * - Progress: { currentSetId: string, setNumber: number, totalSets: number, masteredCount: number }
 * - Undo state: { action: object, timestamp: number }
 */

import { BASE_STATS_KEY } from "../data";

// Storage keys
export function masteryKeyFor(profile) { return `${BASE_STATS_KEY}_mastery_v1::${profile}`; }
export function activeSetKeyFor(profile) { return `${BASE_STATS_KEY}_active_set_v1::${profile}`; }
export function progressKeyFor(profile) { return `${BASE_STATS_KEY}_progress_v1::${profile}`; }
export function undoKeyFor(profile) { return `${BASE_STATS_KEY}_undo_v1::${profile}`; }

// Word mastery progress storage
export function loadMasteryData(profile) {
  try {
    const raw = localStorage.getItem(masteryKeyFor(profile));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveMasteryData(profile, data) {
  try {
    localStorage.setItem(masteryKeyFor(profile), JSON.stringify(data));
  } catch { }
}

// Active set storage
export function loadActiveSet(profile) {
  try {
    const raw = localStorage.getItem(activeSetKeyFor(profile));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveActiveSet(profile, activeSet) {
  try {
    localStorage.setItem(activeSetKeyFor(profile), JSON.stringify(activeSet));
  } catch { }
}

// Progress tracking storage
export function loadProgress(profile) {
  try {
    const raw = localStorage.getItem(progressKeyFor(profile));
    return raw ? JSON.parse(raw) : { currentSetId: null, setNumber: 0, totalSets: 0, masteredCount: 0 };
  } catch {
    return { currentSetId: null, setNumber: 0, totalSets: 0, masteredCount: 0 };
  }
}

export function saveProgress(profile, progress) {
  try {
    localStorage.setItem(progressKeyFor(profile), JSON.stringify(progress));
  } catch { }
}

// Undo state storage
export function loadUndoState(profile) {
  try {
    const raw = localStorage.getItem(undoKeyFor(profile));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUndoState(profile, undoState) {
  try {
    localStorage.setItem(undoKeyFor(profile), JSON.stringify(undoState));
  } catch { }
}

export function clearUndoState(profile) {
  try {
    localStorage.removeItem(undoKeyFor(profile));
  } catch { }
}