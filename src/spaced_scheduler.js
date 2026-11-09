((root, factory) => {
	if (typeof module === "object" && module.exports) {
		module.exports = factory();
	} else {
		root.ShirAmiramSpacedScheduler = factory();
	}
})(typeof self !== "undefined" ? self : this, () => {
	const DAY_MS = 86400000;
	const INTERVAL_DAYS = Object.freeze([1, 3, 7, 14, 30]);

	function normalizeBox(value) {
		if (typeof value !== "number" || !Number.isFinite(value)) return 1;
		return Math.min(5, Math.max(1, Math.trunc(value)));
	}

	function normalizeHits(value) {
		if (typeof value !== "number" || !Number.isFinite(value)) return 0;
		return Math.max(0, Math.trunc(value));
	}

	function scheduleNextReview(itemState, isCorrect, nowMs = Date.now()) {
		const base =
			itemState !== null &&
			typeof itemState === "object" &&
			!Array.isArray(itemState)
				? itemState
				: {};
		if (isCorrect) {
			const box = Math.min(normalizeBox(base.box) + 1, 5);
			return {
				...base,
				box,
				nextReviewMs: nowMs + INTERVAL_DAYS[box - 1] * DAY_MS,
				lastReviewedMs: nowMs,
				consecutiveHits: normalizeHits(base.consecutiveHits) + 1,
			};
		}
		return {
			...base,
			box: 1,
			nextReviewMs: nowMs,
			lastReviewedMs: nowMs,
			consecutiveHits: 0,
		};
	}

	function getOverdueItems(itemsList, nowMs = Date.now()) {
		if (!Array.isArray(itemsList)) return [];
		return itemsList
			.map((item, index) => ({ item, index }))
			.filter(
				({ item }) =>
					item !== null &&
					typeof item === "object" &&
					Number.isFinite(item.nextReviewMs) &&
					nowMs >= item.nextReviewMs,
			)
			.map((entry) => ({
				...entry,
				overdueMs: nowMs - entry.item.nextReviewMs,
			}))
			.sort((left, right) => {
				if (right.overdueMs !== left.overdueMs) {
					return right.overdueMs - left.overdueMs;
				}
				return left.index - right.index;
			})
			.map(({ item }) => item);
	}

	function calculateRetentionScore(itemState, nowMs = Date.now()) {
		if (
			itemState === null ||
			typeof itemState !== "object" ||
			!Number.isFinite(itemState.nextReviewMs) ||
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

	return {
		DAY_MS,
		INTERVAL_DAYS,
		scheduleNextReview,
		getOverdueItems,
		calculateRetentionScore,
	};
});
