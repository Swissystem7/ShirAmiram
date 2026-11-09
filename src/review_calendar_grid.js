((root, factory) => {
	if (typeof module === "object" && module.exports) module.exports = factory();
	else root.ShirAmiramReviewCalendarGrid = factory();
})(typeof self !== "undefined" ? self : this, () => {
	function calculateIntensity(actionCount) {
		const n = Number(actionCount);
		if (!Number.isFinite(n) || n <= 0) return 0;
		if (n <= 4) return 1;
		if (n <= 9) return 2;
		if (n <= 19) return 3;
		return 4;
	}

	function parseISODate(dateString) {
		if (typeof dateString !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
			return null;
		}
		const [y, m, d] = dateString.split("-").map(Number);
		const dt = new Date(Date.UTC(y, m - 1, d));
		if (
			dt.getUTCFullYear() !== y ||
			dt.getUTCMonth() !== m - 1 ||
			dt.getUTCDate() !== d
		) {
			return null;
		}
		return dt;
	}

	function toISODate(dt) {
		const y = dt.getUTCFullYear();
		const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
		const d = String(dt.getUTCDate()).padStart(2, "0");
		return `${y}-${m}-${d}`;
	}

	function buildHeatmapGrid(
		activityMapByDate = {},
		endDateString = "2026-11-09",
		numDays = 28,
	) {
		const end = parseISODate(endDateString);
		const days = Number(numDays);
		if (!end || !Number.isFinite(days) || days <= 0) {
			return { totalActiveDays: 0, totalActions: 0, maxStreak: 0, weeks: [] };
		}
		const map =
			activityMapByDate && typeof activityMapByDate === "object"
				? activityMapByDate
				: {};
		const cells = [];
		let totalActions = 0;
		let totalActiveDays = 0;
		for (let i = days - 1; i >= 0; i -= 1) {
			const dt = new Date(end.getTime());
			dt.setUTCDate(end.getUTCDate() - i);
			const iso = toISODate(dt);
			const count = Number(map[iso]) || 0;
			const safeCount = Number.isFinite(count) && count > 0 ? count : 0;
			if (safeCount > 0) {
				totalActiveDays += 1;
				totalActions += safeCount;
			}
			cells.push({
				date: iso,
				count: safeCount,
				intensity: calculateIntensity(safeCount),
				weekday: dt.getUTCDay(),
			});
		}
		let maxStreak = 0;
		let cur = 0;
		for (const c of cells) {
			if (c.count > 0) {
				cur += 1;
				if (cur > maxStreak) maxStreak = cur;
			} else cur = 0;
		}
		const weeks = [];
		for (let i = 0; i < cells.length; i += 7) {
			weeks.push(cells.slice(i, i + 7));
		}
		return { totalActiveDays, totalActions, maxStreak, weeks };
	}

	return { calculateIntensity, buildHeatmapGrid };
});
