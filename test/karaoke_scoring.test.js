const test = require("node:test");
const assert = require("node:assert/strict");
const {
	normalizeWord,
	levenshtein,
	HOMOPHONES,
	evaluatePhoneticMatch,
	evaluateTimingQuality,
	scoreAttempt,
} = require("../src/karaoke_scoring.js");

test("1. exact match evaluates to 1.0", () => {
	assert.equal(evaluatePhoneticMatch("peace", "peace"), 1.0);
	assert.equal(evaluatePhoneticMatch("sing", "sing"), 1.0);
	assert.equal(
		evaluatePhoneticMatch("sing", "we will sing together tonight"),
		1.0,
	);
	assert.equal(
		evaluatePhoneticMatch(
			"freedom",
			"they fought for freedom throughout the land",
		),
		1.0,
	);
});

test("2. punctuation and case normalisation", () => {
	assert.equal(normalizeWord("  HELLO,   World!  "), "hello world");
	assert.equal(normalizeWord("Peace..."), "peace");
	assert.equal(normalizeWord(null), "");
	assert.equal(normalizeWord(undefined), "");
	assert.equal(normalizeWord(123), "");
	assert.equal(normalizeWord({}), "");
	assert.equal(evaluatePhoneticMatch("comfort", "  COMFORT!  "), 1.0);
	assert.equal(evaluatePhoneticMatch("peace", "peace..."), 1.0);
	assert.equal(evaluatePhoneticMatch("journey", "The Journey!"), 1.0);
});

test("3. one-letter slip on a long word (> 4 chars) evaluates to 0.8", () => {
	// "peace" length 5 > 4; "peac" distance 1
	assert.equal(evaluatePhoneticMatch("peace", "peac"), 0.8);
	// "listen" length 6 > 4; "liston" distance 1
	assert.equal(evaluatePhoneticMatch("listen", "liston"), 0.8);
	// "flight" length 6 > 4; "flyght" distance 1
	assert.equal(evaluatePhoneticMatch("flight", "flyght"), 0.8);
	// Within multi-word transcript
	assert.equal(evaluatePhoneticMatch("listen", "please liston carefully"), 0.8);
});

test("4. one-letter slip on a short word (<= 4 chars) evaluates to 0.0", () => {
	// "time" length 4 <= 4
	assert.equal(evaluatePhoneticMatch("time", "tyme"), 0.0);
	// "hope" length 4 <= 4
	assert.equal(evaluatePhoneticMatch("hope", "hype"), 0.0);
	// "joy" length 3 <= 4
	assert.equal(evaluatePhoneticMatch("joy", "toy"), 0.0);
	// Within multi-word transcript
	assert.equal(evaluatePhoneticMatch("time", "it isyme now"), 0.0);
});

test("5. homophone evaluates to 0.8", () => {
	assert.equal(evaluatePhoneticMatch("hear", "here"), 0.8);
	assert.equal(evaluatePhoneticMatch("write", "right"), 0.8);
	assert.equal(evaluatePhoneticMatch("know", "no"), 0.8);
	assert.equal(evaluatePhoneticMatch("see", "sea"), 0.8);
	assert.equal(evaluatePhoneticMatch("their", "there"), 0.8);
	assert.equal(evaluatePhoneticMatch("their", "they're"), 0.8);
	assert.equal(evaluatePhoneticMatch("to", "two"), 0.8);
	assert.equal(evaluatePhoneticMatch("your", "you're"), 0.8);
	assert.equal(
		evaluatePhoneticMatch("hear", "i hear you over here"),
		1.0, // exact match takes priority
	);
	assert.equal(
		evaluatePhoneticMatch("hear", "i am standing over here"),
		0.8, // homophone found in transcript
	);
});

test("6. unrelated word evaluates to 0.0", () => {
	assert.equal(evaluatePhoneticMatch("peace", "banana"), 0.0);
	assert.equal(evaluatePhoneticMatch("freedom", "mountain"), 0.0);
	assert.equal(evaluatePhoneticMatch("apple", "orange"), 0.0);
});

test("7. PERFECT / GOOD / LATE / MISS timing boundaries", () => {
	const start = 1000;
	const end = 2000;
	// Window 1000..2000 (duration 1000)
	// Central 40%: start + 300 to start + 700 => 1300..1700

	// Before start -> MISS
	assert.deepEqual(evaluateTimingQuality(999, start, end), {
		quality: "MISS",
		multiplier: 0,
	});

	// At start boundary -> GOOD
	assert.deepEqual(evaluateTimingQuality(1000, start, end), {
		quality: "GOOD",
		multiplier: 0.8,
	});

	// Inside early good region
	assert.deepEqual(evaluateTimingQuality(1299, start, end), {
		quality: "GOOD",
		multiplier: 0.8,
	});

	// Central 40% start (inclusive) -> PERFECT
	assert.deepEqual(evaluateTimingQuality(1300, start, end), {
		quality: "PERFECT",
		multiplier: 1.0,
	});

	// Middle of central region -> PERFECT
	assert.deepEqual(evaluateTimingQuality(1500, start, end), {
		quality: "PERFECT",
		multiplier: 1.0,
	});

	// Central 40% end (inclusive) -> PERFECT
	assert.deepEqual(evaluateTimingQuality(1700, start, end), {
		quality: "PERFECT",
		multiplier: 1.0,
	});

	// Inside late good region
	assert.deepEqual(evaluateTimingQuality(1701, start, end), {
		quality: "GOOD",
		multiplier: 0.8,
	});

	// At end of window -> GOOD
	assert.deepEqual(evaluateTimingQuality(2000, start, end), {
		quality: "GOOD",
		multiplier: 0.8,
	});

	// Just after end of window -> LATE
	assert.deepEqual(evaluateTimingQuality(2001, start, end), {
		quality: "LATE",
		multiplier: 0.5,
	});

	// Exactly 300 ms late -> LATE
	assert.deepEqual(evaluateTimingQuality(2300, start, end), {
		quality: "LATE",
		multiplier: 0.5,
	});

	// 301 ms late -> MISS
	assert.deepEqual(evaluateTimingQuality(2301, start, end), {
		quality: "MISS",
		multiplier: 0,
	});

	// Far beyond window -> MISS
	assert.deepEqual(evaluateTimingQuality(3000, start, end), {
		quality: "MISS",
		multiplier: 0,
	});
});

test("8. points with streak multiplier and streak reset on a miss", () => {
	// Base hit: perfect match (1.0), perfect timing (1.0), streak 0 -> 100 points
	const attempt1 = scoreAttempt({
		targetWord: "peace",
		spokenTranscript: "peace",
		eventTimeMs: 1500,
		windowStartMs: 1000,
		windowEndMs: 2000,
		currentStreak: 0,
	});
	assert.deepEqual(attempt1, {
		isHit: true,
		points: 100,
		timingQuality: "PERFECT",
		newStreak: 1,
	});

	// Streak 3 -> x1.3: 100 * 1.0 * 1.0 * (1 + 3 * 0.1) = 130 points
	const attempt2 = scoreAttempt({
		targetWord: "peace",
		spokenTranscript: "peace",
		eventTimeMs: 1500,
		windowStartMs: 1000,
		windowEndMs: 2000,
		currentStreak: 3,
	});
	assert.deepEqual(attempt2, {
		isHit: true,
		points: 130,
		timingQuality: "PERFECT",
		newStreak: 4,
	});

	// Homophone (0.8) with GOOD timing (0.8) and streak 2:
	// 100 * 0.8 * 0.8 * (1 + 0.2) = 76.8 => Math.round(76.8) = 77
	const attempt3 = scoreAttempt({
		targetWord: "hear",
		spokenTranscript: "here",
		eventTimeMs: 1200,
		windowStartMs: 1000,
		windowEndMs: 2000,
		currentStreak: 2,
	});
	assert.deepEqual(attempt3, {
		isHit: true,
		points: 77,
		timingQuality: "GOOD",
		newStreak: 3,
	});

	// Miss on word (phonetic 0) resets streak to 0
	const attemptMissWord = scoreAttempt({
		targetWord: "peace",
		spokenTranscript: "banana",
		eventTimeMs: 1500,
		windowStartMs: 1000,
		windowEndMs: 2000,
		currentStreak: 5,
	});
	assert.deepEqual(attemptMissWord, {
		isHit: false,
		points: 0,
		timingQuality: "PERFECT",
		newStreak: 0,
	});

	// Miss on timing (more than 300ms late) resets streak to 0
	const attemptMissTiming = scoreAttempt({
		targetWord: "peace",
		spokenTranscript: "peace",
		eventTimeMs: 2301,
		windowStartMs: 1000,
		windowEndMs: 2000,
		currentStreak: 4,
	});
	assert.deepEqual(attemptMissTiming, {
		isHit: false,
		points: 0,
		timingQuality: "MISS",
		newStreak: 0,
	});

	// Invalid streak falls back to 0
	const attemptInvalidStreak = scoreAttempt({
		targetWord: "peace",
		spokenTranscript: "peace",
		eventTimeMs: 1500,
		windowStartMs: 1000,
		windowEndMs: 2000,
		currentStreak: -10,
	});
	assert.equal(attemptInvalidStreak.points, 100);
	assert.equal(attemptInvalidStreak.newStreak, 1);
});

test("9. invalid windows and empty transcript handling", () => {
	// Inverted window: end <= start
	assert.deepEqual(evaluateTimingQuality(1500, 2000, 1000), {
		quality: "MISS",
		multiplier: 0,
	});
	assert.deepEqual(evaluateTimingQuality(1000, 1000, 1000), {
		quality: "MISS",
		multiplier: 0,
	});

	// Non-finite values
	assert.deepEqual(evaluateTimingQuality(Number.NaN, 1000, 2000), {
		quality: "MISS",
		multiplier: 0,
	});
	assert.deepEqual(
		evaluateTimingQuality(1500, Number.POSITIVE_INFINITY, 2000),
		{
			quality: "MISS",
			multiplier: 0,
		},
	);

	// Empty and non-string transcript / targetWord
	assert.equal(evaluatePhoneticMatch("sing", ""), 0.0);
	assert.equal(evaluatePhoneticMatch("", "sing"), 0.0);
	assert.equal(evaluatePhoneticMatch("", ""), 0.0);
	assert.equal(evaluatePhoneticMatch(null, "sing"), 0.0);
	assert.equal(evaluatePhoneticMatch("sing", undefined), 0.0);

	// scoreAttempt with empty transcript yields a miss result
	const attemptEmpty = scoreAttempt({
		targetWord: "sing",
		spokenTranscript: "",
		eventTimeMs: 1500,
		windowStartMs: 1000,
		windowEndMs: 2000,
		currentStreak: 2,
	});
	assert.deepEqual(attemptEmpty, {
		isHit: false,
		points: 0,
		timingQuality: "PERFECT",
		newStreak: 0,
	});
});

test("10. missing input object never throws and returns miss result", () => {
	const defaultMiss = {
		isHit: false,
		points: 0,
		timingQuality: "MISS",
		newStreak: 0,
	};
	assert.deepEqual(scoreAttempt(), defaultMiss);
	assert.deepEqual(scoreAttempt(null), defaultMiss);
	assert.deepEqual(scoreAttempt(undefined), defaultMiss);
	assert.deepEqual(scoreAttempt("invalid argument"), defaultMiss);
	assert.deepEqual(scoreAttempt(42), defaultMiss);
	assert.doesNotThrow(() => scoreAttempt());
	assert.doesNotThrow(() => scoreAttempt(null));
});

test("11. HOMOPHONES map is frozen and covers canonical pairs", () => {
	assert.equal(Object.isFrozen(HOMOPHONES), true);
	assert.ok(Array.isArray(HOMOPHONES.hear));
	assert.equal(Object.isFrozen(HOMOPHONES.hear), true);
	assert.ok(HOMOPHONES.hear.includes("here"));
	assert.ok(HOMOPHONES.here.includes("hear"));
	assert.ok(HOMOPHONES.their.includes("there"));
	assert.ok(HOMOPHONES.to.includes("too"));
	assert.ok(HOMOPHONES.to.includes("two"));
});

test("12. classic levenshtein distance computes correctly", () => {
	assert.equal(levenshtein("peace", "peace"), 0);
	assert.equal(levenshtein("", "abc"), 3);
	assert.equal(levenshtein("abc", ""), 3);
	assert.equal(levenshtein("kitten", "sitting"), 3);
	assert.equal(levenshtein("listen", "liston"), 1);
	assert.equal(levenshtein(null, "a"), 1);
});
