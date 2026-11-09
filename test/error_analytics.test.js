const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
	analyzeMistakePattern,
	generateDiagnosticSummary,
	POS_HEBREW,
} = require("../src/error_analytics.js");

test("1. POS confusion: detects when target and distractor have different known parts of speech", () => {
	// target: Verb, chosen: Noun
	const res1 = analyzeMistakePattern("encourage", "peace");
	assert.equal(res1.posConfusion, true);
	assert.equal(res1.targetPOS, "Verb");
	assert.equal(res1.chosenPOS, "Noun");
	assert.equal(res1.phoneticTrap, false);

	// target: Adjective, chosen: Adverb
	const res2 = analyzeMistakePattern("calm", "enough");
	assert.equal(res2.posConfusion, true);
	assert.equal(res2.targetPOS, "Adjective");
	assert.equal(res2.chosenPOS, "Adverb");

	// target: Noun (suffix), chosen: Adjective (suffix)
	const res3 = analyzeMistakePattern("creation", "helpful");
	assert.equal(res3.posConfusion, true);
	assert.equal(res3.targetPOS, "Noun");
	assert.equal(res3.chosenPOS, "Adjective");
});

test("2. rhyme trap: detects phonetic traps when target and distractor rhyme or sound alike", () => {
	// Exact rhyme: reflection / emotion (both Noun)
	const res1 = analyzeMistakePattern("reflection", "emotion");
	assert.equal(res1.phoneticTrap, true);
	assert.equal(res1.posConfusion, false);

	// Exact rhyme: future / nature (both Noun)
	const res2 = analyzeMistakePattern("future", "nature");
	assert.equal(res2.phoneticTrap, true);
	assert.equal(res2.posConfusion, false);

	// Slant rhyme: dream / lean
	const res3 = analyzeMistakePattern("dream", "lean");
	assert.equal(res3.phoneticTrap, true);

	// Identical words are not a trap
	const res4 = analyzeMistakePattern("peace", "peace");
	assert.equal(res4.phoneticTrap, false);
});

test("3. neither: returns false for posConfusion and phoneticTrap when words share POS and do not rhyme", () => {
	// Both Nouns from VOCAB_TAXONOMY, no rhyme
	const res1 = analyzeMistakePattern("peace", "comfort");
	assert.equal(res1.posConfusion, false);
	assert.equal(res1.phoneticTrap, false);
	assert.equal(res1.targetPOS, "Noun");
	assert.equal(res1.chosenPOS, "Noun");

	// Both Adjectives, no rhyme
	const res2 = analyzeMistakePattern("calm", "strong");
	assert.equal(res2.posConfusion, false);
	assert.equal(res2.phoneticTrap, false);
	assert.equal(res2.targetPOS, "Adjective");
	assert.equal(res2.chosenPOS, "Adjective");
});

test("4. percentages: correctly calculates integer percentages for POS confusions and phonetic traps", () => {
	const list = [
		{ targetWord: "encourage", chosenDistractor: "peace" }, // POS confusion only (Verb vs Noun)
		{ targetWord: "reflection", chosenDistractor: "emotion" }, // Rhyme trap only (Noun vs Noun)
		{ targetWord: "peace", chosenDistractor: "comfort" }, // Neither
	];

	const summary = generateDiagnosticSummary(list);
	assert.equal(summary.total, 3);
	// 1/3 = 33%
	assert.equal(summary.posConfusionPercent, 33);
	assert.equal(summary.phoneticTrapPercent, 33);
	assert.equal(summary.dominantBlindspot, "none");

	const list2 = [
		{ targetWord: "encourage", chosenDistractor: "peace" }, // POS
		{ targetWord: "calm", chosenDistractor: "enough" }, // POS
		{ targetWord: "peace", chosenDistractor: "comfort" }, // Neither
		{ targetWord: "memory", chosenDistractor: "regret" }, // Neither
	];

	const summary2 = generateDiagnosticSummary(list2);
	assert.equal(summary2.total, 4);
	// 2/4 = 50%
	assert.equal(summary2.posConfusionPercent, 50);
	assert.equal(summary2.phoneticTrapPercent, 0);
	assert.equal(summary2.dominantBlindspot, "pos");
});

test("5. dominant blindspot both ways: correctly identifies 'pos' and 'phonetic' dominant blindspots", () => {
	// Dominant POS
	const posHeavyList = [
		{ targetWord: "encourage", chosenDistractor: "peace" }, // POS (Verb vs Noun)
		{ targetWord: "calm", chosenDistractor: "enough" }, // POS (Adj vs Adv)
		{ targetWord: "reflection", chosenDistractor: "emotion" }, // Phonetic (Noun vs Noun)
	];
	const posSummary = generateDiagnosticSummary(posHeavyList);
	assert.equal(posSummary.dominantBlindspot, "pos");
	assert.equal(posSummary.posConfusionPercent, 67);
	assert.equal(posSummary.phoneticTrapPercent, 33);

	// Dominant Phonetic
	const phoneticHeavyList = [
		{ targetWord: "reflection", chosenDistractor: "emotion" }, // Phonetic
		{ targetWord: "future", chosenDistractor: "nature" }, // Phonetic
		{ targetWord: "encourage", chosenDistractor: "peace" }, // POS
	];
	const phoneticSummary = generateDiagnosticSummary(phoneticHeavyList);
	assert.equal(phoneticSummary.dominantBlindspot, "phonetic");
	assert.equal(phoneticSummary.posConfusionPercent, 33);
	assert.equal(phoneticSummary.phoneticTrapPercent, 67);

	// Tie
	const tieList = [
		{ targetWord: "encourage", chosenDistractor: "peace" }, // POS
		{ targetWord: "reflection", chosenDistractor: "emotion" }, // Phonetic
	];
	const tieSummary = generateDiagnosticSummary(tieList);
	assert.equal(tieSummary.dominantBlindspot, "none");
});

test("6. tip text: formats Hebrew diagnostic tips with accurate percentages and details", () => {
	// POS dominant tip should name most common chosen-vs-target POS pair in Hebrew
	// 3 mistakes where chosen is Adjective ("calm") and target is Verb ("encourage")
	// 1 mistake where chosen is Noun ("peace") and target is Verb ("encourage")
	// 1 phonetic mistake
	const mistakes = [
		{ targetWord: "encourage", chosenDistractor: "calm" }, // target: Verb, chosen: Adj
		{ targetWord: "encourage", chosenDistractor: "calm" }, // target: Verb, chosen: Adj
		{ targetWord: "encourage", chosenDistractor: "calm" }, // target: Verb, chosen: Adj
		{ targetWord: "encourage", chosenDistractor: "peace" }, // target: Verb, chosen: Noun
		{ targetWord: "reflection", chosenDistractor: "emotion" }, // Phonetic (Noun vs Noun)
	];

	const summary = generateDiagnosticSummary(mistakes);
	assert.equal(summary.dominantBlindspot, "pos");
	assert.equal(summary.posConfusionPercent, 80);
	// chosen is Adjective (שם תואר), target is Verb (פועל)
	assert.equal(
		summary.tipHe,
		"80% מהטעויות שלך נובעות מבחירת שם תואר במקום פועל",
	);

	// Phonetic dominant tip
	const phoneticMistakes = [
		{ targetWord: "reflection", chosenDistractor: "emotion" },
		{ targetWord: "future", chosenDistractor: "nature" },
	];
	const phoneticSummary = generateDiagnosticSummary(phoneticMistakes);
	assert.equal(phoneticSummary.dominantBlindspot, "phonetic");
	assert.equal(phoneticSummary.phoneticTrapPercent, 100);
	assert.ok(phoneticSummary.tipHe.includes("100%"));
	assert.ok(
		phoneticSummary.tipHe.includes("פונטי") ||
			phoneticSummary.tipHe.includes("צליל דומה"),
	);
});

test("7. empty list: returns safe zero defaults and an encouraging Hebrew tip for empty or missing list", () => {
	const expected = {
		total: 0,
		posConfusionPercent: 0,
		phoneticTrapPercent: 0,
		dominantBlindspot: "none",
		tipHe: "אין טעויות לניתוח! המשך כך בתרגול.",
	};

	assert.deepEqual(generateDiagnosticSummary([]), expected);
	assert.deepEqual(generateDiagnosticSummary(), expected);
	assert.deepEqual(generateDiagnosticSummary(null), expected);
	assert.deepEqual(generateDiagnosticSummary("not an array"), expected);
});

test("8. invalid items ignored: gracefully skips malformed items in list and invalid arguments in pattern analyzer", () => {
	// analyzeMistakePattern with invalid inputs
	const invalidInputs = [
		[null, null],
		[undefined, "word"],
		["word", undefined],
		["", "word"],
		["word", "   "],
		[123, "word"],
		[{}, []],
	];

	for (const [target, chosen] of invalidInputs) {
		const res = analyzeMistakePattern(target, chosen);
		assert.deepEqual(res, {
			posConfusion: false,
			phoneticTrap: false,
			targetPOS: null,
			chosenPOS: null,
		});
	}

	// generateDiagnosticSummary skips invalid entries without crashing
	const mixedList = [
		null,
		undefined,
		{},
		{ targetWord: 42, chosenDistractor: "test" },
		{ targetWord: "peace", chosenDistractor: null },
		{ targetWord: "  ", chosenDistractor: "valid" },
		{ targetWord: "encourage", chosenDistractor: "peace" }, // valid POS confusion
	];

	const summary = generateDiagnosticSummary(mixedList);
	assert.equal(summary.total, 1);
	assert.equal(summary.posConfusionPercent, 100);
	assert.equal(summary.phoneticTrapPercent, 0);
	assert.equal(summary.dominantBlindspot, "pos");
});

test("9. input not mutated: frozen inputs and lists remain untouched", () => {
	const frozenItem1 = Object.freeze({
		targetWord: "encourage",
		chosenDistractor: "peace",
	});
	const frozenItem2 = Object.freeze({
		targetWord: "reflection",
		chosenDistractor: "emotion",
	});
	const frozenList = Object.freeze([frozenItem1, frozenItem2]);

	const summary = generateDiagnosticSummary(frozenList);
	assert.equal(summary.total, 2);
	assert.equal(frozenItem1.targetWord, "encourage");
	assert.equal(frozenItem1.chosenDistractor, "peace");
	assert.equal(frozenList.length, 2);
});

test("10. UMD export and constants: exports POS_HEBREW and functions correctly", () => {
	assert.equal(typeof analyzeMistakePattern, "function");
	assert.equal(typeof generateDiagnosticSummary, "function");
	assert.equal(POS_HEBREW.Noun, "שם עצם");
	assert.equal(POS_HEBREW.Verb, "פועל");
	assert.equal(POS_HEBREW.Adjective, "שם תואר");
	assert.equal(POS_HEBREW.Adverb, "תואר הפועל");
});
