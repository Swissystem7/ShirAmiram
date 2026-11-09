const test = require("node:test");
const assert = require("node:assert/strict");
const {
	getWordFamily,
	derivePartOfSpeech,
	FAMILIES,
} = require("../src/word_family_builder.js");

test("lookup from verb", () => {
	const f = getWordFamily("create");
	assert.equal(f.rootKey, "create");
	assert.equal(f.adjective, "creative");
});
test("lookup from adjective", () => {
	assert.equal(getWordFamily("creative").verb, "create");
});
test("derive create->creative", () => {
	assert.equal(derivePartOfSpeech("create", "adjective"), "creative");
});
test("derive adverb", () => {
	assert.equal(derivePartOfSpeech("happy", "adverb"), "happily");
});
test("empty/unknown", () => {
	assert.equal(getWordFamily(""), null);
	assert.equal(getWordFamily("zzzz"), null);
	assert.equal(derivePartOfSpeech("zzzz", "noun"), null);
});
test("family count and uppercase", () => {
	assert.equal(FAMILIES.length, 20);
	assert.equal(getWordFamily("SUCCESS").adverb, "successfully");
});
