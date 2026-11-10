const test = require("node:test");
const assert = require("node:assert/strict");
const {
	findCollocations,
	validatePreposition,
	COLLOCATIONS,
} = require("../src/collocation_matcher.js");

test("dictionary has 25 entries", () => assert.equal(COLLOCATIONS.length, 25));
test("finds valid collocation", () => {
	const hits = findCollocations("She is capable of solving it.");
	assert.equal(hits.length, 1);
	assert.equal(hits[0].baseWord, "capable");
	assert.equal(hits[0].preposition, "of");
});
test("wrong preposition interested for", () => {
	const v = validatePreposition("interested", "for");
	assert.equal(v.isValid, false);
	assert.equal(v.expectedPreposition, "in");
	assert.equal(v.commonMistake, true);
});
test("valid preposition", () => {
	const v = validatePreposition("depend", "on");
	assert.equal(v.isValid, true);
});
test("empty input", () => {
	assert.deepEqual(findCollocations(""), []);
	assert.deepEqual(findCollocations(null), []);
});
test("uppercase and punctuation", () => {
	const hits = findCollocations("AFRAID OF SPIDERS!!!");
	assert.equal(hits[0].baseWord, "afraid");
	assert.equal(hits[0].preposition, "of");
});

test("mixed case in findCollocations and validatePreposition", () => {
	const hits = findCollocations(
		"He is Capable Of great things and Interested In art.",
	);
	assert.equal(hits.length, 2);
	assert.deepEqual(hits[0], {
		baseWord: "capable",
		preposition: "of",
		fullPhrase: "capable of",
		hebrewMeaning: "מסוגל ל-",
	});
	assert.deepEqual(hits[1], {
		baseWord: "interested",
		preposition: "in",
		fullPhrase: "interested in",
		hebrewMeaning: "מתעניין ב-",
	});

	const validMixed = validatePreposition("Capable", "Of");
	assert.deepEqual(validMixed, {
		isValid: true,
		expectedPreposition: "of",
		commonMistake: false,
	});

	const mistakeMixed = validatePreposition("Interested", "For");
	assert.deepEqual(mistakeMixed, {
		isValid: false,
		expectedPreposition: "in",
		commonMistake: true,
	});
});

test("double spaces and irregular whitespace normalization", () => {
	const hits = findCollocations(
		"She is   capable    of   winning and   depend  \t\n  on   the team.",
	);
	assert.equal(hits.length, 2);
	assert.equal(hits[0].fullPhrase, "capable of");
	assert.equal(hits[0].preposition, "of");
	assert.equal(hits[1].fullPhrase, "depend on");
	assert.equal(hits[1].preposition, "on");

	const paddedValid = validatePreposition("   depend  ", "   on   ");
	assert.deepEqual(paddedValid, {
		isValid: true,
		expectedPreposition: "on",
		commonMistake: false,
	});

	const paddedWrong = validatePreposition("  afraid   ", "  from  ");
	assert.deepEqual(paddedWrong, {
		isValid: false,
		expectedPreposition: "of",
		commonMistake: true,
	});
});

test("multi-word phrases and complex sentences", () => {
	const sentence =
		"Although she is famous for her paintings and proud of her heritage, she remains different from her peers and married to her craft.";
	const hits = findCollocations(sentence);
	assert.equal(hits.length, 4);
	assert.deepEqual(
		hits.map((h) => h.fullPhrase),
		["famous for", "proud of", "different from", "married to"],
	);

	// Multi-word phrase passed directly to validatePreposition
	assert.deepEqual(validatePreposition("capable of"), {
		isValid: true,
		expectedPreposition: "of",
		commonMistake: false,
	});
	assert.deepEqual(validatePreposition("  Capable    Of  "), {
		isValid: true,
		expectedPreposition: "of",
		commonMistake: false,
	});
	assert.deepEqual(validatePreposition("interested for"), {
		isValid: false,
		expectedPreposition: "in",
		commonMistake: true,
	});
	assert.deepEqual(validatePreposition("She is capable of", "of"), {
		isValid: true,
		expectedPreposition: "of",
		commonMistake: false,
	});
});

test("duplicate prevention in collocation results and dictionary", () => {
	const baseSet = new Set(COLLOCATIONS.map((c) => c.base));
	assert.equal(baseSet.size, COLLOCATIONS.length);

	const repeatedText =
		"She is capable of coding, capable of leading, and truly CAPABLE   OF   teaching!";
	const hits = findCollocations(repeatedText);
	assert.equal(hits.length, 1);
	assert.equal(hits[0].fullPhrase, "capable of");

	// Repeated base word before the actual collocation
	const stutterText = "Wait, wait for the signal and listen, listen to me!";
	const stutterHits = findCollocations(stutterText);
	assert.equal(stutterHits.length, 2);
	assert.deepEqual(
		stutterHits.map((h) => h.fullPhrase),
		["listen to", "wait for"],
	);
});

test("edge cases: word boundaries, unknown words, and malformed inputs", () => {
	// Substring words should not trigger false positives
	assert.deepEqual(
		findCollocations("He is incapable of nothing. Note: goodness at work."),
		[],
	);

	for (const bad of [undefined, null, 123, {}, [], "   \t\n  ", "!!!"]) {
		assert.deepEqual(findCollocations(bad), []);
	}

	assert.deepEqual(validatePreposition("nonexistent", "of"), {
		isValid: false,
		expectedPreposition: null,
		commonMistake: false,
	});
	assert.deepEqual(validatePreposition(null, null), {
		isValid: false,
		expectedPreposition: null,
		commonMistake: false,
	});
});
