const assert = require("node:assert/strict");
const { test } = require("node:test");
const content = require("../data/imports/content_v2.json");
const {
	VOCAB_TAXONOMY,
	classifyWord,
	enrichQuestionCategory,
} = require("../src/vocab_taxonomy.js");

test("every content question word is known and categorized", () => {
	for (const question of content.questions) {
		const result = classifyWord(question.word);
		assert.equal(result.isKnown, true, question.word);
		assert.notEqual(result.partOfSpeech, "General");
		assert.notEqual(result.partOfSpeech, "unknown");
	}
	assert.equal(Object.keys(VOCAB_TAXONOMY).length, 50);
});

test("the lookup table is frozen", () => {
	assert.equal(Object.isFrozen(VOCAB_TAXONOMY), true);
});

test("classifies each suffix fallback", () => {
	assert.equal(classifyWord("quietly").partOfSpeech, "Adverb");
	assert.equal(classifyWord("creation").partOfSpeech, "Noun");
	assert.equal(classifyWord("development").partOfSpeech, "Noun");
	assert.equal(classifyWord("kindness").partOfSpeech, "Noun");
	assert.equal(classifyWord("ability").partOfSpeech, "Noun");
	assert.equal(classifyWord("helpful").partOfSpeech, "Adjective");
	assert.equal(classifyWord("readable").partOfSpeech, "Adjective");
	assert.equal(classifyWord("dangerous").partOfSpeech, "Adjective");
	assert.equal(classifyWord("creative").partOfSpeech, "Adjective");
	assert.equal(classifyWord("unknown").partOfSpeech, "General");
});

test("normalizes case and whitespace", () => {
	assert.deepEqual(classifyWord("  PeAcE  "), {
		cleanWord: "peace",
		partOfSpeech: "Noun",
		isKnown: true,
	});
});

test("handles invalid and blank input", () => {
	for (const value of [null, undefined, 42, {}, "", " \t\n"]) {
		assert.deepEqual(classifyWord(value), {
			cleanWord: "",
			partOfSpeech: "General",
			isKnown: false,
		});
	}
});

test("enrichment keeps a valid category", () => {
	const question = { word: "peace", category: "Custom" };
	assert.equal(enrichQuestionCategory(question), question);
});

test("enrichment replaces missing and unknown categories", () => {
	assert.equal(enrichQuestionCategory({ word: "encourage" }).category, "Verb");
	assert.equal(
		enrichQuestionCategory({ word: "peace", category: "unknown" }).category,
		"Noun",
	);
	assert.equal(
		enrichQuestionCategory({ word: "peace", category: " UNKNOWN " }).category,
		"Noun",
	);
});

test("enrichment does not mutate a frozen question", () => {
	const question = Object.freeze({ word: "peace", category: "unknown" });
	const before = { ...question };
	const enriched = enrichQuestionCategory(question);

	assert.deepEqual(question, before);
	assert.notEqual(enriched, question);
	assert.deepEqual(enriched, { word: "peace", category: "Noun" });
});

test("enrichment leaves non-objects unchanged", () => {
	for (const value of [null, undefined, "question", 7, false]) {
		assert.equal(enrichQuestionCategory(value), value);
	}
});

test("enrichment handles a missing word without throwing", () => {
	assert.deepEqual(enrichQuestionCategory({ category: "unknown" }), {
		category: "General",
	});
});
