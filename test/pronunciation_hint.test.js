const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
	syllabifyWord,
	generatePhoneticHint,
} = require("../src/pronunciation_hint.js");

const AMIRAM_15_WORDS = Object.freeze([
	"make",
	"hope",
	"claim",
	"phrase",
	"know",
	"fragile",
	"ancient",
	"nation",
	"signal",
	"winter",
	"debate",
	"abundant",
	"condition",
	"independent",
	"community",
]);

test("syllabifies 1-syllable Amiram words correctly", () => {
	const oneSyllableWords = ["make", "hope", "claim", "phrase", "know"];
	for (const word of oneSyllableWords) {
		const res = syllabifyWord(word);
		assert.equal(
			res.syllables.length,
			1,
			`Word ${word} should have 1 syllable`,
		);
		assert.deepEqual(res.syllables, [word]);
	}
});

test("syllabifies 2-syllable Amiram words correctly", () => {
	const twoSyllableExpected = {
		fragile: ["frag", "ile"],
		ancient: ["an", `ci${"ent"}`],
		nation: ["na", "tion"],
		signal: ["sig", "nal"],
		winter: ["win", "ter"],
		debate: ["de", "bate"],
	};
	for (const [word, expected] of Object.entries(twoSyllableExpected)) {
		const res = syllabifyWord(word);
		assert.equal(
			res.syllables.length,
			2,
			`Word ${word} should have 2 syllables`,
		);
		assert.deepEqual(res.syllables, expected);
	}
});

test("syllabifies 3-syllable Amiram words correctly", () => {
	const threeSyllableExpected = {
		abundant: ["a", "bun", "dant"],
		condition: ["con", "di", "tion"],
	};
	for (const [word, expected] of Object.entries(threeSyllableExpected)) {
		const res = syllabifyWord(word);
		assert.equal(
			res.syllables.length,
			3,
			`Word ${word} should have 3 syllables`,
		);
		assert.deepEqual(res.syllables, expected);
	}
});

test("syllabifies 4-syllable Amiram words correctly", () => {
	const fourSyllableExpected = {
		independent: ["in", "de", "pen", "dent"],
		community: ["com", "mu", "ni", "ty"],
	};
	for (const [word, expected] of Object.entries(fourSyllableExpected)) {
		const res = syllabifyWord(word);
		assert.equal(
			res.syllables.length,
			4,
			`Word ${word} should have 4 syllables`,
		);
		assert.deepEqual(res.syllables, expected);
	}
});

test("exact required results: abundant, fragile, ancient, make", () => {
	assert.deepEqual(syllabifyWord("abundant").syllables, ["a", "bun", "dant"]);
	assert.deepEqual(syllabifyWord("fragile").syllables, ["frag", "ile"]);
	assert.deepEqual(syllabifyWord("ancient").syllables, ["an", `ci${"ent"}`]);
	assert.deepEqual(syllabifyWord("make").syllables, ["make"]);
});

test("silent final e is handled correctly (make, fragile, debate, hope)", () => {
	assert.equal(syllabifyWord("make").syllables.length, 1);
	assert.equal(syllabifyWord("fragile").syllables.length, 2);
	assert.equal(syllabifyWord("debate").syllables.length, 2);
	assert.equal(syllabifyWord("hope").syllables.length, 1);
});

test("hyphenated output matches syllables joined with dash", () => {
	for (const word of AMIRAM_15_WORDS) {
		const res = syllabifyWord(word);
		assert.equal(res.hyphenated, res.syllables.join("-"));
	}
});

test("syllables.join('') equals the cleaned word for all 15 Amiram key words", () => {
	assert.equal(AMIRAM_15_WORDS.length, 15);
	for (const word of AMIRAM_15_WORDS) {
		const res = syllabifyWord(word);
		assert.equal(res.syllables.join(""), word);
	}
});

test("phonetic guide: initial kn -> n (knowledge, know)", () => {
	const knowRes = generatePhoneticHint("know");
	assert.deepEqual(knowRes.syllables, ["know"]);
	assert.equal(knowRes.hyphenated, "know");
	assert.equal(knowRes.phoneticGuide, "now");

	const knowledgeRes = generatePhoneticHint("knowledge");
	assert.deepEqual(knowledgeRes.syllables, ["know", "ledge"]);
	assert.equal(knowledgeRes.hyphenated, "know-ledge");
	assert.equal(knowledgeRes.phoneticGuide, "now-ledg");
});

test("phonetic guide: ph -> f and silent final e dropped (phrase)", () => {
	const res = generatePhoneticHint("phrase");
	assert.deepEqual(res.syllables, ["phrase"]);
	assert.equal(res.hyphenated, "phrase");
	assert.equal(res.phoneticGuide, "fras");
});

test("phonetic guide: tion -> shun (nation)", () => {
	const res = generatePhoneticHint("nation");
	assert.deepEqual(res.syllables, ["na", "tion"]);
	assert.equal(res.hyphenated, "na-tion");
	assert.equal(res.phoneticGuide, "na-shun");
});

test("phonetic guide: ancient ending replaced with shent", () => {
	const res = generatePhoneticHint("ancient");
	assert.deepEqual(res.syllables, ["an", `ci${"ent"}`]);
	assert.equal(res.hyphenated, `an-ci${"ent"}`);
	assert.equal(res.phoneticGuide, "an-shent");
});

test("phonetic guide: wr -> r, sion -> zhun, and ck -> k", () => {
	const writeRes = generatePhoneticHint("write");
	assert.equal(writeRes.phoneticGuide, "rit");

	const decisionRes = generatePhoneticHint("decision");
	assert.equal(decisionRes.phoneticGuide, "de-ci-zhun");

	const pocketRes = generatePhoneticHint("pocket");
	assert.equal(pocketRes.phoneticGuide, "pok-et");
});

test("single letter 'a' is handled safely as single syllable", () => {
	const syllRes = syllabifyWord("a");
	assert.deepEqual(syllRes, { syllables: ["a"], hyphenated: "a" });

	const hintRes = generatePhoneticHint("a");
	assert.deepEqual(hintRes, {
		syllables: ["a"],
		hyphenated: "a",
		phoneticGuide: "a",
	});
});

test("empty string, whitespace, numbers, symbols, null, and undefined never throw", () => {
	const invalidInputs = [
		null,
		undefined,
		"",
		"   ",
		"\t\n",
		"12345",
		"!@#$%",
		42,
		{},
		[],
	];
	for (const input of invalidInputs) {
		const syllRes = syllabifyWord(input);
		assert.deepEqual(syllRes, { syllables: [], hyphenated: "" });

		const hintRes = generatePhoneticHint(input);
		assert.deepEqual(hintRes, {
			syllables: [],
			hyphenated: "",
			phoneticGuide: "",
		});
	}
});

test("normalizes uppercase and strips surrounding punctuation", () => {
	const res = syllabifyWord("  --ABUNDANT!!  ");
	assert.deepEqual(res.syllables, ["a", "bun", "dant"]);
	assert.equal(res.hyphenated, "a-bun-dant");

	const hintRes = generatePhoneticHint("...PHRASE??");
	assert.deepEqual(hintRes.syllables, ["phrase"]);
	assert.equal(hintRes.hyphenated, "phrase");
	assert.equal(hintRes.phoneticGuide, "fras");
});

test("edge cases: compound words with hyphens", () => {
	const wellKnown = generatePhoneticHint("well-known");
	assert.deepEqual(wellKnown.syllables, ["well", "known"]);
	assert.equal(wellKnown.hyphenated, "well-known");
	assert.equal(wellKnown.phoneticGuide, `well-n${"own"}`);

	const stateOfTheArt = syllabifyWord("state-of-the-art");
	assert.deepEqual(stateOfTheArt.syllables, ["state", "of", "the", "art"]);
	assert.equal(stateOfTheArt.hyphenated, "state-of-the-art");

	const selfIndependent = syllabifyWord("self-independent");
	assert.deepEqual(selfIndependent.syllables, [
		"self",
		"in",
		"de",
		"pen",
		"dent",
	]);
	assert.equal(selfIndependent.hyphenated, "self-in-de-pen-dent");

	const enEmDash = syllabifyWord("  --well–known—nation--  ");
	assert.deepEqual(enEmDash.syllables, ["well", "known", "na", "tion"]);
	assert.equal(enEmDash.hyphenated, "well-known-na-tion");
});

test("edge cases: single-letter words (vowels, consonants, uppercase, padded)", () => {
	const letters = ["a", "I", "o", "b", "x", "y", "z"];
	for (const letter of letters) {
		const expected = letter.toLowerCase();
		const syllRes = syllabifyWord(`  '${letter}'! `);
		assert.deepEqual(syllRes, {
			syllables: [expected],
			hyphenated: expected,
		});

		const hintRes = generatePhoneticHint(letter);
		assert.deepEqual(hintRes, {
			syllables: [expected],
			hyphenated: expected,
			phoneticGuide: expected,
		});
	}

	const hyphenatedSingleLetters = syllabifyWord("a-b-c");
	assert.deepEqual(hyphenatedSingleLetters, {
		syllables: ["a", "b", "c"],
		hyphenated: "a-b-c",
	});
});

test("edge cases: special characters, unicode, digits, and hyphen-only strings", () => {
	const nonAlphaInputs = [
		"---",
		" - - -- ",
		"–—",
		"שלום",
		"123-456",
		"!@#$%^&*()",
		"🚀✨🎯",
	];
	for (const input of nonAlphaInputs) {
		assert.deepEqual(syllabifyWord(input), {
			syllables: [],
			hyphenated: "",
		});
		assert.deepEqual(generatePhoneticHint(input), {
			syllables: [],
			hyphenated: "",
			phoneticGuide: "",
		});
	}

	const mixedSpecial = generatePhoneticHint("123@NaTiOn#456");
	assert.deepEqual(mixedSpecial, {
		syllables: ["na", "tion"],
		hyphenated: "na-tion",
		phoneticGuide: "na-shun",
	});

	const mixedFragile = syllabifyWord("$$fragile!!");
	assert.deepEqual(mixedFragile, {
		syllables: ["frag", "ile"],
		hyphenated: "frag-ile",
	});
});
