((root, factory) => {
	if (typeof module === "object" && module.exports) {
		const spacedScheduler = require("./spaced_scheduler.js");
		module.exports = factory(spacedScheduler.calculateRetentionScore);
	} else {
		root.ShirAmiramSpacedBatchEvaluator = factory(
			root.ShirAmiramSpacedScheduler?.calculateRetentionScore,
		);
	}
})(typeof self !== "undefined" ? self : this, (calculateRetentionScore) => {
	const DAY_MS = 86400000;

	function defaultCalculateRetentionScore(itemState, nowMs = Date.now()) {
		if (
			itemState === null ||
			typeof itemState !== "object" ||
			!Number.isFinite(itemState?.nextReviewMs) ||
			!Number.isFinite(nowMs)
		) {
			return 0;
		}
		if (nowMs <= itemState.nextReviewMs) return 1;
		const overdueMs = nowMs - itemState.nextReviewMs;
		const intervalMs = itemState.nextReviewMs - itemState.lastReviewedMs;
		const score = Math.exp(-overdueMs / (intervalMs || DAY_MS));
		if (Number.isNaN(score)) return 0;
		return Math.min(1, Math.max(0, score));
	}

	const getRetentionScore =
		typeof calculateRetentionScore === "function"
			? calculateRetentionScore
			: defaultCalculateRetentionScore;

	/**
	 * Extract entries array safely from either a plain object or a Map.
	 *
	 * @param {Object|Map} wordStatesMap Plain object or Map of word states.
	 * @returns {Array<[string, Object]>} Array of [word, state] tuples.
	 */
	function getEntries(wordStatesMap) {
		if (
			!wordStatesMap ||
			typeof wordStatesMap !== "object" ||
			Array.isArray(wordStatesMap)
		) {
			return [];
		}
		if (wordStatesMap instanceof Map) {
			return Array.from(wordStatesMap.entries());
		}
		return Object.entries(wordStatesMap);
	}

	/**
	 * Project retention forecast across future days ahead for a batch of words.
	 *
	 * Evaluates retention score for each word at future timestamp `nowMs + d * 86400000`.
	 *
	 * Words without review dates:
	 * Following calculateRetentionScore's handling, items lacking valid review dates
	 * (e.g. missing nextReviewMs or null state) return a score of 0. They are thus
	 * counted as at-risk (score < 0.5) and contribute 0 towards the average health.
	 *
	 * Empty map:
	 * If wordStatesMap is empty or invalid, each daysAhead entry returns 0 atRiskCount
	 * and 0 averageHealthPercent.
	 *
	 * @param {Object|Map} wordStatesMap Map or plain object mapping words to item states.
	 * @param {Array<number>} [daysAheadArray=[1, 7, 14, 30]] Array of future day offsets.
	 * @param {number} [nowMs=Date.now()] Reference timestamp in milliseconds.
	 * @returns {Array<{ daysAhead: number, atRiskCount: number, averageHealthPercent: number }>}
	 */
	function projectRetentionForecast(
		wordStatesMap,
		daysAheadArray = [1, 7, 14, 30],
		nowMs = Date.now(),
	) {
		const entries = getEntries(wordStatesMap);
		const days = Array.isArray(daysAheadArray)
			? daysAheadArray
			: [1, 7, 14, 30];
		const baseNow = Number.isFinite(nowMs) ? nowMs : Date.now();

		if (entries.length === 0) {
			return days.map((d) => ({
				daysAhead: d,
				atRiskCount: 0,
				averageHealthPercent: 0,
			}));
		}

		return days.map((d) => {
			const targetMs = baseNow + d * DAY_MS;
			let atRiskCount = 0;
			let totalScore = 0;

			for (const [, state] of entries) {
				const score = getRetentionScore(state, targetMs);
				if (score < 0.5) {
					atRiskCount += 1;
				}
				totalScore += score;
			}

			const averageHealthPercent = Math.min(
				100,
				Math.max(0, Math.round((totalScore / entries.length) * 100)),
			);

			return {
				daysAhead: d,
				atRiskCount,
				averageHealthPercent,
			};
		});
	}

	/**
	 * Identify words requiring urgent intervention whose current retention score is below threshold.
	 *
	 * Words without review dates:
	 * Following calculateRetentionScore's handling, items lacking valid review dates return 0,
	 * which is below any positive threshold (e.g. 0.4), so they are included as urgent.
	 *
	 * @param {Object|Map} wordStatesMap Map or plain object mapping words to item states.
	 * @param {number} [nowMs=Date.now()] Reference timestamp in milliseconds.
	 * @param {number} [threshold=0.4] Retention score cutoff threshold (strictly below).
	 * @returns {Array<{ word: string, score: number }>} Urgent items sorted by lowest score first.
	 */
	function identifyUrgentInterventions(
		wordStatesMap,
		nowMs = Date.now(),
		threshold = 0.4,
	) {
		const entries = getEntries(wordStatesMap);
		if (entries.length === 0) {
			return [];
		}

		const baseNow = Number.isFinite(nowMs) ? nowMs : Date.now();
		const limit =
			typeof threshold === "number" && Number.isFinite(threshold)
				? threshold
				: 0.4;

		const urgent = [];
		for (const [word, state] of entries) {
			const score = getRetentionScore(state, baseNow);
			if (score < limit) {
				urgent.push({ word: String(word), score });
			}
		}

		urgent.sort((a, b) => {
			if (a.score !== b.score) {
				return a.score - b.score;
			}
			return a.word.localeCompare(b.word);
		});

		return urgent;
	}

	return {
		DAY_MS,
		projectRetentionForecast,
		identifyUrgentInterventions,
	};
});
