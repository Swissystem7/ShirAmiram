const test = require("node:test");
const assert = require("node:assert/strict");
const {
	evaluateStreakMilestones,
	calculateStreakMultiplier,
} = require("../src/study_streak_badges.js");

test("badges at exact milestones", () => {
	assert.deepEqual(
		evaluateStreakMilestones(3).map((b) => b.id),
		["STREAK_3_DAYS"],
	);
	assert.deepEqual(
		evaluateStreakMilestones(7).map((b) => b.id),
		["STREAK_3_DAYS", "STREAK_7_DAYS"],
	);
	assert.equal(evaluateStreakMilestones(14).length, 3);
	assert.equal(evaluateStreakMilestones(30).length, 4);
});
test("multiplier at 0 and cap at 20+", () => {
	assert.equal(calculateStreakMultiplier(0), 1.0);
	assert.equal(calculateStreakMultiplier(20), 2.0);
	assert.equal(calculateStreakMultiplier(50), 2.0);
});
test("hebrew titles", () => {
	assert.equal(evaluateStreakMilestones(3)[0].titleHebrew, "הצתה");
});
test("negative/non-number", () => {
	assert.deepEqual(evaluateStreakMilestones(-1), []);
	assert.deepEqual(evaluateStreakMilestones("x"), []);
	assert.equal(calculateStreakMultiplier(-5), 1.0);
});
test("partial between milestones", () => {
	assert.equal(evaluateStreakMilestones(2).length, 0);
	assert.equal(evaluateStreakMilestones(6).length, 1);
});
test("xp values", () => {
	assert.equal(evaluateStreakMilestones(30).at(-1).bonusXP, 750);
});
