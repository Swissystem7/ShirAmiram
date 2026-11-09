const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
	calculateComplexityScore,
	estimateAmiramLevel,
	WEIGHTS,
} = require("../src/difficulty_estimator.js");

test("1. required Level A words (sing, dice, fear) classify into A_foundational (< 0.40)", () => {
	const levelAWords = ["sing", "dice", "fear"];

	for (const word of levelAWords) {
		const score = calculateComplexityScore(word);
		assert.ok(
			score < 0.4,
			`Word "${word}" expected score < 0.40, got ${score}`,
		);

		const result = estimateAmiramLevel(word);
		assert.equal(
			result.level,
			"A_foundational",
			`Word "${word}" expected level "A_foundational", got "${result.level}"`,
		);
		assert.equal(result.score, score);
		assert.equal(result.word, word);
	}

	// Individual assertions
	assert.ok(calculateComplexityScore("sing") < 0.4);
	assert.equal(estimateAmiramLevel("sing").level, "A_foundational");

	assert.ok(calculateComplexityScore("dice") < 0.4);
	assert.equal(estimateAmiramLevel("dice").level, "A_foundational");

	assert.ok(calculateComplexityScore("fear") < 0.4);
	assert.equal(estimateAmiramLevel("fear").level, "A_foundational");
});

test("2. required Level B words (ancient, fragile, achieve) classify into B_intermediate (0.40 to 0.70 inclusive)", () => {
	const levelBWords = ["ancient", "fragile", "achieve"];

	for (const word of levelBWords) {
		const score = calculateComplexityScore(word);
		assert.ok(
			score >= 0.4 && score <= 0.7,
			`Word "${word}" expected score in [0.40, 0.70], got ${score}`,
		);

		const result = estimateAmiramLevel(word);
		assert.equal(
			result.level,
			"B_intermediate",
			`Word "${word}" expected level "B_intermediate", got "${result.level}"`,
		);
		assert.equal(result.score, score);
		assert.equal(result.word, word);
	}

	// Individual assertions
	const ancientScore = calculateComplexityScore("ancient");
	assert.ok(ancientScore >= 0.4 && ancientScore <= 0.7);
	assert.equal(estimateAmiramLevel("ancient").level, "B_intermediate");

	const fragileScore = calculateComplexityScore("fragile");
	assert.ok(fragileScore >= 0.4 && fragileScore <= 0.7);
	assert.equal(estimateAmiramLevel("fragile").level, "B_intermediate");

	const achieveScore = calculateComplexityScore("achieve");
	assert.ok(achieveScore >= 0.4 && achieveScore <= 0.7);
	assert.equal(estimateAmiramLevel("achieve").level, "B_intermediate");
});

test("3. required Level C words (unprecedented, indispensable, contradictory) classify into C_advanced (> 0.70)", () => {
	const levelCWords = ["unprecedented", "indispensable", "contradictory"];

	for (const word of levelCWords) {
		const score = calculateComplexityScore(word);
		assert.ok(
			score > 0.7,
			`Word "${word}" expected score > 0.70, got ${score}`,
		);

		const result = estimateAmiramLevel(word);
		assert.equal(
			result.level,
			"C_advanced",
			`Word "${word}" expected level "C_advanced", got "${result.level}"`,
		);
		assert.equal(result.score, score);
		assert.equal(result.word, word);
	}

	// Individual assertions
	assert.ok(calculateComplexityScore("unprecedented") > 0.7);
	assert.equal(estimateAmiramLevel("unprecedented").level, "C_advanced");

	assert.ok(calculateComplexityScore("indispensable") > 0.7);
	assert.equal(estimateAmiramLevel("indispensable").level, "C_advanced");

	assert.ok(calculateComplexityScore("contradictory") > 0.7);
	assert.equal(estimateAmiramLevel("contradictory").level, "C_advanced");
});

test("4. scores are always bounded within [0, 1] across arbitrary and extreme inputs", () => {
	const sampleWords = [
		"",
		"a",
		"ox",
		"cat",
		"sing",
		"ancient",
		"unprecedented",
		"supercalifragilisticexpialidocious",
		"pseudopseudohypoparathyroidism",
		"electroencephalographically",
	];

	for (const w of sampleWords) {
		const score = calculateComplexityScore(w);
		assert.ok(
			score >= 0 && score <= 1,
			`Score for "${w}" should be within [0, 1], got ${score}`,
		);

		const result = estimateAmiramLevel(w);
		assert.ok(
			result.score >= 0 && result.score <= 1,
			`Result score for "${w}" should be within [0, 1], got ${result.score}`,
		);
	}
});

test("5. monotonic sanity: longer and more syllabic words score higher than short simple ones", () => {
	const pairs = [
		["sing", "ancient"],
		["dice", "achieve"],
		["ancient", "unprecedented"],
		["fragile", "indispensable"],
		["fear", "contradictory"],
	];

	for (const [shortWord, longWord] of pairs) {
		const scoreShort = calculateComplexityScore(shortWord);
		const scoreLong = calculateComplexityScore(longWord);
		assert.ok(
			scoreLong > scoreShort,
			`Expected "${longWord}" (${scoreLong}) to score higher than "${shortWord}" (${scoreShort})`,
		);
	}
});

test("6. suffix words score strictly above their stems", () => {
	assert.ok(
		calculateComplexityScore("methodological") >
			calculateComplexityScore("method"),
		"methodological should score above method",
	);

	assert.ok(
		calculateComplexityScore("organization") >
			calculateComplexityScore("organ"),
		"organization should score above organ",
	);

	assert.ok(
		calculateComplexityScore("gratitude") >
			calculateComplexityScore("grateful"),
		"gratitude should score above grateful",
	);

	assert.ok(
		calculateComplexityScore("gratitude") > calculateComplexityScore("grate"),
		"gratitude should score above grate",
	);
});

test("7. upper case and punctuation normalize cleanly ('ANCIENT!' equals 'ancient')", () => {
	const canonical = estimateAmiramLevel("ancient");
	const messy = estimateAmiramLevel("ANCIENT!");

	assert.equal(messy.word, canonical.word);
	assert.equal(messy.score, canonical.score);
	assert.equal(messy.level, canonical.level);
	assert.deepEqual(messy.factors, canonical.factors);

	assert.equal(
		calculateComplexityScore("---FEAR---"),
		calculateComplexityScore("fear"),
	);
	assert.equal(
		calculateComplexityScore("UnPreCeDenTed?!"),
		calculateComplexityScore("unprecedented"),
	);
});

test("8. empty string, whitespace, null, undefined, and numbers never throw and return safe defaults", () => {
	const invalidInputs = [
		"",
		"   ",
		"\t\n",
		null,
		undefined,
		123,
		0,
		Number.NaN,
		{},
		[],
		true,
		false,
	];

	for (const input of invalidInputs) {
		assert.doesNotThrow(() => {
			const score = calculateComplexityScore(input);
			assert.equal(score, 0);

			const result = estimateAmiramLevel(input);
			assert.deepEqual(result, {
				word: "",
				score: 0,
				level: "A_foundational",
				factors: {
					length: 0,
					syllables: 0,
					suffix: 0,
					morphology: 0,
				},
			});
		});
	}
});

test("9. factors object conforms to the expected shape and numeric ranges", () => {
	const result = estimateAmiramLevel("ancient");
	assert.ok(result.factors);

	assert.equal(typeof result.factors.length, "number");
	assert.equal(typeof result.factors.syllables, "number");
	assert.equal(typeof result.factors.suffix, "number");
	assert.equal(typeof result.factors.morphology, "number");

	for (const [key, value] of Object.entries(result.factors)) {
		assert.ok(
			value >= 0 && value <= 1,
			`Factor "${key}" should be in [0, 1], got ${value}`,
		);
	}
});

test("10. determinism: repeated calls on identical inputs yield identical outputs", () => {
	const words = [
		"sing",
		"ancient",
		"unprecedented",
		"methodological",
		"gratitude",
	];

	for (const word of words) {
		const firstScore = calculateComplexityScore(word);
		const firstLevel = estimateAmiramLevel(word);

		for (let i = 0; i < 20; i++) {
			assert.equal(calculateComplexityScore(word), firstScore);
			assert.deepEqual(estimateAmiramLevel(word), firstLevel);
		}
	}
});

test("11. WEIGHTS object contract: frozen, non-empty, and weights sum to exactly 1.0", () => {
	assert.ok(Object.isFrozen(WEIGHTS), "WEIGHTS object should be frozen");

	const sum =
		WEIGHTS.length + WEIGHTS.syllables + WEIGHTS.suffix + WEIGHTS.morphology;
	assert.equal(Number(sum.toFixed(2)), 1);

	assert.ok(WEIGHTS.length > 0);
	assert.ok(WEIGHTS.syllables > 0);
	assert.ok(WEIGHTS.suffix > 0);
	assert.ok(WEIGHTS.morphology > 0);
});

test("12. complex academic suffixes assign full suffixFactor of 1.0", () => {
	const complexWords = [
		"methodological",
		"organization",
		"consciousness",
		"gratitude",
	];

	for (const w of complexWords) {
		const result = estimateAmiramLevel(w);
		assert.equal(
			result.factors.suffix,
			1.0,
			`Word "${w}" should have suffix factor 1.0, got ${result.factors.suffix}`,
		);
	}
});

test("13. partial academic suffixes assign partial suffixFactor of 0.70", () => {
	const partialWords = [
		"unprecedented",
		"indispensable",
		"incredible",
		"difference",
		"importance",
		"ambitious",
		"contradictory",
	];

	for (const w of partialWords) {
		const result = estimateAmiramLevel(w);
		assert.equal(
			result.factors.suffix,
			0.7,
			`Word "${w}" should have suffix factor 0.70, got ${result.factors.suffix}`,
		);
	}
});

test("14. morphological prefixes elevate the complexity score", () => {
	const prefixedResult = estimateAmiramLevel("unprecedented");
	assert.equal(prefixedResult.factors.morphology, 1.0);

	const unprefixedResult = estimateAmiramLevel("ancient");
	assert.equal(unprefixedResult.factors.morphology, 0.0);
});
