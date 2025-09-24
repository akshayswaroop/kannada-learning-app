/**
 * English Word Mastery Logic
 * 
 * Core logic for managing word sets, streaks, mastery progression, and rotation.
 */

import { ENGLISH_WORDS } from "../data";

// Constants
export const MASTERY_STREAK_REQUIRED = 5;
export const ACTIVE_SET_SIZE = 12;
export const UNDO_TIMEOUT_MS = 5000;

/**
 * Initialize word progress for a new word
 */
export function initWordProgress(word) {
  return {
    word,
    streak: 0,
    attempts: 0,
    lastSeen: 0,
    mastered: false
  };
}

/**
 * Update word progress after an attempt
 */
export function updateWordProgress(wordProgress, correct, timestamp = Date.now()) {
  const updated = { ...wordProgress };
  updated.attempts += 1;
  updated.lastSeen = timestamp;

  if (correct) {
    updated.streak += 1;
    if (updated.streak >= MASTERY_STREAK_REQUIRED) {
      updated.mastered = true;
    }
  } else {
    updated.streak = 0;
  }

  return updated;
}

/**
 * Get all unknown words (not mastered and attempted)
 */
export function getUnknownWords(masteryData) {
  return Object.values(masteryData)
    .filter(wp => !wp.mastered && wp.attempts > 0)
    .map(wp => wp.word);
}

/**
 * Get all words that have never been attempted
 */
export function getUntestedWords(masteryData) {
  const attemptedWords = new Set(Object.keys(masteryData));
  return ENGLISH_WORDS.filter(word => !attemptedWords.has(word));
}

/**
 * Check if we should create a new active set
 */
export function shouldCreateActiveSet(masteryData, activeSet) {
  if (activeSet) return false; // Already have an active set

  const unknownWords = getUnknownWords(masteryData);
  return unknownWords.length >= ACTIVE_SET_SIZE;
}

/**
 * Create a new active set from unknown words
 */
export function createActiveSet(masteryData, setNumber = 1) {
  const unknownWords = getUnknownWords(masteryData);
  const wordsToTake = Math.min(unknownWords.length, ACTIVE_SET_SIZE);
  const setWords = unknownWords.slice(0, wordsToTake);

  return {
    setId: `set_${setNumber}_${Date.now()}`,
    words: setWords,
    createdAt: Date.now(),
    setNumber
  };
}

/**
 * Check if current active set is completed (all words mastered)
 */
export function isActiveSetCompleted(masteryData, activeSet) {
  if (!activeSet) return false;

  return activeSet.words.every(word => {
    const progress = masteryData[word];
    return progress && progress.mastered;
  });
}

/**
 * Get next word from active set using weighted rotation
 * Prioritizes: 1) Lower streaks, 2) Older lastSeen times
 */
export function getNextWordFromActiveSet(masteryData, activeSet) {
  if (!activeSet || activeSet.words.length === 0) return null;

  // Filter out mastered words
  const availableWords = activeSet.words.filter(word => {
    const progress = masteryData[word];
    return !progress || !progress.mastered;
  });

  if (availableWords.length === 0) return null;

  // Sort by streak (ascending), then by lastSeen (ascending, older first)
  const sortedWords = availableWords
    .map(word => {
      const progress = masteryData[word] || initWordProgress(word);
      return { word, progress };
    })
    .sort((a, b) => {
      // First by streak (lower streaks first)
      if (a.progress.streak !== b.progress.streak) {
        return a.progress.streak - b.progress.streak;
      }
      // Then by lastSeen (older first, 0 means never seen)
      if (a.progress.lastSeen !== b.progress.lastSeen) {
        return a.progress.lastSeen - b.progress.lastSeen;
      }
      // Finally by word alphabetically for consistency
      return a.word.localeCompare(b.word);
    });

  // Weight selection toward lower streaks
  const lowStreakWords = sortedWords.filter(({ progress }) => progress.streak <= 1);
  const mediumStreakWords = sortedWords.filter(({ progress }) => progress.streak >= 2 && progress.streak <= 3);
  const highStreakWords = sortedWords.filter(({ progress }) => progress.streak >= 4);

  // 60% chance for low streak, 30% for medium, 10% for high
  const rand = Math.random();
  let selectedGroup;

  if (rand < 0.6 && lowStreakWords.length > 0) {
    selectedGroup = lowStreakWords;
  } else if (rand < 0.9 && mediumStreakWords.length > 0) {
    selectedGroup = mediumStreakWords;
  } else if (highStreakWords.length > 0) {
    selectedGroup = highStreakWords;
  } else {
    selectedGroup = sortedWords; // Fallback
  }

  // Return the first word from selected group (already sorted by priority)
  return selectedGroup[0]?.word || sortedWords[0]?.word;
}

/**
 * Get current progress statistics
 */
export function getProgressStats(masteryData, activeSet, progress) {
  if (!activeSet) {
    return {
      hasActiveSet: false,
      setNumber: 0,
      totalSets: 0,
      masteredInSet: 0,
      totalInSet: 0,
      totalMastered: Object.values(masteryData).filter(wp => wp.mastered).length,
      totalAttempted: Object.keys(masteryData).length
    };
  }

  const masteredInSet = activeSet.words.filter(word => {
    const wp = masteryData[word];
    return wp && wp.mastered;
  }).length;

  return {
    hasActiveSet: true,
    setNumber: progress.setNumber || 1,
    totalSets: progress.totalSets || 1,
    masteredInSet,
    totalInSet: activeSet.words.length,
    totalMastered: Object.values(masteryData).filter(wp => wp.mastered).length,
    totalAttempted: Object.keys(masteryData).length
  };
}

/**
 * Calculate estimated total number of sets needed
 */
export function calculateTotalSets(masteryData) {
  const unknownCount = getUnknownWords(masteryData).length;
  const untestedCount = getUntestedWords(masteryData).length;
  const totalWordsNeedingSets = unknownCount + untestedCount;
  return Math.ceil(totalWordsNeedingSets / ACTIVE_SET_SIZE);
}

/**
 * Reset current active set (clear streaks and mastery for set words only)
 */
export function resetCurrentSet(masteryData, activeSet) {
  if (!activeSet) return masteryData;

  const updated = { ...masteryData };
  activeSet.words.forEach(word => {
    if (updated[word]) {
      updated[word] = {
        ...updated[word],
        streak: 0,
        mastered: false
      };
    }
  });

  return updated;
}

/**
 * Reset all mastery data
 */
export function resetAllMastery() {
  return {};
}