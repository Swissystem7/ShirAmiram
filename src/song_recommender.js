((root, factory) => {
	if (typeof module === "object" && module.exports) {
		const vocabMatcher = require("./vocab_matcher.js");
		module.exports = factory(vocabMatcher.matchWord);
	} else {
		root.ShirAmiramSongRecommender = factory(
			root.ShirAmiramVocabMatcher?.matchWord,
		);
	}
})(typeof self !== "undefined" ? self : this, (matchWord) => {
	function parseTargetWords(targetWords) {
		if (Array.isArray(targetWords)) {
			return targetWords
				.filter((w) => typeof w === "string")
				.map((w) => w.trim())
				.filter(Boolean);
		}
		if (typeof targetWords === "string") {
			const trimmed = targetWords.trim();
			if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
				try {
					const parsed = JSON.parse(trimmed);
					if (Array.isArray(parsed)) {
						return parsed
							.filter((w) => typeof w === "string")
							.map((w) => w.trim())
							.filter(Boolean);
					}
				} catch {
					// Not valid JSON, extract quoted tokens safely
				}
				const results = [];
				const regex = /['"]([^'"]*)['"]/g;
				let match = regex.exec(trimmed);
				while (match !== null) {
					const w = match[1].trim();
					if (w) results.push(w);
					match = regex.exec(trimmed);
				}
				return results;
			}
		}
		return [];
	}

	function extractDueWord(item) {
		if (typeof item === "string") {
			return item;
		}
		if (item !== null && typeof item === "object" && !Array.isArray(item)) {
			if (typeof item.word === "string") return item.word;
			if (typeof item.term === "string") return item.term;
			if (typeof item.id === "string") return item.id;
		}
		return null;
	}

	function matchesTargetWords(dueWord, targetWords) {
		const normDue = dueWord.toLowerCase().trim();
		for (const tw of targetWords) {
			if (tw.toLowerCase().trim() === normDue) {
				return true;
			}
		}
		if (typeof matchWord === "function" && targetWords.length > 0) {
			try {
				const res = matchWord(dueWord, targetWords, { fuzzy: false });
				if (
					res?.matched &&
					(res.matchType === "exact" || res.matchType === "stem")
				) {
					return true;
				}
			} catch {
				return false;
			}
		}
		return false;
	}

	function calculateSongCoverage(song, dueWords) {
		if (
			song === null ||
			typeof song !== "object" ||
			Array.isArray(song) ||
			!Array.isArray(dueWords)
		) {
			return { matchedWords: [], coverageCount: 0, coverageRatio: 0 };
		}

		const seen = new Set();
		const uniqueDueWords = [];
		for (const item of dueWords) {
			const raw = extractDueWord(item);
			if (raw === null) continue;
			const norm = raw.toLowerCase().trim();
			if (!norm) continue;
			if (!seen.has(norm)) {
				seen.add(norm);
				uniqueDueWords.push(norm);
			}
		}

		const totalUnique = uniqueDueWords.length;
		if (totalUnique === 0) {
			return { matchedWords: [], coverageCount: 0, coverageRatio: 0 };
		}

		const targetWords = parseTargetWords(song.target_words);
		if (targetWords.length === 0) {
			return { matchedWords: [], coverageCount: 0, coverageRatio: 0 };
		}

		const matchedWords = [];
		for (const word of uniqueDueWords) {
			if (matchesTargetWords(word, targetWords)) {
				matchedWords.push(word);
			}
		}

		const coverageCount = matchedWords.length;
		const coverageRatio =
			Math.round((coverageCount / totalUnique) * 1000) / 1000;

		return {
			matchedWords,
			coverageCount,
			coverageRatio,
		};
	}

	function compareSongIds(idA, idB) {
		const strA = idA != null ? String(idA) : "";
		const strB = idB != null ? String(idB) : "";
		const isNumA = strA !== "" && /^\d+$/.test(strA);
		const isNumB = strB !== "" && /^\d+$/.test(strB);
		if (isNumA && isNumB) {
			const diff = Number(strA) - Number(strB);
			if (diff !== 0) return diff;
		}
		return strA.localeCompare(strB);
	}

	function rankSongsForReview(songCatalog, dueWords, options = { limit: 5 }) {
		if (!Array.isArray(songCatalog)) {
			return [];
		}

		let limit = 5;
		if (
			typeof options === "number" &&
			Number.isFinite(options) &&
			options > 0
		) {
			limit = Math.floor(options);
		} else if (
			options !== null &&
			typeof options === "object" &&
			typeof options.limit === "number" &&
			Number.isFinite(options.limit) &&
			options.limit > 0
		) {
			limit = Math.floor(options.limit);
		}

		const ranked = [];
		for (const song of songCatalog) {
			if (song === null || typeof song !== "object" || Array.isArray(song)) {
				continue;
			}
			const cov = calculateSongCoverage(song, dueWords);
			if (cov.coverageCount === 0) {
				continue;
			}
			ranked.push({
				song,
				cov,
				lyricsLength:
					typeof song.lyrics === "string" ? song.lyrics.length : Infinity,
			});
		}

		ranked.sort((a, b) => {
			if (b.cov.coverageCount !== a.cov.coverageCount) {
				return b.cov.coverageCount - a.cov.coverageCount;
			}
			if (a.lyricsLength !== b.lyricsLength) {
				return a.lyricsLength - b.lyricsLength;
			}
			return compareSongIds(a.song.id, b.song.id);
		});

		return ranked.slice(0, limit).map(({ song, cov }) => {
			const reason =
				cov.coverageCount === 1
					? `מכסה מילה אחת לחזרה: ${cov.matchedWords[0]}`
					: `מכסה ${cov.coverageCount} מילים לחזרה: ${cov.matchedWords.join(", ")}`;
			return {
				songId: song.id,
				title: song.title,
				matchedWords: cov.matchedWords,
				coverageCount: cov.coverageCount,
				coverageRatio: cov.coverageRatio,
				reason,
			};
		});
	}

	return Object.freeze({
		calculateSongCoverage,
		rankSongsForReview,
	});
});
