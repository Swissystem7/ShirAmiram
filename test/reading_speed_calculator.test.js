const test = require("node:test");
const assert = require("node:assert/strict");
const {
	calculateWPM,
	classifyPacingTier,
	estimateReadingTimeSeconds,
} = require("../src/reading_speed_calculator.js");

test("exact WPM", () => assert.equal(calculateWPM(140, 60), 140));
test("duration under 1s returns 0", () =>
	assert.equal(calculateWPM(100, 0.5), 0));
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
test("sub-second duration thresholds", () => {
	assert.equal(calculateWPM(100, 0), 0);
	assert.equal(calculateWPM(100, 0.001), 0);
	assert.equal(calculateWPM(100, 0.999), 0);
	assert.equal(calculateWPM(2, 1), 120);
});
test("NaN and non-finite values across calculator functions", () => {
	assert.equal(calculateWPM(Number.NaN, 60), 0);
	assert.equal(calculateWPM(100, Number.NaN), 0);
	assert.equal(calculateWPM("invalid", 60), 0);
	assert.equal(calculateWPM(100, Number.POSITIVE_INFINITY), 0);
	assert.deepEqual(classifyPacingTier(Number.NaN), {
		wpm: 0,
		tier: "TOO_SLOW",
		isOptimal: false,
	});
	assert.deepEqual(classifyPacingTier(Number.POSITIVE_INFINITY), {
		wpm: 0,
		tier: "TOO_SLOW",
		isOptimal: false,
	});
	assert.equal(estimateReadingTimeSeconds("one two", Number.NaN), 0);
	assert.equal(estimateReadingTimeSeconds(Number.NaN, 140), 0);
});
test("negative numbers across calculator functions", () => {
	assert.equal(calculateWPM(-50, 60), 0);
	assert.equal(calculateWPM(100, -1), 0);
	assert.equal(calculateWPM(-10, -10), 0);
	assert.deepEqual(classifyPacingTier(-25), {
		wpm: 0,
		tier: "TOO_SLOW",
		isOptimal: false,
	});
	assert.equal(estimateReadingTimeSeconds("one two three", -140), 0);
	assert.equal(estimateReadingTimeSeconds("one two three", 0), 0);
});
