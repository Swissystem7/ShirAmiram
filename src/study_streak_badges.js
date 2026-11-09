((root, factory) => {
	if (typeof module === "object" && module.exports) module.exports = factory();
	else root.ShirAmiramStudyStreakBadges = factory();
})(typeof self !== "undefined" ? self : this, () => {
	const MILESTONES = Object.freeze([
		{ days: 3, id: "STREAK_3_DAYS", bonusXP: 50, titleHebrew: "הצתה" },
		{ days: 7, id: "STREAK_7_DAYS", bonusXP: 150, titleHebrew: "לוחם שבועי" },
		{ days: 14, id: "STREAK_14_DAYS", bonusXP: 300, titleHebrew: "שליטה בהרגל" },
		{ days: 30, id: "STREAK_30_DAYS", bonusXP: 750, titleHebrew: "אגדה חודשית" },
	]);

	function evaluateStreakMilestones(streakDays) {
		const n = Number(streakDays);
		if (!Number.isFinite(n) || n < 0) return [];
		return MILESTONES.filter((m) => n >= m.days).map((m) => ({
			id: m.id,
			titleHebrew: m.titleHebrew,
			bonusXP: m.bonusXP,
		}));
	}

	function calculateStreakMultiplier(streakDays) {
		const n = Number(streakDays);
		if (!Number.isFinite(n) || n < 0) return 1.0;
		return Math.min(1.0 + n * 0.05, 2.0);
	}

	return { MILESTONES, evaluateStreakMilestones, calculateStreakMultiplier };
});
