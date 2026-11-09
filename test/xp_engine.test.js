const test = require("node:test");
const assert = require("node:assert/strict");

const {
	MAX_LEVEL,
	ACTIVITY_TYPES,
	BADGES,
	calculateActivityXP,
	calculateLevelFromXP,
	evaluateBadges,
} = require("../src/xp_engine.js");

test("exports frozen constants and required functions", () => {
	assert.equal(MAX_LEVEL, 50);
	assert.ok(Object.isFrozen(ACTIVITY_TYPES));
	assert.ok(Object.isFrozen(BADGES));
	assert.equal(ACTIVITY_TYPES.QUIZ_CORRECT, "QUIZ_CORRECT");
	assert.equal(ACTIVITY_TYPES.KARAOKE_HIT, "KARAOKE_HIT");
	assert.equal(ACTIVITY_TYPES.SIMULATION_COMPLETE, "SIMULATION_COMPLETE");
	assert.equal(BADGES.FIRST_STEPS, "FIRST_STEPS");
	assert.equal(BADGES.STREAK_MASTER, "STREAK_MASTER");
	assert.equal(BADGES.AMIRAM_EXEMPT, "AMIRAM_EXEMPT");
	assert.equal(BADGES.VOCAB_COLLECTOR, "VOCAB_COLLECTOR");
	assert.equal(typeof calculateActivityXP, "function");
	assert.equal(typeof calculateLevelFromXP, "function");
	assert.equal(typeof evaluateBadges, "function");
});

test("calculateActivityXP: QUIZ_CORRECT calculates base XP and streak bonus capped at 5", () => {
	assert.equal(calculateActivityXP("QUIZ_CORRECT"), 10);
	assert.equal(calculateActivityXP("QUIZ_CORRECT", {}), 10);
	assert.equal(calculateActivityXP("QUIZ_CORRECT", { streak: 0 }), 10);
	assert.equal(calculateActivityXP("QUIZ_CORRECT", { streak: 1 }), 12);
	assert.equal(calculateActivityXP("QUIZ_CORRECT", { streak: 3 }), 16);
	assert.equal(calculateActivityXP("QUIZ_CORRECT", { streak: 5 }), 20);
	assert.equal(calculateActivityXP("QUIZ_CORRECT", { streak: 6 }), 20);
	assert.equal(calculateActivityXP("QUIZ_CORRECT", { streak: 50 }), 20);
});

test("calculateActivityXP: KARAOKE_HIT calculates points with default 15", () => {
	assert.equal(calculateActivityXP("KARAOKE_HIT"), 15);
	assert.equal(calculateActivityXP("KARAOKE_HIT", {}), 15);
	assert.equal(calculateActivityXP("KARAOKE_HIT", { points: 0 }), 15);
	assert.equal(calculateActivityXP("KARAOKE_HIT", { points: 25 }), 25);
	assert.equal(calculateActivityXP("KARAOKE_HIT", { points: 100 }), 100);
});

test("calculateActivityXP: SIMULATION_COMPLETE handles defaults, score, timeBonus, and finishedInTime", () => {
	assert.equal(calculateActivityXP("SIMULATION_COMPLETE"), 100);
	assert.equal(calculateActivityXP("SIMULATION_COMPLETE", {}), 100);
	assert.equal(calculateActivityXP("SIMULATION_COMPLETE", { score: 70 }), 140);
	assert.equal(
		calculateActivityXP("SIMULATION_COMPLETE", {
			score: 80,
			timeBonus: 30,
		}),
		190,
	);
	assert.equal(
		calculateActivityXP("SIMULATION_COMPLETE", {
			score: 50,
			timeBonus: 80,
		}),
		150,
	);
	assert.equal(
		calculateActivityXP("SIMULATION_COMPLETE", {
			score: 60,
			finishedInTime: true,
		}),
		170,
	);
	assert.equal(
		calculateActivityXP("SIMULATION_COMPLETE", {
			score: 60,
			finishedInTime: false,
		}),
		120,
	);
	assert.equal(
		calculateActivityXP("SIMULATION_COMPLETE", {
			score: 60,
			timeBonus: 20,
			finishedInTime: true,
		}),
		140,
	);
});

test("calculateActivityXP: unknown activity returns 0", () => {
	assert.equal(calculateActivityXP("UNKNOWN_ACTIVITY"), 0);
	assert.equal(calculateActivityXP(""), 0);
	assert.equal(calculateActivityXP(null), 0);
	assert.equal(calculateActivityXP(undefined), 0);
	assert.equal(calculateActivityXP(123), 0);
	assert.equal(calculateActivityXP({}), 0);
});

test("calculateActivityXP: negative and NaN details are treated as 0", () => {
	assert.equal(calculateActivityXP("QUIZ_CORRECT", { streak: -3 }), 10);
	assert.equal(calculateActivityXP("QUIZ_CORRECT", { streak: Number.NaN }), 10);
	assert.equal(calculateActivityXP("KARAOKE_HIT", { points: -10 }), 15);
	assert.equal(calculateActivityXP("KARAOKE_HIT", { points: Number.NaN }), 15);
	assert.equal(
		calculateActivityXP("SIMULATION_COMPLETE", {
			score: -20,
			timeBonus: -15,
		}),
		100,
	);
	assert.equal(
		calculateActivityXP("SIMULATION_COMPLETE", {
			score: Number.NaN,
			timeBonus: Number.NaN,
		}),
		100,
	);
});

test("calculateLevelFromXP: level curve maps totalXP according to curve", () => {
	assert.deepEqual(calculateLevelFromXP(0), {
		level: 1,
		currentLevelXP: 0,
		nextLevelXP: 100,
		progressPercent: 0,
	});
	assert.deepEqual(calculateLevelFromXP(99), {
		level: 1,
		currentLevelXP: 0,
		nextLevelXP: 100,
		progressPercent: 99,
	});
	assert.deepEqual(calculateLevelFromXP(100), {
		level: 2,
		currentLevelXP: 100,
		nextLevelXP: 400,
		progressPercent: 0,
	});
	assert.deepEqual(calculateLevelFromXP(400), {
		level: 3,
		currentLevelXP: 400,
		nextLevelXP: 900,
		progressPercent: 0,
	});
	assert.deepEqual(calculateLevelFromXP(2500), {
		level: 6,
		currentLevelXP: 2500,
		nextLevelXP: 3600,
		progressPercent: 0,
	});
});

test("calculateLevelFromXP: progressPercent computes integer percentage within current level", () => {
	const midLevel2 = calculateLevelFromXP(250);
	assert.equal(midLevel2.level, 2);
	assert.equal(midLevel2.progressPercent, 50);

	const quarterLevel2 = calculateLevelFromXP(175);
	assert.equal(quarterLevel2.level, 2);
	assert.equal(quarterLevel2.progressPercent, 25);

	const midLevel3 = calculateLevelFromXP(650);
	assert.equal(midLevel3.level, 3);
	assert.equal(midLevel3.progressPercent, 50);
});

test("calculateLevelFromXP: caps at level 50 with null nextLevelXP and 100% progress", () => {
	const atCap = calculateLevelFromXP(240100);
	assert.deepEqual(atCap, {
		level: 50,
		currentLevelXP: 240100,
		nextLevelXP: null,
		progressPercent: 100,
	});

	const beyondCap = calculateLevelFromXP(500000);
	assert.deepEqual(beyondCap, {
		level: 50,
		currentLevelXP: 240100,
		nextLevelXP: null,
		progressPercent: 100,
	});
});

test("evaluateBadges: awards each badge at threshold and rejects just below threshold", () => {
	assert.deepEqual(evaluateBadges({ correctAnswers: 0 }), []);
	assert.deepEqual(evaluateBadges({ correctAnswers: 1 }), ["FIRST_STEPS"]);

	assert.deepEqual(evaluateBadges({ bestKaraokeStreak: 9 }), []);
	assert.deepEqual(evaluateBadges({ bestKaraokeStreak: 10 }), [
		"STREAK_MASTER",
	]);

	assert.deepEqual(evaluateBadges({ bestSimulationScore: 133 }), []);
	assert.deepEqual(evaluateBadges({ bestSimulationScore: 134 }), [
		"AMIRAM_EXEMPT",
	]);

	assert.deepEqual(evaluateBadges({ uniqueWordsLearned: 24 }), []);
	assert.deepEqual(evaluateBadges({ uniqueWordsLearned: 25 }), [
		"VOCAB_COLLECTOR",
	]);
});

test("evaluateBadges: supports alias property names", () => {
	assert.deepEqual(evaluateBadges({ questionsSolved: 1 }), ["FIRST_STEPS"]);
	assert.deepEqual(evaluateBadges({ karaokeStreak: 10 }), ["STREAK_MASTER"]);
	assert.deepEqual(evaluateBadges({ simulationScore: 134 }), ["AMIRAM_EXEMPT"]);
	assert.deepEqual(evaluateBadges({ wordsLearned: 25 }), ["VOCAB_COLLECTOR"]);
});

test("evaluateBadges: badge order is always deterministic regardless of input key order", () => {
	const allBadgesReversedInput = {
		wordsLearned: 30,
		simulationScore: 140,
		karaokeStreak: 15,
		questionsSolved: 10,
	};
	assert.deepEqual(evaluateBadges(allBadgesReversedInput), [
		"FIRST_STEPS",
		"STREAK_MASTER",
		"AMIRAM_EXEMPT",
		"VOCAB_COLLECTOR",
	]);

	const partialBadges = {
		uniqueWordsLearned: 100,
		correctAnswers: 5,
	};
	assert.deepEqual(evaluateBadges(partialBadges), [
		"FIRST_STEPS",
		"VOCAB_COLLECTOR",
	]);
});

test("invalid inputs never throw and return safe defaults", () => {
	assert.doesNotThrow(() => calculateActivityXP(null, null));
	assert.doesNotThrow(() => calculateActivityXP(undefined, undefined));
	assert.doesNotThrow(() =>
		calculateActivityXP("QUIZ_CORRECT", "not-an-object"),
	);

	assert.deepEqual(calculateLevelFromXP(-100), {
		level: 1,
		currentLevelXP: 0,
		nextLevelXP: 100,
		progressPercent: 0,
	});
	assert.deepEqual(calculateLevelFromXP(Number.NaN), {
		level: 1,
		currentLevelXP: 0,
		nextLevelXP: 100,
		progressPercent: 0,
	});
	assert.deepEqual(calculateLevelFromXP(Number.POSITIVE_INFINITY), {
		level: 1,
		currentLevelXP: 0,
		nextLevelXP: 100,
		progressPercent: 0,
	});
	assert.deepEqual(calculateLevelFromXP("500"), {
		level: 1,
		currentLevelXP: 0,
		nextLevelXP: 100,
		progressPercent: 0,
	});
	assert.deepEqual(calculateLevelFromXP(null), {
		level: 1,
		currentLevelXP: 0,
		nextLevelXP: 100,
		progressPercent: 0,
	});

	assert.deepEqual(evaluateBadges(null), []);
	assert.deepEqual(evaluateBadges(undefined), []);
	assert.deepEqual(evaluateBadges("string"), []);
	assert.deepEqual(evaluateBadges(123), []);
	assert.deepEqual(evaluateBadges(true), []);
	assert.deepEqual(evaluateBadges([1, 2, 3]), []);
	assert.deepEqual(evaluateBadges({}), []);
});
