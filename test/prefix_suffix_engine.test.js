const test = require("node:test");
const assert = require("node:assert/strict");
const { decomposeAffixes } = require("../src/prefix_suffix_engine.js");

test("both affixes: unpredictable", () => {
	const r = decomposeAffixes("unpredictable");
	assert.equal(r.prefix, "un");
	assert.equal(r.suffix, "able");
	assert.equal(r.baseRoot, "predict");
	assert.equal(r.hasAffixes, true);
	assert.match(r.prefixMeaning, /שלילה|לא/);
});

test("prefix-only: disagree", () => {
	const r = decomposeAffixes("disagree");
	assert.equal(r.prefix, "dis");
	assert.equal(r.suffix, null);
	assert.equal(r.baseRoot, "agree");
	assert.equal(r.hasAffixes, true);
});

test("suffix-only: careless", () => {
	const r = decomposeAffixes("careless");
	assert.equal(r.prefix, null);
	assert.equal(r.suffix, "less");
	assert.equal(r.baseRoot, "care");
	assert.equal(r.hasAffixes, true);
});

test("no affixes: ancient", () => {
	const r = decomposeAffixes("ancient");
	assert.equal(r.hasAffixes, false);
	assert.equal(r.prefix, null);
	assert.equal(r.suffix, null);
	assert.equal(r.baseRoot, "ancient");
});

test("empty/short input", () => {
	assert.equal(decomposeAffixes("").hasAffixes, false);
	assert.equal(decomposeAffixes("ab").hasAffixes, false);
	assert.equal(decomposeAffixes(null).baseRoot, "");
});

test("uppercase normalized", () => {
	const r = decomposeAffixes("CARELESS");
	assert.equal(r.suffix, "less");
	assert.equal(r.baseRoot, "care");
});
