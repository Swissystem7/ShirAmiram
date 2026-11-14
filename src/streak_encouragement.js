// streak_encouragement.js
// Provides a function to generate a streak encouragement message.
// The next milestone is the next multiple of 5 days.

/**
 * Calculate the next milestone (multiple of 5) based on the current streak.
 * @param {number} streakDays - The current number of consecutive days.
 * @returns {number} The next milestone day count (e.g., 5, 10, 15...).
 */
export function getNextMilestone(streakDays) {
  if (typeof streakDays !== "number" || Number.isNaN(streakDays) || streakDays < 0) {
    throw new Error("streakDays must be a non‑negative number");
  }
  const validStreak = Math.floor(streakDays);
  // If already on a milestone, the next one is +5.
  const completedMilestones = Math.floor(validStreak / 5);
  return (completedMilestones + 1) * 5;
}

/**
 * Generate a friendly encouragement message based on the streak.
 * @param {number} streakDays - Current streak length.
 * @returns {string} Message encouraging the user to keep the streak.
 */
export function getStreakEncouragement(streakDays) {
  if (typeof streakDays !== "number" || Number.isNaN(streakDays) || streakDays < 0) {
    throw new Error("streakDays must be a non‑negative number");
  }
  const validStreak = Math.floor(streakDays);
  if (validStreak > 0 && validStreak % 5 === 0) {
    // Exactly on a milestone – celebrate and set the next one.
    const nextMilestone = validStreak + 5;
    return `🎉 Amazing! You just hit a ${validStreak}‑day streak! Keep it up – the next milestone is ${nextMilestone} days.`;
  }
  const nextMilestone = getNextMilestone(validStreak);
  const daysToNext = nextMilestone - validStreak;
  return `You have a ${validStreak}‑day streak. Only ${daysToNext} more day${daysToNext > 1 ? "s" : ""} to reach ${nextMilestone} days!`;
}
