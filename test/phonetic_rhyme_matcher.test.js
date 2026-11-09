const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
	checkWordRhyme,
	analyzeStanzaRhymeScheme,
} = require("../src/phonetic_rhyme_matcher.js");

test("1. identical words return type IDENTICAL with score 0.0 and isIdentical true", () => {
	const words = ["night", "cat", "day", "shape", "time"];

	for (const word of words) {
		const result = checkWordRhyme(word, word);
		assert.equal(result.type, "IDENTICAL", `Expected IDENTICAL for "${word}"`);
		assert.equal(result.score, 0.0);
		assert.equal(result.isIdentical, true);
	}

	const diffCaseResult = checkWordRhyme("Night", "night");
	assert.equal(diffCaseResult.type, "IDENTICAL");
	assert.equal(diffCaseResult.score, 0.0);
	assert.equal(diffCaseResult.isIdentical, true);
});

test("2. night/bright, cat/hat, and day/play match as EXACT rhymes with score 1.0", () => {
	const exactPairs = [
		["night", "bright"],
		["cat", "hat"],
		["day", "play"],
	];

	for (const [w1, w2] of exactPairs) {
		const forward = checkWordRhyme(w1, w2);
		assert.equal(
			forward.type,
			"EXACT",
			`Expected EXACT rhyme for "${w1}" and "${w2}"`,
		);
		assert.equal(forward.score, 1.0);
		assert.equal(forward.isIdentical, false);

		const reverse = checkWordRhyme(w2, w1);
		assert.equal(
			reverse.type,
			"EXACT",
			`Expected symmetric EXACT rhyme for "${w2}" and "${w1}"`,
		);
		assert.equal(reverse.score, 1.0);
		assert.equal(reverse.isIdentical, false);
	}
});

test("3. shape/late and time/line match as SLANT rhymes (assonance) with score 0.6", () => {
	const slantPairs = [
		["shape", "late"],
		["time", "line"],
	];

	for (const [w1, w2] of slantPairs) {
		const forward = checkWordRhyme(w1, w2);
		assert.equal(
			forward.type,
			"SLANT",
			`Expected SLANT rhyme for "${w1}" and "${w2}"`,
		);
		assert.equal(forward.score, 0.6);
		assert.equal(forward.isIdentical, false);

		const reverse = checkWordRhyme(w2, w1);
		assert.equal(
			reverse.type,
			"SLANT",
			`Expected symmetric SLANT rhyme for "${w2}" and "${w1}"`,
		);
		assert.equal(reverse.score, 0.6);
		assert.equal(reverse.isIdentical, false);
	}
});

test("4. non-rhyming words return NONE with score 0.0", () => {
	const nonRhymingPairs = [
		["cat", "dog"],
		["night", "hat"],
		["sun", "moon"],
		["sing", "late"],
	];

	for (const [w1, w2] of nonRhymingPairs) {
		const result = checkWordRhyme(w1, w2);
		assert.equal(result.type, "NONE");
		assert.equal(result.score, 0.0);
		assert.equal(result.isIdentical, false);
	}
});

test("5. case and punctuation are normalized properly", () => {
	const exactPunct = checkWordRhyme("Night!", "BRIGHT?");
	assert.equal(exactPunct.type, "EXACT");
	assert.equal(exactPunct.score, 1.0);
	assert.equal(exactPunct.isIdentical, false);

	const slantPunct = checkWordRhyme("  SHAPE,  ", "late...");
	assert.equal(slantPunct.type, "SLANT");
	assert.equal(slantPunct.score, 0.6);
	assert.equal(slantPunct.isIdentical, false);

	const identicalPunct = checkWordRhyme("Night!", "night...");
	assert.equal(identicalPunct.type, "IDENTICAL");
	assert.equal(identicalPunct.score, 0.0);
	assert.equal(identicalPunct.isIdentical, true);
});

test("6. AABB, ABAB, and ABCB stanzas detected accurately", () => {
	const stanzaAABB = [
		"I walk into the quiet night,",
		"The stars above are shining bright,",
		"I look forward to a sunny day,",
		"Where happy children run and play.",
	];
	const resultAABB = analyzeStanzaRhymeScheme(stanzaAABB);
	assert.equal(resultAABB.scheme, "AABB");
	assert.equal(resultAABB.pattern, "AABB");

	const stanzaABAB = [
		"I walk into the quiet night,",
		"I look forward to a sunny day,",
		"The stars above are shining bright,",
		"Where happy children run and play.",
	];
	const resultABAB = analyzeStanzaRhymeScheme(stanzaABAB);
	assert.equal(resultABAB.scheme, "ABAB");
	assert.equal(resultABAB.pattern, "ABAB");

	const stanzaABCB = [
		"The flowers in the bed,",
		"I walk into the night,",
		"Looking at the moon,",
		"The stars are shining bright.",
	];
	const resultABCB = analyzeStanzaRhymeScheme(stanzaABCB);
	assert.equal(resultABCB.scheme, "ABCB");
	assert.equal(resultABCB.pattern, "ABCB");
});

test("7. score range is integer between 0 and 100 with accurate weighting", () => {
	const fullExactStanza = [
		"The starry night,",
		"Shining bright,",
		"A sunny day,",
		"We will play.",
	];
	const resFullExact = analyzeStanzaRhymeScheme(fullExactStanza);
	assert.equal(resFullExact.score, 100);
	assert.equal(Number.isInteger(resFullExact.score), true);

	const halfExactStanza = [
		"The flowers in the bed,",
		"The starry night,",
		"Looking at the moon,",
		"Shining so bright.",
	];
	const resHalfExact = analyzeStanzaRhymeScheme(halfExactStanza);
	assert.equal(resHalfExact.score, 50);
	assert.equal(Number.isInteger(resHalfExact.score), true);

	const fullSlantStanza = [
		"I like the shape,",
		"You are so late,",
		"There is still time,",
		"Stand in a line.",
	];
	const resFullSlant = analyzeStanzaRhymeScheme(fullSlantStanza);
	assert.equal(resFullSlant.score, 60);
	assert.equal(Number.isInteger(resFullSlant.score), true);

	const noRhymeStanza = [
		"The little black cat,",
		"Lies on the soft bed,",
		"Feeding the small pig,",
		"Under the warm sun.",
	];
	const resNoRhyme = analyzeStanzaRhymeScheme(noRhymeStanza);
	assert.equal(resNoRhyme.score, 0);
	assert.equal(Number.isInteger(resNoRhyme.score), true);
});

test("8. empty and invalid inputs return safe defaults without throwing", () => {
	assert.deepEqual(checkWordRhyme("", ""), {
		type: "NONE",
		score: 0.0,
		isIdentical: false,
	});
	assert.deepEqual(checkWordRhyme(null, undefined), {
		type: "NONE",
		score: 0.0,
		isIdentical: false,
	});
	assert.deepEqual(checkWordRhyme(123, {}), {
		type: "NONE",
		score: 0.0,
		isIdentical: false,
	});
	assert.deepEqual(checkWordRhyme("!@#", "   "), {
		type: "NONE",
		score: 0.0,
		isIdentical: false,
	});

	assert.deepEqual(analyzeStanzaRhymeScheme([]), {
		scheme: "",
		pattern: "OTHER",
		score: 0,
	});
	assert.deepEqual(analyzeStanzaRhymeScheme(null), {
		scheme: "",
		pattern: "OTHER",
		score: 0,
	});
	assert.deepEqual(analyzeStanzaRhymeScheme(undefined), {
		scheme: "",
		pattern: "OTHER",
		score: 0,
	});
	assert.deepEqual(analyzeStanzaRhymeScheme("not an array"), {
		scheme: "",
		pattern: "OTHER",
		score: 0,
	});
});

test("9. multi-syllable words match rhymes based on last syllable via syllabifyWord", () => {
	const multiExact = checkWordRhyme("tonight", "bright");
	assert.equal(multiExact.type, "EXACT");
	assert.equal(multiExact.score, 1.0);

	const multiSlant = checkWordRhyme("escape", "late");
	assert.equal(multiSlant.type, "SLANT");
	assert.equal(multiSlant.score, 0.6);

	const multiSlant2 = checkWordRhyme("sublime", "line");
	assert.equal(multiSlant2.type, "SLANT");
	assert.equal(multiSlant2.score, 0.6);
});

test("10. identical words and non-standard schemes classify as OTHER pattern", () => {
	const stanzaIdenticalOnly = [
		"I walk into the night,",
		"In the quiet night,",
		"Looking at the sun,",
		"Under the bright sun.",
	];
	const resIdentical = analyzeStanzaRhymeScheme(stanzaIdenticalOnly);
	// Line 0 and 1 are identical (night/night); Line 2 and 3 are identical (sun/sun).
	// Since identical words are not rhymes (score 0), none rhyme with each other.
	assert.equal(resIdentical.scheme, "ABCD");
	assert.equal(resIdentical.pattern, "OTHER");
	assert.equal(resIdentical.score, 0);

	const stanzaABCD = [
		"The little cat,",
		"Lies on the bed,",
		"Feeding the pig,",
		"Under the sun.",
	];
	const resABCD = analyzeStanzaRhymeScheme(stanzaABCD);
	assert.equal(resABCD.pattern, "OTHER");
	assert.equal(resABCD.score, 0);
});
