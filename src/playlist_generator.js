((root, factory) => {
	if (typeof module === "object" && module.exports) {
		const vocabMatcher = require("./vocab_matcher.js");
		const vocabTaxonomy = require("./vocab_taxonomy.js");
		let vocabData = null;
		try {
			vocabData = require("./amiram_vocab_data.js");
		} catch {
			vocabData = null;
		}
		module.exports = factory(
			vocabMatcher.matchWord,
			vocabTaxonomy.classifyWord,
			vocabMatcher.buildLexicalIndex,
			vocabData,
		);
	} else {
		root.ShirAmiramPlaylistGenerator = factory(
			root.ShirAmiramVocabMatcher?.matchWord,
			root.ShirAmiramVocabTaxonomy?.classifyWord,
			root.ShirAmiramVocabMatcher?.buildLexicalIndex,
			root.AMIRAM_VOCAB_DATA,
		);
	}
})(
	typeof self !== "undefined" ? self : this,
	(matchWord, classifyWord, buildLexicalIndex, defaultVocabData) => {
		const DEFAULT_DURATION_MINUTES = 3.5;
		const DEFAULT_MAX_DURATION = 20;
		const DEFAULT_MAX_SONGS = 5;

		const POS_HEBREW_MAP = Object.freeze({
			noun: "שם עצם",
			verb: "פועל",
			adjective: "שם תואר",
			adverb: "תואר הפועל",
			preposition: "מילת יחס",
			pronoun: "כינוי גוף",
			conjunction: "מילת קישור",
			general: "כללי",
		});

		const TAXONOMY_WORDS = Object.freeze([
			"peace",
			"comfort",
			"acceptance",
			"wisdom",
			"calm",
			"memory",
			"regret",
			"time",
			"change",
			"reflection",
			"support",
			"encourage",
			"journey",
			"hope",
			"dream",
			"future",
			"unity",
			"possibility",
			"question",
			"answer",
			"freedom",
			"justice",
			"beauty",
			"nature",
			"joy",
			"sky",
			"praise",
			"faith",
			"song",
			"emotion",
			"silence",
			"escape",
			"friendship",
			"loyalty",
			"trust",
			"lean",
			"help",
			"shoulder",
			"burden",
			"strong",
			"mountain",
			"enough",
			"valley",
			"reach",
			"distance",
			"birds",
			"doorstep",
			"worry",
			"morning",
			"little",
		]);

		function initDefaultVocab() {
			const list = [];
			const seen = new Set();

			if (Array.isArray(defaultVocabData)) {
				for (const item of defaultVocabData) {
					if (item?.word) {
						const w = String(item.word).toLowerCase().trim();
						if (w && !seen.has(w)) {
							seen.add(w);
							list.push(item);
						}
					}
				}
			}

			for (const tw of TAXONOMY_WORDS) {
				if (!seen.has(tw)) {
					seen.add(tw);
					const pos =
						typeof classifyWord === "function"
							? classifyWord(tw)?.partOfSpeech
							: "General";
					list.push({
						word: tw,
						part_of_speech: pos,
					});
				}
			}

			if (typeof buildLexicalIndex === "function") {
				try {
					return buildLexicalIndex(list);
				} catch {
					return list;
				}
			}
			return list;
		}

		const defaultIndex = initDefaultVocab();

		function getActiveVocabIndex(customVocabulary) {
			if (!customVocabulary) return defaultIndex;
			if (customVocabulary.exactMap && customVocabulary.stemMap) {
				return customVocabulary;
			}
			if (
				Array.isArray(customVocabulary) &&
				typeof buildLexicalIndex === "function"
			) {
				try {
					return buildLexicalIndex(customVocabulary);
				} catch {
					return customVocabulary;
				}
			}
			return customVocabulary;
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

		function generatePlaylistTitle(theme, targetPOS) {
			if (theme && targetPOS) {
				return `רשימת השמעה בנושא ${theme} (${targetPOS})`;
			}
			if (theme) {
				return `רשימת השמעה בנושא ${theme}`;
			}
			if (targetPOS) {
				return `רשימת השמעה לתרגול ${targetPOS}`;
			}
			return "רשימת השמעה כללית";
		}

		function songMatchesTheme(song, targetTheme) {
			if (!targetTheme) return true;
			const needle = String(targetTheme).trim().toLowerCase();
			if (!needle) return true;

			const candidates = [];
			if (typeof song.theme === "string") {
				candidates.push(song.theme);
			} else if (Array.isArray(song.theme)) {
				for (const t of song.theme) {
					if (typeof t === "string") candidates.push(t);
				}
			}

			if (typeof song.tags === "string") {
				candidates.push(song.tags);
				for (const t of song.tags.split(/[\s,]+/)) {
					if (t) candidates.push(t);
				}
			} else if (Array.isArray(song.tags)) {
				for (const t of song.tags) {
					if (typeof t === "string") candidates.push(t);
				}
			}

			if (typeof song.genre === "string") {
				candidates.push(song.genre);
			}
			if (typeof song.category === "string") {
				candidates.push(song.category);
			}

			for (const cand of candidates) {
				const norm = cand.trim().toLowerCase();
				if (norm === needle || norm.includes(needle) || needle.includes(norm)) {
					return true;
				}
			}
			return false;
		}

		function extractRawWords(song) {
			const list = [];
			const seen = new Set();

			function add(w) {
				if (typeof w !== "string") return;
				const trimmed = w.trim().toLowerCase();
				if (!trimmed) return;
				if (!seen.has(trimmed)) {
					seen.add(trimmed);
					list.push(trimmed);
				}
			}

			function parseList(arr) {
				if (!Array.isArray(arr)) return;
				for (const item of arr) {
					if (typeof item === "string") {
						add(item);
					} else if (item && typeof item === "object") {
						add(item.word || item.term || item.id || item.targetWord);
					}
				}
			}

			parseList(song.words);
			parseList(song.target_words);
			if (typeof song.target_words === "string") {
				try {
					const parsed = JSON.parse(song.target_words);
					if (Array.isArray(parsed)) parseList(parsed);
				} catch {
					for (const tok of song.target_words.split(/[\s,]+/)) {
						add(tok);
					}
				}
			}
			parseList(song.targetWords);
			parseList(song.highlight_words);
			parseList(song.highlightWords);

			if (list.length === 0 && typeof song.lyrics === "string") {
				const tokens = song.lyrics.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/g);
				if (tokens) {
					for (const tok of tokens) {
						add(tok);
					}
				}
			}

			return list;
		}

		function getSongDuration(song) {
			if (
				typeof song.durationMinutes === "number" &&
				Number.isFinite(song.durationMinutes) &&
				song.durationMinutes > 0
			) {
				return song.durationMinutes;
			}
			return DEFAULT_DURATION_MINUTES;
		}

		function isPosMatch(actualPos, targetPOS) {
			if (!targetPOS) return true;
			if (!actualPos) return false;
			const a = String(actualPos).trim().toLowerCase();
			const t = String(targetPOS).trim().toLowerCase();
			if (a === t) return true;
			if (POS_HEBREW_MAP[a] && POS_HEBREW_MAP[a] === t) return true;
			if (POS_HEBREW_MAP[t] && POS_HEBREW_MAP[t] === a) return true;
			return false;
		}

		function analyzeSong(song, activeVocab, targetPOS) {
			const rawWords = extractRawWords(song);
			const distinctWordsSet = new Set();
			const distinctWordsList = [];
			let posMatched = !targetPOS;

			for (const raw of rawWords) {
				let canonicalWord = raw;
				let matchedItem = null;

				if (typeof matchWord === "function" && activeVocab) {
					try {
						const matchResult = matchWord(raw, activeVocab);
						if (matchResult?.matched) {
							canonicalWord =
								matchResult.targetWord ||
								matchResult.matchedWord ||
								matchResult.item?.word ||
								raw;
							matchedItem = matchResult.item || matchResult.vocabEntry;
						}
					} catch {
						// Fallback to raw word on any matcher error
					}
				}

				if (!distinctWordsSet.has(canonicalWord)) {
					distinctWordsSet.add(canonicalWord);
					distinctWordsList.push(canonicalWord);
				}

				if (targetPOS && !posMatched) {
					const classification =
						typeof classifyWord === "function"
							? classifyWord(canonicalWord)
							: null;
					const rawClassification =
						typeof classifyWord === "function" ? classifyWord(raw) : null;
					const posFromItem =
						matchedItem?.part_of_speech || matchedItem?.partOfSpeech;

					if (
						isPosMatch(classification?.partOfSpeech, targetPOS) ||
						isPosMatch(rawClassification?.partOfSpeech, targetPOS) ||
						isPosMatch(posFromItem, targetPOS)
					) {
						posMatched = true;
					}
				}
			}

			// If POS was not matched from explicit words but song has lyrics, check lyrics tokens
			if (
				targetPOS &&
				!posMatched &&
				typeof song.lyrics === "string" &&
				typeof matchWord === "function" &&
				activeVocab
			) {
				const tokens = song.lyrics.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/g);
				if (tokens) {
					for (const tok of tokens) {
						const norm = tok.toLowerCase();
						try {
							const mRes = matchWord(norm, activeVocab);
							if (mRes?.matched) {
								const targetW =
									mRes.targetWord || mRes.matchedWord || mRes.item?.word;
								const cls =
									typeof classifyWord === "function"
										? classifyWord(targetW)
										: null;
								if (
									isPosMatch(cls?.partOfSpeech, targetPOS) ||
									isPosMatch(
										mRes.item?.part_of_speech || mRes.item?.partOfSpeech,
										targetPOS,
									)
								) {
									posMatched = true;
									break;
								}
							}
						} catch {
							// Ignore token error
						}
					}
				}
			}

			const isSummary =
				song.summary === true ||
				song.isSummary === true ||
				(Array.isArray(song.tags) &&
					song.tags.some((t) => String(t).toLowerCase() === "summary")) ||
				(typeof song.theme === "string" &&
					song.theme.toLowerCase() === "summary");

			return {
				song,
				distinctWords: distinctWordsList,
				wordCount: distinctWordsList.length,
				duration: getSongDuration(song),
				posMatched,
				isSummary,
			};
		}

		function compareDeterministic(a, b) {
			if (a.wordCount !== b.wordCount) {
				return a.wordCount - b.wordCount;
			}
			if (a.duration !== b.duration) {
				return a.duration - b.duration;
			}
			const titleA = String(a.song.title || "");
			const titleB = String(b.song.title || "");
			const titleCmp = titleA.localeCompare(titleB);
			if (titleCmp !== 0) return titleCmp;
			return compareSongIds(a.song.id, b.song.id);
		}

		function generateThematicPlaylist(songCatalog, options = {}) {
			const opts =
				options && typeof options === "object" && !Array.isArray(options)
					? options
					: {};
			const theme = typeof opts.theme === "string" ? opts.theme.trim() : "";
			const targetPOS =
				typeof opts.targetPOS === "string" ? opts.targetPOS.trim() : "";

			let maxDurationMinutes = DEFAULT_MAX_DURATION;
			if (
				typeof opts.maxDurationMinutes === "number" &&
				Number.isFinite(opts.maxDurationMinutes)
			) {
				maxDurationMinutes = Math.max(0, opts.maxDurationMinutes);
			}

			let maxSongs = DEFAULT_MAX_SONGS;
			if (typeof opts.maxSongs === "number" && Number.isFinite(opts.maxSongs)) {
				maxSongs = Math.max(0, Math.floor(opts.maxSongs));
			}

			const playlistTitle = generatePlaylistTitle(theme, targetPOS);

			if (
				!Array.isArray(songCatalog) ||
				songCatalog.length === 0 ||
				maxDurationMinutes <= 0 ||
				maxSongs <= 0
			) {
				return {
					playlistTitle,
					totalDurationMinutes: 0,
					songs: [],
					coveredVocabulary: [],
				};
			}

			const activeVocab = getActiveVocabIndex(opts.vocabulary);
			const matchingAnalyzed = [];

			for (const song of songCatalog) {
				if (!song || typeof song !== "object" || Array.isArray(song)) {
					continue;
				}
				if (!songMatchesTheme(song, theme)) {
					continue;
				}
				const analyzed = analyzeSong(song, activeVocab, targetPOS);
				if (targetPOS && !analyzed.posMatched) {
					continue;
				}
				matchingAnalyzed.push(analyzed);
			}

			if (matchingAnalyzed.length === 0) {
				return {
					playlistTitle,
					totalDurationMinutes: 0,
					songs: [],
					coveredVocabulary: [],
				};
			}

			// Sort candidate songs deterministically simple -> complex by word count
			matchingAnalyzed.sort(compareDeterministic);

			// Opener is the light opener (fewest distinct vocabulary words)
			const opener = matchingAnalyzed[0];
			if (opener.duration > maxDurationMinutes || maxSongs < 1) {
				return {
					playlistTitle,
					totalDurationMinutes: 0,
					songs: [],
					coveredVocabulary: [],
				};
			}

			if (matchingAnalyzed.length === 1 || maxSongs === 1) {
				return {
					playlistTitle,
					totalDurationMinutes: Number(opener.duration.toFixed(2)),
					songs: [opener.song],
					coveredVocabulary: opener.distinctWords.slice(),
				};
			}

			const pool = matchingAnalyzed.slice(1);

			// Identify closing summary song candidate:
			// 1. Explicit summary tag/flag
			// 2. Song with highest overlap with other songs in the candidate pool
			// 3. Lowest word count among pool as cool-down summary
			let closingCandidate = pool.find((s) => s.isSummary);

			if (!closingCandidate) {
				const scoredPool = pool.map((s) => {
					const otherWords = new Set(opener.distinctWords);
					for (const other of pool) {
						if (other !== s) {
							for (const w of other.distinctWords) otherWords.add(w);
						}
					}
					let overlap = 0;
					for (const w of s.distinctWords) {
						if (otherWords.has(w)) overlap++;
					}
					return { item: s, overlap };
				});

				const hasOverlap = scoredPool.some((sp) => sp.overlap > 0);
				if (hasOverlap) {
					scoredPool.sort((a, b) => {
						if (b.overlap !== a.overlap) {
							return b.overlap - a.overlap;
						}
						return compareDeterministic(a.item, b.item);
					});
					closingCandidate = scoredPool[0].item;
				} else {
					const sortedByCountAsc = pool.slice().sort(compareDeterministic);
					closingCandidate = sortedByCountAsc[0];
				}
			}

			// Candidate richest songs: all remaining songs in pool except closingCandidate,
			// sorted descending by wordCount (richest first)
			const richestCandidates = pool.filter((s) => s !== closingCandidate);
			richestCandidates.sort((a, b) => {
				if (b.wordCount !== a.wordCount) {
					return b.wordCount - a.wordCount;
				}
				return compareDeterministic(a, b);
			});

			let selected = [];
			const canFitClosing =
				opener.duration + closingCandidate.duration <= maxDurationMinutes &&
				maxSongs >= 2;

			if (canFitClosing) {
				let remainingBudget =
					maxDurationMinutes - (opener.duration + closingCandidate.duration);
				let remainingSlots = maxSongs - 2;
				const middleSongs = [];

				for (const cand of richestCandidates) {
					if (remainingSlots <= 0) break;
					if (cand.duration <= remainingBudget) {
						middleSongs.push(cand);
						remainingBudget -= cand.duration;
						remainingSlots--;
					}
				}

				selected = [opener, ...middleSongs, closingCandidate];
			} else {
				// Closing cannot fit alongside opener; add richest songs as budget permits
				let remainingBudget = maxDurationMinutes - opener.duration;
				let remainingSlots = maxSongs - 1;
				const middleSongs = [];

				for (const cand of richestCandidates) {
					if (remainingSlots <= 0) break;
					if (cand.duration <= remainingBudget) {
						middleSongs.push(cand);
						remainingBudget -= cand.duration;
						remainingSlots--;
					}
				}
				selected = [opener, ...middleSongs];
			}

			let totalDuration = 0;
			const coveredVocabularySet = new Set();
			const coveredVocabulary = [];

			for (const item of selected) {
				totalDuration += item.duration;
				for (const word of item.distinctWords) {
					if (!coveredVocabularySet.has(word)) {
						coveredVocabularySet.add(word);
						coveredVocabulary.push(word);
					}
				}
			}

			const totalDurationMinutes = Number(totalDuration.toFixed(2));

			return {
				playlistTitle,
				totalDurationMinutes,
				songs: selected.map((item) => item.song),
				coveredVocabulary,
			};
		}

		return {
			generateThematicPlaylist,
		};
	},
);
