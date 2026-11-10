// ShirAmiram — Unit tests for Multi-Blank Cloze Passage Generator
const test = require("node:test");
const assert = require("node:assert/strict");

const { generateClozePassage } = require("../src/cloze_generator.js");

const testWordPool = [
	"peace",
	"comfort",
	"wisdom",
	"hope",
	"dream",
	"future",
	"journey",
	"freedom",
	"silence",
	"beauty",
	"nature",
	"memory",
	"calm",
	"strong",
	"little",
	"encourage",
	"lean",
	"help",
];

test("1. 2 blanks masked correctly", () => {
	const passage = "Finding peace brings true wisdom to all.";
	const result = generateClozePassage(
		passage,
		["peace", "wisdom"],
		testWordPool,
		{ seed: 101 },
	);

	assert.equal(
		result.maskedPassage,
		"Finding [1] ________ brings true [2] ________ to all.",
	);
	assert.equal(result.blanks.length, 2);
	assert.equal(result.blanks[0].index, 1);
	assert.equal(result.blanks[0].targetWord, "peace");
	assert.equal(result.blanks[1].index, 2);
	assert.equal(result.blanks[1].targetWord, "wisdom");
});

test("2. 3 blanks masked correctly", () => {
	const passage = "With hope and freedom, our future is bright.";
	const result = generateClozePassage(
		passage,
		["hope", "freedom", "future"],
		testWordPool,
		{ seed: 202 },
	);

	assert.equal(
		result.maskedPassage,
		"With [1] ________ and [2] ________, our [3] ________ is bright.",
	);
	assert.equal(result.blanks.length, 3);
	assert.equal(result.blanks[0].index, 1);
	assert.equal(result.blanks[0].targetWord, "hope");
	assert.equal(result.blanks[1].index, 2);
	assert.equal(result.blanks[1].targetWord, "freedom");
	assert.equal(result.blanks[2].index, 3);
	assert.equal(result.blanks[2].targetWord, "future");
});

test("3. sequential numbering [1], [2], [3] by appearance even when targetWords is in another order", () => {
	const passage = "First comes hope, then comes freedom, and finally peace.";
	// targetWords specified in reverse appearance order
	const result = generateClozePassage(
		passage,
		["peace", "freedom", "hope"],
		testWordPool,
		{ seed: 303 },
	);

	assert.equal(
		result.maskedPassage,
		"First comes [1] ________, then comes [2] ________, and finally [3] ________.",
	);
	assert.equal(result.blanks.length, 3);
	assert.equal(result.blanks[0].index, 1);
	assert.equal(result.blanks[0].targetWord, "hope");
	assert.equal(result.blanks[1].index, 2);
	assert.equal(result.blanks[1].targetWord, "freedom");
	assert.equal(result.blanks[2].index, 3);
	assert.equal(result.blanks[2].targetWord, "peace");
});

test("4. each blank has 4 distinct choices and choices[correctIndex] equals the target", () => {
	const passage = "True wisdom leads to peace.";
	const result = generateClozePassage(
		passage,
		["wisdom", "peace"],
		testWordPool,
		{ seed: 404 },
	);

	for (const blank of result.blanks) {
		assert.equal(blank.choices.length, 4);
		assert.equal(new Set(blank.choices).size, 4);
		assert.ok(blank.correctIndex >= 0 && blank.correctIndex < 4);
		assert.equal(blank.choices[blank.correctIndex], blank.targetWord);
	}
});

test("5. case-insensitive and word-boundary matching (strict boundaries prevent matching inside longer words)", () => {
	// Strict ASCII boundaries (\b) match whole word 'ancient' case-insensitively,
	// but do not match inside 'ancients'.
	const passage =
		"The ANCIENT ruins stood tall, but modern ancients still study them.";
	const result = generateClozePassage(passage, ["ancient"], testWordPool, {
		seed: 505,
	});

	assert.equal(
		result.maskedPassage,
		"The [1] ________ ruins stood tall, but modern ancients still study them.",
	);
	assert.equal(result.blanks.length, 1);
	assert.equal(result.blanks[0].targetWord, "ancient");

	// When target is only present as a substring of another word, it is skipped
	const skippedResult = generateClozePassage(
		"Only ancients walked here.",
		["ancient"],
		testWordPool,
	);
	assert.equal(skippedResult.maskedPassage, "Only ancients walked here.");
	assert.deepEqual(skippedResult.blanks, []);
});

test("6. targets missing from the passage are skipped", () => {
	const passage = "They sought comfort in times of trouble.";
	const result = generateClozePassage(
		passage,
		["nonexistent", "comfort", "absentword"],
		testWordPool,
		{ seed: 606 },
	);

	assert.equal(
		result.maskedPassage,
		"They sought [1] ________ in times of trouble.",
	);
	assert.equal(result.blanks.length, 1);
	assert.equal(result.blanks[0].index, 1);
	assert.equal(result.blanks[0].targetWord, "comfort");
});

test("7. empty / non-string passage and non-array targets return safe defaults", () => {
	assert.deepEqual(generateClozePassage("", ["peace"], testWordPool), {
		maskedPassage: "",
		blanks: [],
	});
	assert.deepEqual(generateClozePassage("   ", ["peace"], testWordPool), {
		maskedPassage: "   ",
		blanks: [],
	});
	assert.deepEqual(generateClozePassage(null, ["peace"], testWordPool), {
		maskedPassage: "",
		blanks: [],
	});
	assert.deepEqual(generateClozePassage(undefined, ["peace"], testWordPool), {
		maskedPassage: "",
		blanks: [],
	});
	assert.deepEqual(generateClozePassage(12345, ["peace"], testWordPool), {
		maskedPassage: "",
		blanks: [],
	});
	assert.deepEqual(generateClozePassage("Peace reigns.", null, testWordPool), {
		maskedPassage: "Peace reigns.",
		blanks: [],
	});
	assert.deepEqual(
		generateClozePassage("Peace reigns.", "peace", testWordPool),
		{
			maskedPassage: "Peace reigns.",
			blanks: [],
		},
	);
	assert.deepEqual(generateClozePassage("Peace reigns.", {}, testWordPool), {
		maskedPassage: "Peace reigns.",
		blanks: [],
	});
});

test("8. deterministic output with the same seed", () => {
	const passage = "Finding peace brings true wisdom and hope.";
	const targets = ["peace", "wisdom", "hope"];

	const run1 = generateClozePassage(passage, targets, testWordPool, {
		seed: "shiramiram-deterministic",
	});
	const run2 = generateClozePassage(passage, targets, testWordPool, {
		seed: "shiramiram-deterministic",
	});

	assert.deepEqual(run1, run2);

	const numericSeed1 = generateClozePassage(passage, targets, testWordPool, {
		seed: 42,
	});
	const numericSeed2 = generateClozePassage(passage, targets, testWordPool, {
		seed: 42,
	});

	assert.deepEqual(numericSeed1, numericSeed2);
});

test("9. inputs are not mutated", () => {
	const passage = "Peace brings wisdom.";
	const frozenTargets = Object.freeze([
		Object.freeze({ word: "peace", level: 1 }),
		Object.freeze({ word: "wisdom", level: 2 }),
	]);
	const frozenPool = Object.freeze(
		testWordPool.map((w) => Object.freeze({ word: w })),
	);
	const frozenOptions = Object.freeze({ seed: 777 });

	assert.doesNotThrow(() => {
		const result = generateClozePassage(
			passage,
			frozenTargets,
			frozenPool,
			frozenOptions,
		);
		assert.equal(result.blanks.length, 2);
	});
});

test("10. insufficient pool words still mask blank but return empty choices and -1 index", () => {
	const passage = "Finding peace brings calm.";
	// wordPool with only 1 distractor candidate cannot form 4 distinct choices
	const smallPool = ["comfort"];
	const result = generateClozePassage(passage, ["peace"], smallPool);

	assert.equal(result.maskedPassage, "Finding [1] ________ brings calm.");
	assert.equal(result.blanks.length, 1);
	assert.equal(result.blanks[0].index, 1);
	assert.equal(result.blanks[0].targetWord, "peace");
	assert.deepEqual(result.blanks[0].choices, []);
	assert.equal(result.blanks[0].correctIndex, -1);
});

test("11. only the first occurrence of each target word becomes a blank", () => {
	const passage = "Peace begins with peace and ends in peace.";
	const result = generateClozePassage(passage, ["peace"], testWordPool, {
		seed: 88,
	});

	assert.equal(
		result.maskedPassage,
		"[1] ________ begins with peace and ends in peace.",
	);
	assert.equal(result.blanks.length, 1);
	assert.equal(result.blanks[0].index, 1);
});

test("12. targetWords accepts mixed string and catalog entry objects with word property", () => {
	const passage = "Through wisdom we find hope.";
	const targets = [{ word: "WISDOM", difficulty: 2 }, "hope"];
	const result = generateClozePassage(passage, targets, testWordPool, {
		seed: 99,
	});

	assert.equal(
		result.maskedPassage,
		"Through [1] ________ we find [2] ________.",
	);
	assert.equal(result.blanks[0].targetWord, "wisdom");
	assert.equal(result.blanks[1].targetWord, "hope");
	assert.equal(
		result.blanks[0].choices[result.blanks[0].correctIndex],
		"wisdom",
	);
	assert.equal(result.blanks[1].choices[result.blanks[1].correctIndex], "hope");
});

test("13. blank objects preserve original matchedText case from passage", () => {
	const passage = "Finding Wisdom brings Peace.";
	const result = generateClozePassage(
		passage,
		["wisdom", "peace"],
		testWordPool,
		{ seed: 123 },
	);

	assert.equal(
		result.maskedPassage,
		"Finding [1] ________ brings [2] ________.",
	);
	assert.equal(result.blanks[0].matchedText, "Wisdom");
	assert.equal(result.blanks[1].matchedText, "Peace");
	assert.equal(result.blanks[0].targetWord, "wisdom");
	assert.equal(result.blanks[1].targetWord, "peace");
});
