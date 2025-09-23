// Scoring utilities for all modes
export const REWARD = 1;
export const PENALTY = 5;

export function scorePlacementDelta(isCorrect) {
  return isCorrect ? REWARD : -PENALTY;
}

export function scoreRoundDelta(isCorrect) {
  return isCorrect ? REWARD : -PENALTY;
}

export function scoreEnglishDelta(isCorrect) {
  return isCorrect ? REWARD : -PENALTY;
}

export function clampMinutes(v) {
  return Math.max(0, v);
}

