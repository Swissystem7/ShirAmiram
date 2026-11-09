const test = require("node:test");
const assert = require("node:assert/strict");

const {
	DAY_MS,
	INTERVAL_DAYS,
	scheduleNextReview,
	getOverdueItems,
	calculateRetentionScore,
} = require("../src/spaced_scheduler.js");

const NOW = 1_700_000_000_000;

test("exports the shared constants", () => {
	assert.equal(DAY_MS, 86400000);
	assert.deepEqual(INTERVAL_DAYS, [1, 3, 7, 14, 30]);
});

test("consecutive correct answers climb boxes 2..5 and cap at 5", () => {
	let state = scheduleNextReview(null, true, NOW);
	assert.equal(state.box, 2);
	assert.equal(state.nextReviewMs, NOW + 3 * DAY_MS);
	assert.equal(state.lastReviewedMs, NOW);
	assert.equal(state.consecutiveHits, 1);

	state = scheduleNextReview(state, true, NOW);
	assert.equal(state.box, 3);
	assert.equal(state.nextReviewMs, NOW + 7 * DAY_MS);
	assert.equal(state.consecutiveHits, 2);

	state = scheduleNextReview(state, true, NOW);
	assert.equal(state.box, 4);
	assert.equal(state.nextReviewMs, NOW + 14 * DAY_MS);
	assert.equal(state.consecutiveHits, 3);

	state = scheduleNextReview(state, true, NOW);
	assert.equal(state.box, 5);
	assert.equal(state.nextReviewMs, NOW + 30 * DAY_MS);
	assert.equal(state.consecutiveHits, 4);

	state = scheduleNextReview(state, true, NOW);
	assert.equal(state.box, 5);
	assert.equal(state.nextReviewMs, NOW + 30 * DAY_MS);
	assert.equal(state.consecutiveHits, 5);
});

test("wrong answer resets to box 1 with immediate review", () => {
	const result = scheduleNextReview(
		{ id: "word-1", box: 4, consecutiveHits: 3 },
		false,
		NOW,
	);
	assert.equal(result.box, 1);
	assert.equal(result.nextReviewMs, NOW);
	assert.equal(result.lastReviewedMs, NOW);
	assert.equal(result.consecutiveHits, 0);
	assert.equal(result.id, "word-1");
});

test("scheduleNextReview does not mutate the input", () => {
	const input = {
		id: "word-2",
		box: 2,
		consecutiveHits: 1,
		nextReviewMs: NOW + DAY_MS,
		lastReviewedMs: NOW,
	};
	const snapshot = { ...input };
	const result = scheduleNextReview(input, true, NOW);
	assert.deepEqual(input, snapshot);
	assert.notEqual(result, input);
	assert.equal(result.box, 3);
});

test("invalid box and hits fall back to defaults", () => {
	const fromNull = scheduleNextReview(null, true, NOW);
	assert.equal(fromNull.box, 2);
	assert.equal(fromNull.consecutiveHits, 1);
	const clamped = scheduleNextReview(
		{ box: 0, consecutiveHits: -2 },
		true,
		NOW,
	);
	assert.equal(clamped.box, 2);
	assert.equal(clamped.consecutiveHits, 1);
});

test("getOverdueItems filters due items, most overdue first", () => {
	const items = [
		{ id: "future", nextReviewMs: NOW + DAY_MS },
		{ id: "slightly", nextReviewMs: NOW - 1000 },
		{ id: "most", nextReviewMs: NOW - 5000 },
		{ id: "due-now", nextReviewMs: NOW },
	];
	const result = getOverdueItems(items, NOW);
	assert.deepEqual(
		result.map((item) => item.id),
		["most", "slightly", "due-now"],
	);
	assert.notEqual(result, items);
	assert.deepEqual(
		items.map((item) => item.id),
		["future", "slightly", "most", "due-now"],
	);
});

test("getOverdueItems is stable for ties", () => {
	const items = [
		{ id: "first", nextReviewMs: NOW - 100 },
		{ id: "second", nextReviewMs: NOW - 100 },
	];
	assert.deepEqual(
		getOverdueItems(items, NOW).map((item) => item.id),
		["first", "second"],
	);
});

test("getOverdueItems handles non-array and malformed entries", () => {
	assert.deepEqual(getOverdueItems(null, NOW), []);
	assert.deepEqual(getOverdueItems("nope", NOW), []);
	assert.deepEqual(getOverdueItems(undefined, NOW), []);
	const mixed = [
		null,
		"word",
		{},
		{ nextReviewMs: "soon" },
		{ nextReviewMs: Number.NaN },
		{ id: "ok", nextReviewMs: NOW - 1 },
	];
	assert.deepEqual(
		getOverdueItems(mixed, NOW).map((item) => item.id),
		["ok"],
	);
});

test("retention is 1 right after review and at the due time", () => {
	const state = {
		box: 3,
		lastReviewedMs: NOW,
		nextReviewMs: NOW + 7 * DAY_MS,
		consecutiveHits: 2,
	};
	assert.equal(calculateRetentionScore(state, NOW), 1);
	assert.equal(calculateRetentionScore(state, NOW + 7 * DAY_MS), 1);
});

test("retention decreases over time past due", () => {
	const state = {
		lastReviewedMs: NOW,
		nextReviewMs: NOW + 7 * DAY_MS,
	};
	const soon = calculateRetentionScore(state, NOW + 8 * DAY_MS);
	const later = calculateRetentionScore(state, NOW + 17 * DAY_MS);
	assert.ok(soon < 1);
	assert.ok(later < soon);
	assert.ok(later > 0);
	assert.equal(calculateRetentionScore(state, NOW + 14 * DAY_MS), Math.exp(-1));
});

test("retention is always within [0, 1] and invalid state gives 0", () => {
	const state = {
		lastReviewedMs: NOW,
		nextReviewMs: NOW + DAY_MS,
	};
	for (const offset of [0, DAY_MS, 10 * DAY_MS, 365 * DAY_MS]) {
		const score = calculateRetentionScore(state, NOW + offset);
		assert.ok(score >= 0 && score <= 1, `score ${score} out of range`);
	}
	assert.equal(calculateRetentionScore(null, NOW), 0);
	assert.equal(calculateRetentionScore({}, NOW), 0);
	assert.equal(calculateRetentionScore({ nextReviewMs: "soon" }, NOW), 0);
});

test("results are deterministic with an explicit nowMs", () => {
	const input = { id: "word-3", box: 1, consecutiveHits: 0 };
	assert.deepEqual(
		scheduleNextReview(input, true, NOW),
		scheduleNextReview(input, true, NOW),
	);
	const state = {
		lastReviewedMs: NOW,
		nextReviewMs: NOW + 3 * DAY_MS,
	};
	assert.equal(
		calculateRetentionScore(state, NOW + 5 * DAY_MS),
		calculateRetentionScore(state, NOW + 5 * DAY_MS),
	);
});
