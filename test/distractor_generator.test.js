const test = require("node:test");
const assert = require("node:assert/strict");

const {
	generateDistractors,
	formatQuestionChoices,
} = require("../src/distractor_generator.js");

test("generates three distinct distractors", () => {
	const result = generateDistractors("peace", [
		"comfort",
		"hope",
		"joy",
		"peace",
		"peace",
	]);
	assert.equal(result.distractors.length, 3);
	assert.equal(new Set(result.distractors).size, 3);
	assert.ok(!result.distractors.includes("peace"));
});

test("uses matching part of speech when enough words exist", () => {
	const result = generateDistractors(
		"calm",
		["strong", "little", "comfort", "encourage"],
		{ count: 2 },
	);
	assert.deepEqual(result.distractors, ["little", "strong"]);
	assert.equal(result.relaxedPOS, false);
});

test("seeded generation is deterministic", () => {
	const pool = ["comfort", "hope", "joy", "memory", "future"];
	assert.deepEqual(
		generateDistractors("peace", pool, { seed: "quiz-1" }),
		generateDistractors("peace", pool, { seed: "quiz-1" }),
	);
});

test("different seeds can produce different selections", () => {
	const pool = ["comfort", "hope", "joy", "memory", "future"];
	assert.notDeepEqual(
		generateDistractors("peace", pool, { seed: 1 }).distractors,
		generateDistractors("peace", pool, { seed: 2 }).distractors,
	);
});

test("relaxes part of speech when the matching pool is too small", () => {
	const result = generateDistractors("encourage", ["comfort", "hope"], {
		count: 3,
	});
	assert.equal(result.distractors.length, 2);
	assert.equal(result.relaxedPOS, true);
});

test("removes duplicate and case-variant entries", () => {
	const result = generateDistractors("peace", [
		"COMFORT",
		" comfort ",
		"HOPE",
		"hope",
	]);
	assert.deepEqual(result.distractors, ["comfort", "hope"]);
});

test("invalid targets and pools never throw", () => {
	for (const target of [null, undefined, 7, ""]) {
		assert.deepEqual(generateDistractors(target, []), {
			distractors: [],
			relaxedPOS: false,
		});
	}
	for (const pool of [null, undefined, 7, "", []]) {
		assert.doesNotThrow(() => generateDistractors("peace", pool));
	}
});

test("supports object pool entries and level metadata", () => {
	const result = generateDistractors({ word: "peace", level: 2 }, [
		{ word: "joy", level: 2 },
		{ word: "hope", level: 1 },
		{ word: "comfort", level: 3 },
	]);
	assert.deepEqual(result.distractors, ["joy", "comfort", "hope"]);
});

test("respects count", () => {
	const result = generateDistractors("peace", ["hope", "joy", "comfort"], {
		count: 2,
	});
	assert.equal(result.distractors.length, 2);
});

test("formats four deterministic choices and identifies the answer", () => {
	const first = formatQuestionChoices(
		"peace",
		["hope", "joy", "comfort"],
		"seed",
	);
	const second = formatQuestionChoices(
		"peace",
		["hope", "joy", "comfort"],
		"seed",
	);
	assert.deepEqual(first, second);
	assert.equal(first.choices.length, 4);
	assert.equal(first.choices[first.correctIndex], "peace");
});

test("rejects invalid choice inputs", () => {
	assert.deepEqual(formatQuestionChoices("", ["hope"]), {
		choices: [],
		correctIndex: -1,
	});
	assert.deepEqual(formatQuestionChoices("peace", ["peace"]), {
		choices: [],
		correctIndex: -1,
	});
});
