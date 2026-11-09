const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
	DAY_MS,
	projectRetentionForecast,
	identifyUrgentInterventions,
} = require("../src/spaced_batch_evaluator.js");

const NOW = 1_700_000_000_000;

function createWordState(lastReviewedDaysAgo, nextReviewDaysAhead) {
	return {
		lastReviewedMs: NOW - lastReviewedDaysAgo * DAY_MS,
		nextReviewMs: NOW + nextReviewDaysAhead * DAY_MS,
		box: 2,
		consecutiveHits: 1,
	};
}

test("1. projectRetentionForecast: monotonic (atRiskCount never decreases as days grow)", () => {
	const wordStates = {
		sing: createWordState(1, 1),
		ancient: createWordState(2, 3),
		fragile: createWordState(3, 7),
		achieve: createWordState(4, 14),
		unprecedented: createWordState(5, 20),
	};

	const daysAhead = [1, 3, 7, 14, 30, 60];
	const forecast = projectRetentionForecast(wordStates, daysAhead, NOW);

	assert.equal(forecast.length, daysAhead.length);

	for (let i = 0; i < forecast.length; i++) {
		assert.equal(forecast[i].daysAhead, daysAhead[i]);
		if (i > 0) {
			assert.ok(
				forecast[i].atRiskCount >= forecast[i - 1].atRiskCount,
				`atRiskCount at day ${forecast[i].daysAhead} (${forecast[i].atRiskCount}) should be >= day ${forecast[i - 1].daysAhead} (${forecast[i - 1].atRiskCount})`,
			);
			assert.ok(
				forecast[i].averageHealthPercent <=
					forecast[i - 1].averageHealthPercent,
				`averageHealthPercent at day ${forecast[i].daysAhead} (${forecast[i].averageHealthPercent}) should be <= day ${forecast[i - 1].daysAhead} (${forecast[i - 1].averageHealthPercent})`,
			);
		}
	}
});

test("2. projectRetentionForecast: averageHealthPercent is bounded in 0-100 range and rounded", () => {
	const highHealthStates = {
		wordA: createWordState(0, 100),
		wordB: createWordState(0, 120),
	};
	const forecastHigh = projectRetentionForecast(highHealthStates, [1, 7], NOW);
	for (const entry of forecastHigh) {
		assert.ok(entry.averageHealthPercent >= 0);
		assert.ok(entry.averageHealthPercent <= 100);
		assert.equal(entry.averageHealthPercent, 100);
		assert.equal(entry.atRiskCount, 0);
		assert.ok(Number.isInteger(entry.averageHealthPercent));
	}

	const lowHealthStates = {
		wordX: {
			lastReviewedMs: NOW - 500 * DAY_MS,
			nextReviewMs: NOW - 499 * DAY_MS, // interval 1 day, overdue 500 days -> exp(-500) = 0
		},
		wordY: {
			lastReviewedMs: NOW - 300 * DAY_MS,
			nextReviewMs: NOW - 299 * DAY_MS, // interval 1 day, overdue 300 days -> exp(-300) = 0
		},
	};
	const forecastLow = projectRetentionForecast(lowHealthStates, [1, 7], NOW);
	for (const entry of forecastLow) {
		assert.ok(entry.averageHealthPercent >= 0);
		assert.ok(entry.averageHealthPercent <= 100);
		assert.equal(entry.averageHealthPercent, 0);
		assert.equal(entry.atRiskCount, 2);
		assert.ok(Number.isInteger(entry.averageHealthPercent));
	}
});

test("3. projectRetentionForecast: supports custom daysAhead array", () => {
	const wordStates = {
		dice: createWordState(1, 2),
		fear: createWordState(2, 5),
	};

	const customDays = [2, 5, 21];
	const forecast = projectRetentionForecast(wordStates, customDays, NOW);

	assert.equal(forecast.length, 3);
	assert.deepEqual(
		forecast.map((f) => f.daysAhead),
		[2, 5, 21],
	);

	const emptyDays = projectRetentionForecast(wordStates, [], NOW);
	assert.deepEqual(emptyDays, []);
});

test("4. identifyUrgentInterventions: returns words below threshold sorted most urgent (lowest score) first", () => {
	const wordStates = {
		critical: {
			lastReviewedMs: NOW - 10 * DAY_MS,
			nextReviewMs: NOW - 5 * DAY_MS, // interval = 5 days, overdue = 5 days -> exp(-1) = ~0.368
		},
		severe: {
			lastReviewedMs: NOW - 3 * DAY_MS,
			nextReviewMs: NOW - 2 * DAY_MS, // interval = 1 day, overdue = 2 days -> exp(-2) = ~0.135
		},
		catastrophic: {
			lastReviewedMs: NOW - 2 * DAY_MS,
			nextReviewMs: NOW - 1 * DAY_MS, // interval = 1 day, overdue = 5 days -> exp(-5) = ~0.0067
		},
		safe: {
			lastReviewedMs: NOW - 1 * DAY_MS,
			nextReviewMs: NOW + 3 * DAY_MS, // not overdue -> score = 1.0
		},
	};

	// catastrophic overdue: NOW - (NOW - 1*DAY_MS) = 1*DAY_MS
	// Let's adjust catastrophic to be overdue by 4 days with interval 1 day:
	wordStates.catastrophic = {
		lastReviewedMs: NOW - 5 * DAY_MS,
		nextReviewMs: NOW - 4 * DAY_MS, // interval 1 day, overdue 4 days -> exp(-4) ~0.018
	};

	const urgent = identifyUrgentInterventions(wordStates, NOW, 0.4);

	assert.equal(urgent.length, 3);
	assert.equal(urgent[0].word, "catastrophic");
	assert.equal(urgent[1].word, "severe");
	assert.equal(urgent[2].word, "critical");

	for (let i = 0; i < urgent.length; i++) {
		assert.ok(
			urgent[i].score < 0.4,
			`Word ${urgent[i].word} score ${urgent[i].score} should be < 0.4`,
		);
		if (i > 0) {
			assert.ok(
				urgent[i].score >= urgent[i - 1].score,
				`Urgent list should be sorted lowest score first: ${urgent[i - 1].score} <= ${urgent[i].score}`,
			);
		}
	}
});

test("5. identifyUrgentInterventions: supports custom threshold", () => {
	const wordStates = {
		low: {
			lastReviewedMs: NOW - 3 * DAY_MS,
			nextReviewMs: NOW - 2 * DAY_MS, // interval 1 day, overdue 2 days -> exp(-2) ~ 0.135
		},
		mid: {
			lastReviewedMs: NOW - 10 * DAY_MS,
			nextReviewMs: NOW - 5 * DAY_MS, // interval 5 days, overdue 5 days -> exp(-1) ~ 0.368
		},
		high: {
			lastReviewedMs: NOW - 10 * DAY_MS,
			nextReviewMs: NOW - 2 * DAY_MS, // interval 8 days, overdue 2 days -> exp(-2/8) = exp(-0.25) ~ 0.779
		},
	};

	const urgentTight = identifyUrgentInterventions(wordStates, NOW, 0.2);
	assert.equal(urgentTight.length, 1);
	assert.equal(urgentTight[0].word, "low");

	const urgentLoose = identifyUrgentInterventions(wordStates, NOW, 0.8);
	assert.equal(urgentLoose.length, 3);
	assert.deepEqual(
		urgentLoose.map((u) => u.word),
		["low", "mid", "high"],
	);
});

test("6. empty map: returns 0 atRiskCount and 0 averageHealthPercent, and empty urgent list", () => {
	for (const emptyInput of [{}, new Map()]) {
		const forecast = projectRetentionForecast(emptyInput, undefined, NOW);
		assert.equal(forecast.length, 4);
		assert.deepEqual(forecast, [
			{ daysAhead: 1, atRiskCount: 0, averageHealthPercent: 0 },
			{ daysAhead: 7, atRiskCount: 0, averageHealthPercent: 0 },
			{ daysAhead: 14, atRiskCount: 0, averageHealthPercent: 0 },
			{ daysAhead: 30, atRiskCount: 0, averageHealthPercent: 0 },
		]);

		const urgent = identifyUrgentInterventions(emptyInput, NOW, 0.4);
		assert.deepEqual(urgent, []);
	}

	for (const invalid of [null, undefined, 42, "string", []]) {
		const forecast = projectRetentionForecast(invalid, [1], NOW);
		assert.deepEqual(forecast, [
			{ daysAhead: 1, atRiskCount: 0, averageHealthPercent: 0 },
		]);
		assert.deepEqual(identifyUrgentInterventions(invalid, NOW, 0.4), []);
	}
});

test("7. words without review dates: score as 0, classified at-risk and urgent", () => {
	const wordStates = {
		unreviewed1: {},
		unreviewed2: { box: 1 },
		unreviewed3: { nextReviewMs: null },
		unreviewed4: { nextReviewMs: "invalid-date" },
		normal: {
			lastReviewedMs: NOW,
			nextReviewMs: NOW + 10 * DAY_MS,
		},
	};

	const forecast = projectRetentionForecast(wordStates, [1], NOW);
	assert.equal(forecast.length, 1);
	// 4 unreviewed words have score 0 (< 0.5), normal word has score 1.0 (>= 0.5)
	assert.equal(forecast[0].atRiskCount, 4);
	// Total score = 0 + 0 + 0 + 0 + 1 = 1. Health % = Math.round((1/5)*100) = 20
	assert.equal(forecast[0].averageHealthPercent, 20);

	const urgent = identifyUrgentInterventions(wordStates, NOW, 0.4);
	assert.equal(urgent.length, 4);
	for (const item of urgent) {
		assert.equal(item.score, 0);
	}
	assert.deepEqual(
		urgent.map((u) => u.word),
		["unreviewed1", "unreviewed2", "unreviewed3", "unreviewed4"],
	);
});

test("8. accepts both Map and plain object inputs with identical results", () => {
	const objInput = {
		word1: createWordState(1, 2),
		word2: createWordState(3, -1),
		word3: createWordState(0, 10),
	};

	const mapInput = new Map([
		["word1", createWordState(1, 2)],
		["word2", createWordState(3, -1)],
		["word3", createWordState(0, 10)],
	]);

	const days = [1, 7, 14, 30];
	const forecastObj = projectRetentionForecast(objInput, days, NOW);
	const forecastMap = projectRetentionForecast(mapInput, days, NOW);
	assert.deepEqual(forecastMap, forecastObj);

	const urgentObj = identifyUrgentInterventions(objInput, NOW, 0.5);
	const urgentMap = identifyUrgentInterventions(mapInput, NOW, 0.5);
	assert.deepEqual(urgentMap, urgentObj);
});

test("9. inputs are never mutated (frozen fixtures)", () => {
	const stateA = Object.freeze(createWordState(1, 2));
	const stateB = Object.freeze(createWordState(4, -1));
	const wordStates = Object.freeze({
		alpha: stateA,
		beta: stateB,
	});
	const customDays = Object.freeze([3, 10, 25]);

	const forecast = projectRetentionForecast(wordStates, customDays, NOW);
	assert.ok(Array.isArray(forecast));
	assert.equal(wordStates.alpha, stateA);
	assert.equal(wordStates.beta, stateB);

	const urgent = identifyUrgentInterventions(wordStates, NOW, 0.4);
	assert.ok(Array.isArray(urgent));
	assert.equal(wordStates.alpha, stateA);
	assert.equal(wordStates.beta, stateB);
});

test("10. UMD wrapper registers browser global when module is undefined", () => {
	const fs = require("node:fs");
	const path = require("node:path");
	const vm = require("node:vm");
	const code = fs.readFileSync(
		path.join(__dirname, "../src/spaced_batch_evaluator.js"),
		"utf8",
	);

	const context = {
		ShirAmiramSpacedScheduler: {
			calculateRetentionScore: () => 0.85,
		},
	};
	context.self = context;
	vm.createContext(context);
	vm.runInContext(code, context);

	assert.ok(context.ShirAmiramSpacedBatchEvaluator);
	assert.equal(
		typeof context.ShirAmiramSpacedBatchEvaluator.projectRetentionForecast,
		"function",
	);
	assert.equal(
		typeof context.ShirAmiramSpacedBatchEvaluator.identifyUrgentInterventions,
		"function",
	);
	assert.equal(context.ShirAmiramSpacedBatchEvaluator.DAY_MS, DAY_MS);
});
