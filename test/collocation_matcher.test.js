const test = require("node:test");
const assert = require("node:assert/strict");
const {
	findCollocations,
	validatePreposition,
	COLLOCATIONS,
} = require("../src/collocation_matcher.js");

test("dictionary has 25 entries", () => assert.equal(COLLOCATIONS.length, 25));
test("finds valid collocation", () => {
	const hits = findCollocations("She is capable of solving it.");
	assert.equal(hits.length, 1);
	assert.equal(hits[0].baseWord, "capable");
	assert.equal(hits[0].preposition, "of");
});
test("wrong preposition interested for", () => {
	const v = validatePreposition("interested", "for");
	assert.equal(v.isValid, false);
	assert.equal(v.expectedPreposition, "in");
	assert.equal(v.commonMistake, true);
});
test("valid preposition", () => {
	const v = validatePreposition("depend", "on");
	assert.equal(v.isValid, true);
});
test("empty input", () => {
	assert.deepEqual(findCollocations(""), []);
	assert.deepEqual(findCollocations(null), []);
});
test("uppercase and punctuation", () => {
	const hits = findCollocations("AFRAID OF SPIDERS!!!");
	assert.equal(hits[0].baseWord, "afraid");
	assert.equal(hits[0].preposition, "of");
});
