((root, factory) => {
	if (typeof module === "object" && module.exports) {
		module.exports = factory();
	} else {
		root.ShirAmiramXPEngine = factory();
	}
})(typeof self !== "undefined" ? self : this, () => {
	const MAX_LEVEL = 50;

	const ACTIVITY_TYPES = Object.freeze({
		QUIZ_CORRECT: "QUIZ_CORRECT",
		KARAOKE_HIT: "KARAOKE_HIT",
		SIMULATION_COMPLETE: "SIMULATION_COMPLETE",
	});

	const BADGES = Object.freeze({
		FIRST_STEPS: "FIRST_STEPS",
		STREAK_MASTER: "STREAK_MASTER",
		AMIRAM_EXEMPT: "AMIRAM_EXEMPT",
		VOCAB_COLLECTOR: "VOCAB_COLLECTOR",
	});

	function sanitizeDetailsNumber(value, fallback = 0) {
		if (
			typeof value !== "number" ||
			Number.isNaN(value) ||
			!Number.isFinite(value) ||
			value < 0
		) {
			return fallback;
		}
		return value;
	}

	function calculateActivityXP(activityType, details = {}) {
		if (
			typeof activityType !== "string" ||
			!Object.prototype.hasOwnProperty.call(ACTIVITY_TYPES, activityType)
		) {
			return 0;
		}

		const safeDetails =
			details !== null && typeof details === "object" && !Array.isArray(details)
				? details
				: {};

		let xp = 0;

		switch (activityType) {
			case ACTIVITY_TYPES.QUIZ_CORRECT: {
				const streak = sanitizeDetailsNumber(safeDetails.streak, 0);
				xp = 10 + Math.min(streak, 5) * 2;
				break;
			}
			case ACTIVITY_TYPES.KARAOKE_HIT: {
				const rawPoints = sanitizeDetailsNumber(safeDetails.points, 0);
				xp = rawPoints || 15;
				break;
			}
			case ACTIVITY_TYPES.SIMULATION_COMPLETE: {
				const rawScore = sanitizeDetailsNumber(safeDetails.score, 0);
				const score = rawScore || 50;

				let timeBonus = 0;
				if (
					safeDetails.timeBonus !== undefined &&
					safeDetails.timeBonus !== null
				) {
					const rawTimeBonus = sanitizeDetailsNumber(safeDetails.timeBonus, 0);
					timeBonus = Math.min(50, Math.max(0, rawTimeBonus));
				} else if (safeDetails.finishedInTime === true) {
					timeBonus = 50;
				}

				xp = score * 2 + timeBonus;
				break;
			}
			default:
				return 0;
		}

		return Math.max(0, Math.round(xp));
	}

	function calculateLevelFromXP(totalXP) {
		const xp =
			typeof totalXP === "number" && Number.isFinite(totalXP) && totalXP >= 0
				? totalXP
				: 0;

		const rawLevel = Math.floor(Math.sqrt(xp / 100)) + 1;
		const level = Math.min(MAX_LEVEL, Math.max(1, rawLevel));
		const currentLevelXP = 100 * (level - 1) ** 2;

		if (level >= MAX_LEVEL) {
			return {
				level: MAX_LEVEL,
				currentLevelXP,
				nextLevelXP: null,
				progressPercent: 100,
			};
		}

		const nextLevelXP = 100 * level ** 2;
		const span = nextLevelXP - currentLevelXP;
		const progressPercent =
			span > 0
				? Math.min(
						100,
						Math.max(0, Math.floor(((xp - currentLevelXP) / span) * 100)),
					)
				: 0;

		return {
			level,
			currentLevelXP,
			nextLevelXP,
			progressPercent,
		};
	}

	function extractStat(stats, primaryKey, fallbackKey) {
		let maxVal = Number.NEGATIVE_INFINITY;
		const val1 = stats[primaryKey];
		if (
			typeof val1 === "number" &&
			Number.isFinite(val1) &&
			!Number.isNaN(val1)
		) {
			maxVal = Math.max(maxVal, val1);
		}
		const val2 = stats[fallbackKey];
		if (
			typeof val2 === "number" &&
			Number.isFinite(val2) &&
			!Number.isNaN(val2)
		) {
			maxVal = Math.max(maxVal, val2);
		}
		return maxVal === Number.NEGATIVE_INFINITY ? 0 : maxVal;
	}

	function evaluateBadges(userStats) {
		if (
			userStats === null ||
			typeof userStats !== "object" ||
			Array.isArray(userStats)
		) {
			return [];
		}

		const earned = [];

		if (extractStat(userStats, "correctAnswers", "questionsSolved") >= 1) {
			earned.push(BADGES.FIRST_STEPS);
		}
		if (extractStat(userStats, "bestKaraokeStreak", "karaokeStreak") >= 10) {
			earned.push(BADGES.STREAK_MASTER);
		}
		if (
			extractStat(userStats, "bestSimulationScore", "simulationScore") >= 134
		) {
			earned.push(BADGES.AMIRAM_EXEMPT);
		}
		if (extractStat(userStats, "uniqueWordsLearned", "wordsLearned") >= 25) {
			earned.push(BADGES.VOCAB_COLLECTOR);
		}

		return earned;
	}

	return {
		MAX_LEVEL,
		ACTIVITY_TYPES,
		BADGES,
		calculateActivityXP,
		calculateLevelFromXP,
		evaluateBadges,
	};
});
