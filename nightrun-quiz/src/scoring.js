'use strict';

// Scoring rules:
// - A correct answer is worth up to MAX_POINTS, scaled by speed. Answering
//   instantly gives the full 1000; answering at the last moment still gives
//   half (500), so a slow correct answer always beats a wrong one.
// - Every correct answer while the player's streak is 3 or more adds
//   STREAK_BONUS (so the 3rd, 4th, 5th... correct answer in a row each get +100).
// - A wrong answer or no answer gives 0 and resets the streak.

const MAX_POINTS = 1000;
const STREAK_MIN = 3;
const STREAK_BONUS = 100;

function speedPoints(elapsedMs, timeLimitSec) {
  const limitMs = timeLimitSec * 1000;
  const ratio = Math.min(Math.max(elapsedMs / limitMs, 0), 1);
  return Math.round(MAX_POINTS * (1 - ratio / 2));
}

// Returns the outcome of one question for one player and the new streak.
function scoreAnswer({ correct, elapsedMs, timeLimitSec, streak }) {
  if (!correct) return { points: 0, bonus: 0, streak: 0 };
  const newStreak = streak + 1;
  return {
    points: speedPoints(elapsedMs, timeLimitSec),
    bonus: newStreak >= STREAK_MIN ? STREAK_BONUS : 0,
    streak: newStreak,
  };
}

module.exports = { MAX_POINTS, STREAK_MIN, STREAK_BONUS, speedPoints, scoreAnswer };
