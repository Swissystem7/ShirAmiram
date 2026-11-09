((root, factory) => {
	if (typeof module === "object" && module.exports) {
		const songRecommender = require("./song_recommender.js");
		module.exports = factory(songRecommender.rankSongsForReview);
	} else {
		root.ShirAmiramStudySessionOptimizer = factory(
			root.ShirAmiramSongRecommender?.rankSongsForReview,
		);
	}
})(typeof self !== "undefined" ? self : this, (rankSongsForReview) => {
	const TIME_COSTS = Object.freeze({
		song: 3.5,
		flashcard: 0.5,
		quiz: 0.8,
		simulation: 0.8,
	});

	const TIME_COSTS_TENTHS = Object.freeze({
		song: 35,
		flashcard: 5,
		quiz: 8,
		simulation: 8,
	});

	const TITLES = Object.freeze({
		song: "שיר",
		flashcards: "כרטיסיות",
		quiz: "חידון",
		simulation: "סימולציה מתוזמנת",
		"error-review": "חזרה על טעויות",
	});

	function chooseSong(songCatalog, dueWords) {
		if (!Array.isArray(songCatalog) || songCatalog.length === 0) {
			return null;
		}
		try {
			if (typeof rankSongsForReview === "function") {
				const ranked = rankSongsForReview(songCatalog, dueWords, {
					limit: 1,
				});
				if (Array.isArray(ranked) && ranked.length > 0) {
					const top = ranked[0];
					const topId = top?.songId ?? top?.id;
					if (topId !== undefined && topId !== null) {
						const found = songCatalog.find(
							(song) =>
								song !== null &&
								typeof song === "object" &&
								String(song.id) === String(topId),
						);
						if (found) {
							return found;
						}
					}
				}
			}
		} catch {
			// Fall back to the first song.
		}
		const first = songCatalog.find(
			(song) => song !== null && typeof song === "object",
		);
		return first ?? songCatalog[0] ?? null;
	}

	function makeActivity(type, durationTenths, items) {
		return {
			type,
			title: TITLES[type],
			durationMinutes: Number((durationTenths / 10).toFixed(1)),
			items,
		};
	}

	function planTimeBoxedSession(input) {
		const opts = input !== null && typeof input === "object" ? input : {};
		const availableMinutes = opts.availableMinutes;
		if (
			typeof availableMinutes !== "number" ||
			!Number.isFinite(availableMinutes) ||
			availableMinutes <= 0
		) {
			return { targetMinutes: 0, estimatedMinutes: 0, activities: [] };
		}

		const dueWords = Array.isArray(opts.dueWords) ? opts.dueWords : [];
		const songCatalog = Array.isArray(opts.songCatalog) ? opts.songCatalog : [];
		const questionPool = Array.isArray(opts.questionPool)
			? opts.questionPool
			: [];

		const budgetTenths = Math.floor(availableMinutes * 10 + 1e-9);
		const activities = [];
		let remainingTenths = budgetTenths;

		if (budgetTenths < 50) {
			const song = chooseSong(songCatalog, dueWords);
			if (song !== null && TIME_COSTS_TENTHS.song <= remainingTenths) {
				activities.push(makeActivity("song", TIME_COSTS_TENTHS.song, [song]));
				remainingTenths -= TIME_COSTS_TENTHS.song;
			} else if (dueWords.length > 0) {
				const count = Math.min(
					6,
					dueWords.length,
					Math.floor(remainingTenths / TIME_COSTS_TENTHS.flashcard),
				);
				if (count > 0) {
					activities.push(
						makeActivity(
							"flashcards",
							count * TIME_COSTS_TENTHS.flashcard,
							dueWords.slice(0, count),
						),
					);
					remainingTenths -= count * TIME_COSTS_TENTHS.flashcard;
				}
			}
		} else if (budgetTenths < 150) {
			const song = chooseSong(songCatalog, dueWords);
			if (song !== null && TIME_COSTS_TENTHS.song <= remainingTenths) {
				activities.push(makeActivity("song", TIME_COSTS_TENTHS.song, [song]));
				remainingTenths -= TIME_COSTS_TENTHS.song;
			}
			if (
				questionPool.length > 0 &&
				remainingTenths >= TIME_COSTS_TENTHS.quiz
			) {
				const count = Math.min(
					5,
					questionPool.length,
					Math.floor(remainingTenths / TIME_COSTS_TENTHS.quiz),
				);
				if (count > 0) {
					activities.push(
						makeActivity(
							"quiz",
							count * TIME_COSTS_TENTHS.quiz,
							questionPool.slice(0, count),
						),
					);
					remainingTenths -= count * TIME_COSTS_TENTHS.quiz;
				}
			}
			if (
				dueWords.length > 0 &&
				remainingTenths >= TIME_COSTS_TENTHS.flashcard
			) {
				const count = Math.min(
					dueWords.length,
					Math.floor(remainingTenths / TIME_COSTS_TENTHS.flashcard),
				);
				if (count > 0) {
					activities.push(
						makeActivity(
							"flashcards",
							count * TIME_COSTS_TENTHS.flashcard,
							dueWords.slice(0, count),
						),
					);
					remainingTenths -= count * TIME_COSTS_TENTHS.flashcard;
				}
			}
		} else {
			const hasPool = questionPool.length > 0;
			const hasDue = dueWords.length > 0;
			let reserveTenths = 0;
			if (hasPool && hasDue) {
				reserveTenths =
					Math.min(dueWords.length, 5) * TIME_COSTS_TENTHS.flashcard;
			}
			if (hasPool) {
				const simulationBudgetTenths = remainingTenths - reserveTenths;
				const count = Math.min(
					questionPool.length,
					Math.floor(simulationBudgetTenths / TIME_COSTS_TENTHS.simulation),
				);
				if (count > 0) {
					activities.push(
						makeActivity(
							"simulation",
							count * TIME_COSTS_TENTHS.simulation,
							questionPool.slice(0, count),
						),
					);
					remainingTenths -= count * TIME_COSTS_TENTHS.simulation;
				}
			}
			if (hasDue && remainingTenths >= TIME_COSTS_TENTHS.flashcard) {
				const count = Math.min(
					dueWords.length,
					Math.floor(remainingTenths / TIME_COSTS_TENTHS.flashcard),
				);
				if (count > 0) {
					activities.push(
						makeActivity(
							"error-review",
							count * TIME_COSTS_TENTHS.flashcard,
							dueWords.slice(0, count),
						),
					);
					remainingTenths -= count * TIME_COSTS_TENTHS.flashcard;
				}
			}
		}

		const estimatedTenths = budgetTenths - remainingTenths;
		return {
			targetMinutes: availableMinutes,
			estimatedMinutes: Number((estimatedTenths / 10).toFixed(1)),
			activities,
		};
	}

	return {
		planTimeBoxedSession,
		TIME_COSTS,
	};
});
