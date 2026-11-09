const test = require("node:test");
const assert = require("node:assert/strict");
const {
	evaluateResponseConfidence,
} = require("../src/confidence_score_estimator.js");
test("SOLID fast correct", () => {
	const r = evaluateResponseConfidence(1200, true);
	assert.equal(r.confidenceTier, "SOLID");
	assert.equal(r.scheduleMultiplier, 1.2);
});
test("NORMAL mid correct", () =>
	assert.equal(
		evaluateResponseConfidence(5000, true).confidenceTier,
		"NORMAL",
	));
test("HESITANT slow correct", () => {
	const r = evaluateResponseConfidence(9000, true);
	assert.equal(r.confidenceTier, "HESITANT");
	assert.equal(r.isHesitantGuess, true);
	assert.equal(r.scheduleMultiplier, 0.7);
});
test("IMPULSIVE fast wrong", () =>
	assert.equal(
		evaluateResponseConfidence(500, false).confidenceTier,
		"IMPULSIVE",
	));
test("STRUGGLED slow wrong", () =>
	assert.equal(
		evaluateResponseConfidence(4000, false).confidenceTier,
		"STRUGGLED",
	));
test("invalid time defaults safely", () => {
	assert.equal(evaluateResponseConfidence(-1, true).confidenceTier, "NORMAL");
	assert.equal(evaluateResponseConfidence("x", true).confidenceTier, "NORMAL");
});
