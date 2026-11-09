const test = require("node:test");
const assert = require("node:assert/strict");
const {
	scrambleWord,
	validateSpellingAttempt,
} = require("../src/spelling_bee_validator.js");

test("scramble preserves letter count", () => {
	const s = scrambleWord("garden", 42);
	assert.equal(s.length, 6);
	assert.deepEqual([...s].sort(), [..."garden"].sort());
	assert.notEqual(s, "garden");
});
test("correct spelling", () => {
	const r = validateSpellingAttempt("music", "music");
	assert.equal(r.isCorrect, true);
	assert.equal(r.matchedLettersCount, 5);
	assert.equal(r.firstMismatchIndex, -1);
	assert.equal(r.isComplete, true);
});
test("mismatch index", () => {
	const r = validateSpellingAttempt("music", "muzic");
	assert.equal(r.isCorrect, false);
	assert.equal(r.firstMismatchIndex, 2);
});
test("empty input", () => {
	assert.equal(scrambleWord(""), "");
	const r = validateSpellingAttempt("ab", "");
	assert.equal(r.isCorrect, false);
	assert.equal(r.isComplete, false);
});
test("uppercase normalized", () => {
	assert.equal(validateSpellingAttempt("Music", "MUSIC").isCorrect, true);
});
test("punctuation/spaces stripped via normalize on scramble length-1", () => {
	assert.equal(scrambleWord("A", 1), "a");
	const r = validateSpellingAttempt("to be", "tobe");
	assert.equal(r.totalLetters, 4);
});
