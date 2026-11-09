const test = require("node:test");
const assert = require("node:assert/strict");
const { findIdioms, explainIdiom, IDIOMS } = require("../src/idiom_context_builder.js");

test("finds idiom in sentence", () => {
	const hits = findIdioms("It was a piece of cake for her.");
	assert.equal(hits.length, 1);
	assert.equal(hits[0].idiomPhrase, "piece of cake");
	assert.match(hits[0].figurativeMeaningHebrew, /קל/);
});
test("literal trap warning present", () => {
	const hits = findIdioms("Please break the ice at the meeting.");
	assert.match(hits[0].literalTrapMeaning, /קרח/);
});
test("explainIdiom pedagogical", () => {
	const e = explainIdiom("piece_of_cake");
	assert.ok(e);
	assert.match(e.explanation, /piece of cake/);
	assert.ok(e.example);
});
test("no match", () => {
	assert.deepEqual(findIdioms("plain sentence with nothing special"), []);
	assert.equal(explainIdiom("missing"), null);
});
test("uppercase", () => {
	assert.equal(findIdioms("ONCE IN A BLUE MOON we rest.").length, 1);
});
test("empty text and store size", () => {
	assert.deepEqual(findIdioms(""), []);
	assert.equal(IDIOMS.length, 15);
});
