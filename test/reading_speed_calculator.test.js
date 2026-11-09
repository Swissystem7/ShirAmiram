const test = require("node:test");
const assert = require("node:assert/strict");
const {
	calculateWPM,
	classifyPacingTier,
	estimateReadingTimeSeconds,
} = require("../src/reading_speed_calculator.js");

test("exact WPM", () => assert.equal(calculateWPM(140, 60), 140));
test("duration under 1s returns 0", () => assert.equal(calculateWPM(100, 0.5), 0));
test("tiers", () => {
	assert.equal(classifyPacingTier(80).tier, "TOO_SLOW");
	assert.equal(classifyPacingTier(140).tier, "OPTIMAL_PACING");
	assert.equal(classifyPacingTier(200).tier, "FAST");
	assert.equal(classifyPacingTier(300).tier, "RUSHED");
	assert.equal(classifyPacingTier(140).isOptimal, true);
});
test("estimate reading time", () => {
	assert.equal(estimateReadingTimeSeconds("one two three four", 120), 2);
});
test("negative/empty inputs", () => {
	assert.equal(calculateWPM(-1, 60), 0);
	assert.equal(estimateReadingTimeSeconds("", 140), 0);
	assert.equal(estimateReadingTimeSeconds(null, 140), 0);
});
test("boundary 100 and 180 optimal", () => {
	assert.equal(classifyPacingTier(100).tier, "OPTIMAL_PACING");
	assert.equal(classifyPacingTier(180).tier, "OPTIMAL_PACING");
	assert.equal(classifyPacingTier(181).tier, "FAST");
});
