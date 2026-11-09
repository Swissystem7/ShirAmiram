((root, factory) => {
	if (typeof module === "object" && module.exports) {
		module.exports = factory();
	} else {
		root.ShirAmiramDailyChallengeScheduler = factory();
	}
})(typeof self !== "undefined" ? self : this, () => {
	const QUESTS = Object.freeze([
		Object.freeze({ id: "DAILY_SONG", xp: 30 }),
		Object.freeze({ id: "DAILY_QUIZ", xp: 25 }),
		Object.freeze({ id: "DAILY_KARAOKE", xp: 40 }),
	]);

	function hashString(str) {
		let h = 2166136261;
		const s = String(str);
		for (let i = 0; i < s.length; i++) {
			h ^= s.charCodeAt(i);
			h = Math.imul(h, 16777619);
		}
		return h >>> 0;
	}

	function pickIndex(seed, length) {
		if (!length || length <= 0) return -1;
		return hashString(String(seed)) % length;
	}

	function pickItem(list, seed, fallback) {
		if (!Array.isArray(list) || list.length === 0) return fallback;
		const idx = pickIndex(seed, list.length);
		return list[idx];
	}

	function generateDailyChallenge(
		dateString,
		songCatalog = [],
		vocabCatalog = [],
	) {
		const date = String(dateString || "").trim();
		const songs = Array.isArray(songCatalog) ? songCatalog : [];
		const vocab = Array.isArray(vocabCatalog) ? vocabCatalog : [];
		const songOfTheDay = pickItem(songs, `${date}|song`, null);
		const wordOfTheDay = pickItem(vocab, `${date}|word`, null);
		return {
			dateString: date,
			songOfTheDay,
			wordOfTheDay,
			quests: QUESTS.map((q) => ({ id: q.id, xp: q.xp })),
		};
	}

	function daysBetween(a, b) {
		const pa = Date.parse(`${a}T00:00:00Z`);
		const pb = Date.parse(`${b}T00:00:00Z`);
		if (!Number.isFinite(pa) || !Number.isFinite(pb)) return null;
		return Math.round((pb - pa) / 86400000);
	}

	function updateStreak(state, currentDateString) {
		const current = String(currentDateString || "").trim();
		const prev = state && typeof state === "object" ? state : {};
		const last = String(prev.lastActiveDate || "").trim();
		let streak = Number(prev.currentStreak);
		if (!Number.isFinite(streak) || streak < 0) streak = 0;

		if (!current) {
			return {
				currentStreak: streak,
				lastActiveDate: last,
				streakMaintained: false,
			};
		}

		if (last === current) {
			return {
				currentStreak: Math.max(streak, 1),
				lastActiveDate: current,
				streakMaintained: true,
			};
		}

		const gap = last ? daysBetween(last, current) : null;
		if (gap === 1) {
			return {
				currentStreak: Math.max(streak, 0) + 1,
				lastActiveDate: current,
				streakMaintained: true,
			};
		}

		return {
			currentStreak: 1,
			lastActiveDate: current,
			streakMaintained: false,
		};
	}

	return {
		QUESTS,
		generateDailyChallenge,
		updateStreak,
	};
});
