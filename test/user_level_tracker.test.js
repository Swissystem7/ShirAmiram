const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
	AMIRAM_CEFR_BANDS,
	A1_BAND,
	VOCAB_TARGET,
	mapAmiramToCefr,
	evaluateCompetencyProfile,
} = require("../src/user_level_tracker.js");

test("1. AMIRAM_CEFR_BANDS exports frozen bands with midpoints, Hebrew labels and exemption flag", () => {
	assert.ok(Array.isArray(AMIRAM_CEFR_BANDS));
	assert.ok(Object.isFrozen(AMIRAM_CEFR_BANDS));
	assert.equal(AMIRAM_CEFR_BANDS.length, 5);

	const expectedBands = [
		{
			level: "A2",
			minScore: 50,
			maxScore: 84,
			midpoint: 67,
			label: "בסיסי",
			isExempt: false,
		},
		{
			level: "B1",
			minScore: 85,
			maxScore: 99,
			midpoint: 92,
			label: "טרום בינוני",
			isExempt: false,
		},
		{
			level: "B2",
			minScore: 100,
			maxScore: 119,
			midpoint: 109.5,
			label: "בינוני",
			isExempt: false,
		},
		{
			level: "C1",
			minScore: 120,
			maxScore: 133,
			midpoint: 126.5,
			label: "מתקדם",
			isExempt: false,
		},
		{
			level: "C2",
			minScore: 134,
			maxScore: 150,
			midpoint: 142,
			label: "מתקדם מאוד / פטור",
			isExempt: true,
		},
	];

	for (let i = 0; i < expectedBands.length; i += 1) {
		const expected = expectedBands[i];
		const actual = AMIRAM_CEFR_BANDS[i];
		assert.ok(Object.isFrozen(actual));
		assert.equal(actual.level, expected.level);
		assert.equal(actual.minScore, expected.minScore);
		assert.equal(actual.maxScore, expected.maxScore);
		assert.equal(actual.midpoint, expected.midpoint);
		assert.equal(actual.label, expected.label);
		assert.equal(actual.isExempt, expected.isExempt);
	}

	assert.equal(A1_BAND.level, "A1");
	assert.equal(A1_BAND.minScore, 0);
	assert.equal(A1_BAND.maxScore, 49);
	assert.equal(A1_BAND.midpoint, 24.5);
	assert.equal(A1_BAND.label, "טרום בסיסי");
	assert.equal(A1_BAND.isExempt, false);
	assert.ok(Object.isFrozen(A1_BAND));

	assert.equal(VOCAB_TARGET, 300);
});

test("2. mapAmiramToCefr maps every band boundary and handles edge cases", () => {
	// Every required boundary: 49, 50, 84, 85, 99, 100, 119, 120, 133, 134, 150
	const b49 = mapAmiramToCefr(49);
	assert.equal(b49.level, "A1");

	const b50 = mapAmiramToCefr(50);
	assert.equal(b50.level, "A2");
	assert.equal(b50.minScore, 50);

	const b84 = mapAmiramToCefr(84);
	assert.equal(b84.level, "A2");
	assert.equal(b84.maxScore, 84);

	const b85 = mapAmiramToCefr(85);
	assert.equal(b85.level, "B1");
	assert.equal(b85.minScore, 85);

	const b99 = mapAmiramToCefr(99);
	assert.equal(b99.level, "B1");
	assert.equal(b99.maxScore, 99);

	const b100 = mapAmiramToCefr(100);
	assert.equal(b100.level, "B2");
	assert.equal(b100.minScore, 100);

	const b119 = mapAmiramToCefr(119);
	assert.equal(b119.level, "B2");
	assert.equal(b119.maxScore, 119);

	const b120 = mapAmiramToCefr(120);
	assert.equal(b120.level, "C1");
	assert.equal(b120.minScore, 120);

	const b133 = mapAmiramToCefr(133);
	assert.equal(b133.level, "C1");
	assert.equal(b133.maxScore, 133);

	const b134 = mapAmiramToCefr(134);
	assert.equal(b134.level, "C2");
	assert.equal(b134.minScore, 134);
	assert.equal(b134.isExempt, true);

	const b150 = mapAmiramToCefr(150);
	assert.equal(b150.level, "C2");
	assert.equal(b150.maxScore, 150);

	// Clamping above 150 to C2
	const b160 = mapAmiramToCefr(160);
	assert.equal(b160.level, "C2");

	// Below 50 to A1
	const b0 = mapAmiramToCefr(0);
	assert.equal(b0.level, "A1");
	const bNegative = mapAmiramToCefr(-10);
	assert.equal(bNegative.level, "A1");

	// Invalid scores return null
	assert.equal(mapAmiramToCefr(Number.NaN), null);
	assert.equal(mapAmiramToCefr(Number.POSITIVE_INFINITY), null);
	assert.equal(mapAmiramToCefr(Number.NEGATIVE_INFINITY), null);
	assert.equal(mapAmiramToCefr("100"), null);
	assert.equal(mapAmiramToCefr(null), null);
	assert.equal(mapAmiramToCefr(undefined), null);
	assert.equal(mapAmiramToCefr({}), null);
	assert.equal(mapAmiramToCefr([]), null);
});

test("3. evaluateCompetencyProfile applies 60/40 exact weighting", () => {
	// Case A: Simulation 110, Mastered 150 (Vocab: 50 + 100 * (150/300) = 100)
	// Weighted: 0.6 * 110 + 0.4 * 100 = 66 + 40 = 106
	const historyA = [{ score: 110 }];
	const profileA = evaluateCompetencyProfile(historyA, 150);
	assert.equal(profileA.estimatedScore, 106);
	assert.equal(profileA.level, "B2");
	assert.equal(profileA.label, "בינוני");
	assert.deepEqual(profileA.range, {
		minScore: 100,
		maxScore: 119,
		midpoint: 109.5,
	});

	// Case B: Simulation 70, Mastered 300 (Vocab: 50 + 100 * 1 = 150)
	// Weighted: 0.6 * 70 + 0.4 * 150 = 42 + 60 = 102
	const historyB = [{ score: 70 }];
	const profileB = evaluateCompetencyProfile(historyB, 300);
	assert.equal(profileB.estimatedScore, 102);
	assert.equal(profileB.level, "B2");

	// Case C: Multiple simulations mean = (80 + 100 + 120) / 3 = 100
	// Mastered = 75 (Vocab: 50 + 100 * 0.25 = 75)
	// Weighted: 0.6 * 100 + 0.4 * 75 = 60 + 30 = 90
	const historyC = [{ score: 80 }, { score: 100 }, { score: 120 }];
	const profileC = evaluateCompetencyProfile(historyC, 75);
	assert.equal(profileC.estimatedScore, 90);
	assert.equal(profileC.level, "B1");
	assert.equal(profileC.label, "טרום בינוני");
	assert.deepEqual(profileC.range, {
		minScore: 85,
		maxScore: 99,
		midpoint: 92,
	});

	// Case D: Rounding check
	// Simulation 95, Vocab with 60 words: 50 + 100 * (60/300) = 70
	// Weighted: 0.6 * 95 + 0.4 * 70 = 57 + 28 = 85
	const profileD = evaluateCompetencyProfile([{ score: 95 }], 60);
	assert.equal(profileD.estimatedScore, 85);
	assert.equal(profileD.level, "B1");
});

test("4. evaluateCompetencyProfile checks isExempt threshold at >= 134", () => {
	// Score exactly 134: exempt
	// Simulation 140, Mastered 270 (Vocab: 50 + 100 * 0.9 = 140)
	// Weighted: 0.6 * 140 + 0.4 * 140 = 140 -> C2, isExempt: true
	const exemptProfile = evaluateCompetencyProfile([{ score: 140 }], 270);
	assert.equal(exemptProfile.isExempt, true);
	assert.equal(exemptProfile.level, "C2");
	assert.equal(exemptProfile.label, "מתקדם מאוד / פטור");

	// Boundary: 133 vs 134
	// Sim 130, Vocab 137.5 (262.5 words): 0.6 * 130 + 0.4 * 137.5 = 78 + 55 = 133
	// Let's use exact numbers:
	// Sim 133, Vocab 133 (Vocab target 300 -> 249 words gives 50 + 100*249/300 = 133)
	// 0.6 * 133 + 0.4 * 133 = 133 -> C1, isExempt: false
	const nonExemptProfile = evaluateCompetencyProfile([{ score: 133 }], 249);
	assert.equal(nonExemptProfile.estimatedScore, 133);
	assert.equal(nonExemptProfile.isExempt, false);
	assert.equal(nonExemptProfile.level, "C1");

	// Sim 134, Vocab 134 (252 words gives 50 + 100 * 252/300 = 134)
	// 0.6 * 134 + 0.4 * 134 = 134 -> C2, isExempt: true
	const atBoundaryProfile = evaluateCompetencyProfile([{ score: 134 }], 252);
	assert.equal(atBoundaryProfile.estimatedScore, 134);
	assert.equal(atBoundaryProfile.isExempt, true);
	assert.equal(atBoundaryProfile.level, "C2");
});

test("5. evaluateCompetencyProfile returns focus recommendation both ways", () => {
	// Simulation weaker than vocabulary -> להתמקד בסימולציות
	// Sim = 60, Mastered = 240 (Vocab = 50 + 80 = 130)
	const simWeaker = evaluateCompetencyProfile([{ score: 60 }], 240);
	assert.equal(simWeaker.focus, "להתמקד בסימולציות");

	// Vocabulary weaker than simulation -> להתמקד באוצר מילים
	// Sim = 130, Mastered = 30 (Vocab = 50 + 10 = 60)
	const vocabWeaker = evaluateCompetencyProfile([{ score: 130 }], 30);
	assert.equal(vocabWeaker.focus, "להתמקד באוצר מילים");

	// Zero simulation history, mastered words only -> weaker component is simulations
	const vocabOnly = evaluateCompetencyProfile([], 150);
	assert.equal(vocabOnly.focus, "להתמקד בסימולציות");

	// Simulation history with 0 mastered words -> weaker component is vocabulary
	const simOnly = evaluateCompetencyProfile([{ score: 100 }], 0);
	assert.equal(simOnly.focus, "להתמקד באוצר מילים");
});

test("6. evaluateCompetencyProfile handles empty history start level gracefully", () => {
	const startProfile = evaluateCompetencyProfile([], 0);
	assert.equal(startProfile.estimatedScore, null);
	assert.equal(startProfile.level, "A2");
	assert.equal(startProfile.label, "בסיסי");
	assert.equal(startProfile.isStart, true);
	assert.equal(startProfile.isExempt, false);
	assert.equal(startProfile.focus, "להתמקד באוצר מילים");
	assert.deepEqual(startProfile.range, {
		minScore: 50,
		maxScore: 84,
		midpoint: 67,
	});

	// Missing and undefined arguments safely return start profile
	const undefinedProfile = evaluateCompetencyProfile();
	assert.equal(undefinedProfile.estimatedScore, null);
	assert.equal(undefinedProfile.level, "A2");
	assert.equal(undefinedProfile.isStart, true);

	const nullProfile = evaluateCompetencyProfile(null, null);
	assert.equal(nullProfile.estimatedScore, null);
	assert.equal(nullProfile.level, "A2");
	assert.equal(nullProfile.isStart, true);
});

test("7. evaluateCompetencyProfile ignores invalid entries and supports amiramScore alias", () => {
	const mixedHistory = [
		null,
		undefined,
		"corrupt",
		42, // score below 50 (invalid for Amiram simulation)
		160, // score above 150
		{ score: -5 },
		{ score: 200 },
		{ score: "110" }, // string ignored
		{ score: Number.NaN },
		{},
		{ date: "2026-01-01" },
		{ score: 100 },
		{ amiramScore: 120 },
	];

	// Valid simulation scores: 100 and 120 -> mean = 110
	// Mastered = 150 -> vocab = 100
	// Weighted: 0.6 * 110 + 0.4 * 100 = 106
	const profile = evaluateCompetencyProfile(mixedHistory, 150);
	assert.equal(profile.estimatedScore, 106);
	assert.equal(profile.level, "B2");

	// History with ONLY invalid entries reverts to vocabulary-only mode
	const onlyInvalidHistory = [{ score: 20 }, { score: 250 }, null];
	const vocabOnlyProfile = evaluateCompetencyProfile(onlyInvalidHistory, 150);
	assert.equal(vocabOnlyProfile.estimatedScore, 100);
	assert.equal(vocabOnlyProfile.level, "B2");
});

test("8. evaluateCompetencyProfile does not mutate inputs", () => {
	const originalHistory = Object.freeze([
		Object.freeze({ score: 90, date: "2026-02-01" }),
		Object.freeze({ amiramScore: 110, date: "2026-02-05" }),
	]);

	const wordsList = Object.freeze(["ancient", "fragile", "achieve", "fear"]);

	const copyHistory = JSON.stringify(originalHistory);
	const copyWords = JSON.stringify(wordsList);

	const result = evaluateCompetencyProfile(originalHistory, wordsList);

	assert.equal(JSON.stringify(originalHistory), copyHistory);
	assert.equal(JSON.stringify(wordsList), copyWords);
	assert.ok(result);
});

test("9. evaluateCompetencyProfile uses vocabulary component only when simulation history is absent", () => {
	// Mastered 150 words: 50 + 100 * (150/300) = 100
	const profileHalf = evaluateCompetencyProfile([], 150);
	assert.equal(profileHalf.estimatedScore, 100);
	assert.equal(profileHalf.level, "B2");
	assert.equal(profileHalf.isStart, false);

	// Mastered 300 words: 50 + 100 * 1 = 150 (capped)
	const profileFull = evaluateCompetencyProfile([], 300);
	assert.equal(profileFull.estimatedScore, 150);
	assert.equal(profileFull.level, "C2");
	assert.equal(profileFull.isExempt, true);

	// Mastered 450 words: capped at 1 -> 150
	const profileOverflow = evaluateCompetencyProfile([], 450);
	assert.equal(profileOverflow.estimatedScore, 150);
	assert.equal(profileOverflow.level, "C2");

	// Mastered words passed as array of strings
	const wordsArray = Array.from({ length: 60 }, (_, i) => `word_${i}`);
	const profileArray = evaluateCompetencyProfile([], wordsArray);
	// 50 + 100 * (60/300) = 70
	assert.equal(profileArray.estimatedScore, 70);
	assert.equal(profileArray.level, "A2");
});
