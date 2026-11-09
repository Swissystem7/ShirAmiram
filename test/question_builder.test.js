// ShirAmiram — deterministic tests for the dynamic question builder.
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildQuestion, maskTargetWord } = require("../src/question_builder.js");
const { classifyWord } = require("../src/vocab_taxonomy.js");

const wordPool = ["hope", "dream", "future", "wisdom", "journey"];

test("maskTargetWord masks whole words only (ancient vs ancients)", () => {
	assert.equal(
		maskTargetWord("The ancient ruins and the ancients remain.", "ancient"),
		"The ________ ruins and the ancients remain.",
	);
});

test("maskTargetWord masks case-insensitively", () => {
	assert.equal(
		maskTargetWord("Ancient stones and ANCIENT walls.", "ancient"),
		"________ stones and ________ walls.",
	);
});

test("maskTargetWord masks multiple occurrences", () => {
	assert.equal(
		maskTargetWord("Peace brings peace and PEACE.", "peace"),
		"________ brings ________ and ________.",
	);
});

test("maskTargetWord treats regex special characters literally", () => {
	assert.equal(
		maskTargetWord("The a.b pattern and the axb pattern.", "a.b"),
		"The ________ pattern and the axb pattern.",
	);
	assert.doesNotThrow(() => maskTargetWord("The a.b pattern.", "a.b"));
});

test("maskTargetWord returns sentence unchanged if invalid", () => {
	assert.equal(maskTargetWord(null, "peace"), "");
	assert.equal(maskTargetWord(42, "peace"), "");
	assert.equal(maskTargetWord(undefined, "peace"), "");
	assert.equal(maskTargetWord("Peace remains.", ""), "Peace remains.");
	assert.equal(maskTargetWord("Peace remains.", null), "Peace remains.");
	assert.equal(maskTargetWord("", "peace"), "");
});

test("maskTargetWord supports a custom mask", () => {
	assert.equal(
		maskTargetWord("The ancient ruins.", "ancient", "_____"),
		"The _____ ruins.",
	);
});

test("buildQuestion returns four choices at correctIndex", () => {
	const question = buildQuestion({
		sentence: "Peace brings calm to the valley.",
		targetWord: "peace",
		wordPool,
		seed: 42,
	});
	assert.ok(question);
	assert.equal(question.maskedSentence, "________ brings calm to the valley.");
	assert.equal(question.choices.length, 4);
	assert.equal(new Set(question.choices).size, 4);
	assert.equal(question.choices[question.correctIndex], "peace");
});

test("buildQuestion partOfSpeech equals classifyWord's", () => {
	const question = buildQuestion({
		sentence: "Peace brings calm to the valley.",
		targetWord: "peace",
		wordPool,
		seed: 42,
	});
	assert.ok(question);
	assert.equal(question.partOfSpeech, classifyWord("peace").partOfSpeech);
});

test("buildQuestion is deterministic with the same seed", () => {
	const input = {
		sentence: "Peace brings calm to the valley.",
		targetWord: "peace",
		wordPool,
		seed: 7,
	};
	assert.deepEqual(buildQuestion(input), buildQuestion(input));
});

test("buildQuestion returns null for invalid inputs", () => {
	assert.doesNotThrow(() => buildQuestion());
	assert.equal(buildQuestion(), null);
	assert.equal(buildQuestion(null), null);
	assert.equal(buildQuestion({}), null);
	assert.equal(
		buildQuestion({ sentence: "", targetWord: "peace", wordPool }),
		null,
	);
	assert.equal(
		buildQuestion({ sentence: "Peace remains.", targetWord: "", wordPool }),
		null,
	);
	assert.equal(
		buildQuestion({ sentence: 42, targetWord: "peace", wordPool }),
		null,
	);
	assert.equal(
		buildQuestion({ sentence: "Peace remains.", targetWord: null, wordPool }),
		null,
	);
});

test("buildQuestion returns null without whole-word target", () => {
	assert.equal(
		buildQuestion({
			sentence: "The valley is calm.",
			targetWord: "peace",
			wordPool,
		}),
		null,
	);
	assert.equal(
		buildQuestion({
			sentence: "The ancients remain.",
			targetWord: "ancient",
			wordPool,
		}),
		null,
	);
});

test("buildQuestion returns null with too few distractors", () => {
	assert.equal(
		buildQuestion({
			sentence: "Peace brings calm.",
			targetWord: "peace",
			wordPool: ["hope", "dream"],
		}),
		null,
	);
	assert.equal(
		buildQuestion({ sentence: "Peace brings calm.", targetWord: "peace" }),
		null,
	);
});

test("buildQuestion passes explanation through (default '')", () => {
	const withExplanation = buildQuestion({
		sentence: "Peace brings calm to the valley.",
		targetWord: "peace",
		wordPool,
		explanation: "Peace means a calm state.",
		seed: 42,
	});
	assert.ok(withExplanation);
	assert.equal(withExplanation.explanation, "Peace means a calm state.");
	const withoutExplanation = buildQuestion({
		sentence: "Peace brings calm to the valley.",
		targetWord: "peace",
		wordPool,
		seed: 42,
	});
	assert.ok(withoutExplanation);
	assert.equal(withoutExplanation.explanation, "");
});
