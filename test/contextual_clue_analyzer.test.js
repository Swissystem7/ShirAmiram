const test = require("node:test");
const assert = require("node:assert/strict");
const {
	detectTransitionSignals,
	predictSemanticDirection,
} = require("../src/contextual_clue_analyzer.js");

test("contrast", () => {
	const hits = detectTransitionSignals("She was tired, however she continued.");
	assert.equal(hits[0].signalType, "CONTRAST");
	assert.equal(predictSemanticDirection("She was tired, however she continued."), "OPPOSITE_MEANING");
});
test("cause effect", () => {
	const hits = detectTransitionSignals("He left because it rained.");
	assert.equal(hits[0].signalWord, "because");
	assert.equal(predictSemanticDirection("He left because it rained."), "REINFORCING");
});
test("addition", () => {
	assert.equal(detectTransitionSignals("Moreover, we studied more.").length, 1);
});
test("no signals", () => {
	assert.deepEqual(detectTransitionSignals("plain sentence"), []);
	assert.equal(predictSemanticDirection("plain sentence"), "NEUTRAL");
});
test("uppercase", () => {
	assert.equal(detectTransitionSignals("ALTHOUGH it was hard, we tried.").length, 1);
});
test("empty", () => {
	assert.deepEqual(detectTransitionSignals(""), []);
	assert.equal(predictSemanticDirection(""), "NEUTRAL");
});
