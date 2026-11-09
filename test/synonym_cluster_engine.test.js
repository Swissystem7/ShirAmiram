const test = require("node:test");
const assert = require("node:assert/strict");
const eng = require("../src/synonym_cluster_engine.js");

test("findSynonyms: abundant cluster", () => {
	assert.deepEqual(eng.findSynonyms("abundant").sort(), [
		"ample",
		"copious",
		"plentiful",
	]);
});

test("findSynonyms: case and space robust", () => {
	assert.deepEqual(eng.findSynonyms("  Fragile ").sort(), [
		"brittle",
		"delicate",
		"vulnerable",
	]);
});

test("findSynonyms: unknown word -> []", () => {
	assert.deepEqual(eng.findSynonyms("xyzzy"), []);
	assert.deepEqual(eng.findSynonyms(""), []);
	assert.deepEqual(eng.findSynonyms(null), []);
});

test("findAntonyms: abundant <-> scarce", () => {
	assert.deepEqual(eng.findAntonyms("abundant"), ["scarce"]);
	assert.deepEqual(eng.findAntonyms("SCARCE"), ["abundant"]);
});

test("findAntonyms: ancient <-> modern", () => {
	assert.deepEqual(eng.findAntonyms("ancient"), ["modern"]);
	assert.deepEqual(eng.findAntonyms(" modern "), ["ancient"]);
});

test("checkSemanticRelation: SYNONYM", () => {
	assert.equal(eng.checkSemanticRelation("abundant", "plentiful"), "SYNONYM");
	assert.equal(eng.checkSemanticRelation("fragile", "brittle"), "SYNONYM");
	assert.equal(eng.checkSemanticRelation("ancient", "antique"), "SYNONYM");
});

test("checkSemanticRelation: ANTONYM", () => {
	assert.equal(eng.checkSemanticRelation("abundant", "scarce"), "ANTONYM");
	assert.equal(eng.checkSemanticRelation("modern", "ancient"), "ANTONYM");
});

test("checkSemanticRelation: UNRELATED", () => {
	assert.equal(eng.checkSemanticRelation("abundant", "fragile"), "UNRELATED");
	assert.equal(eng.checkSemanticRelation("abundant", "abundant"), "UNRELATED");
	assert.equal(eng.checkSemanticRelation("", "abundant"), "UNRELATED");
});
