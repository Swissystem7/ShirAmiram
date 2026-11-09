const test = require("node:test");
const assert = require("node:assert/strict");
const { findPhrasalVerbs } = require("../src/idiom_phrasal_matcher.js");

test("finds contiguous give up", () => {
	const hits = findPhrasalVerbs("Never give up on dreams");
	assert.ok(hits.some((h) => h.phrasalVerb === "give up"));
});
test("finds carry out", () => {
	const hits = findPhrasalVerbs("They carry out the plan");
	assert.equal(
		hits[0].hebrewMeaning.includes("לבצע") || hits[0].baseVerb === "carry",
		true,
	);
});
test("finds split turn it down", () => {
	const hits = findPhrasalVerbs("Please turn it down now");
	assert.ok(hits.some((h) => h.phrasalVerb === "turn down"));
});
test("empty text", () => assert.deepEqual(findPhrasalVerbs(""), []));
test("no phrasals", () =>
	assert.deepEqual(findPhrasalVerbs("hello world"), []));
test("null-safe", () => assert.deepEqual(findPhrasalVerbs(null), []));
