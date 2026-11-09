((root, factory) => {
	if (typeof module === "object" && module.exports) {
		const pronunciationHint = require("./pronunciation_hint.js");
		const vocabTaxonomy = require("./vocab_taxonomy.js");
		module.exports = factory(
			pronunciationHint.generatePhoneticHint,
			vocabTaxonomy.classifyWord,
		);
	} else {
		root.ShirAmiramFlashcardGenerator = factory(
			root.ShirAmiramPronunciationHint?.generatePhoneticHint,
			root.ShirAmiramVocabTaxonomy?.classifyWord,
		);
	}
})(
	typeof self !== "undefined" ? self : this,
	(generatePhoneticHint, classifyWord) => {
		function resolveBox(schedulerState) {
			if (!schedulerState || typeof schedulerState !== "object") {
				return 1;
			}
			const raw = schedulerState.box;
			if (typeof raw === "number" && Number.isInteger(raw)) {
				return raw;
			}
			if (typeof raw === "string" && raw.trim() !== "") {
				const parsed = Number.parseInt(raw, 10);
				if (Number.isInteger(parsed)) {
					return parsed;
				}
			}
			return 1;
		}

		function resolveNextReviewMs(schedulerState) {
			if (!schedulerState || typeof schedulerState !== "object") {
				return null;
			}
			const candidates = [
				schedulerState.nextReviewMs,
				schedulerState.nextReview,
				schedulerState.dueMs,
				schedulerState.dueAt,
			];
			for (const val of candidates) {
				if (typeof val === "number" && Number.isFinite(val)) {
					return val;
				}
				if (val instanceof Date) {
					const time = val.getTime();
					if (Number.isFinite(time)) {
						return time;
					}
				}
				if (typeof val === "string" && val.trim() !== "") {
					const num = Number(val);
					if (
						Number.isFinite(num) &&
						!val.includes("-") &&
						!val.includes("T")
					) {
						return num;
					}
					const parsed = Date.parse(val);
					if (Number.isFinite(parsed)) {
						return parsed;
					}
				}
			}
			return null;
		}

		function findSchedulerState(map, item) {
			if (
				!map ||
				typeof map !== "object" ||
				!item ||
				typeof item !== "object"
			) {
				return null;
			}
			const id = item.id;
			const word = typeof item.word === "string" ? item.word : null;

			if (typeof map.get === "function") {
				if (id !== undefined && id !== null) {
					if (map.has(id)) return map.get(id);
					if (map.has(String(id))) return map.get(String(id));
				}
				if (word !== null) {
					if (map.has(word)) return map.get(word);
					if (map.has(word.toLowerCase())) return map.get(word.toLowerCase());
				}
				return null;
			}

			if (id !== undefined && id !== null) {
				if (Object.hasOwn(map, id)) return map[id];
				if (Object.hasOwn(map, String(id))) return map[String(id)];
				if (map[id] !== undefined) return map[id];
				if (map[String(id)] !== undefined) return map[String(id)];
			}

			if (word !== null) {
				if (Object.hasOwn(map, word)) return map[word];
				if (Object.hasOwn(map, word.toLowerCase()))
					return map[word.toLowerCase()];
				if (map[word] !== undefined) return map[word];
				if (map[word.toLowerCase()] !== undefined)
					return map[word.toLowerCase()];
			}

			return null;
		}

		function generateFlashcard(wordItem, schedulerState = null) {
			if (
				wordItem === null ||
				typeof wordItem !== "object" ||
				Array.isArray(wordItem)
			) {
				return null;
			}

			if (typeof wordItem.word !== "string" || wordItem.word.trim() === "") {
				return null;
			}

			const word = wordItem.word.trim();
			const id = wordItem.id !== undefined ? wordItem.id : null;

			let syllables = [word];
			let phoneticGuide = word;
			if (typeof generatePhoneticHint === "function") {
				try {
					const hint = generatePhoneticHint(word);
					if (Array.isArray(hint?.syllables) && hint.syllables.length > 0) {
						syllables = hint.syllables;
					}
					if (
						typeof hint?.phoneticGuide === "string" &&
						hint.phoneticGuide !== ""
					) {
						phoneticGuide = hint.phoneticGuide;
					}
				} catch {
					// Fallback to safe defaults
				}
			}

			const hebrewTranslation =
				typeof wordItem.hebrew_translation === "string"
					? wordItem.hebrew_translation
					: typeof wordItem.hebrewTranslation === "string"
						? wordItem.hebrewTranslation
						: typeof wordItem.translation === "string"
							? wordItem.translation
							: "";

			const hebrewDefinition =
				typeof wordItem.hebrew_definition === "string"
					? wordItem.hebrew_definition
					: typeof wordItem.hebrewDefinition === "string"
						? wordItem.hebrewDefinition
						: typeof wordItem.definition === "string"
							? wordItem.definition
							: "";

			let partOfSpeech = "";
			if (
				typeof wordItem.part_of_speech === "string" &&
				wordItem.part_of_speech.trim() !== ""
			) {
				partOfSpeech = wordItem.part_of_speech;
			} else if (
				typeof wordItem.partOfSpeech === "string" &&
				wordItem.partOfSpeech.trim() !== ""
			) {
				partOfSpeech = wordItem.partOfSpeech;
			} else if (typeof classifyWord === "function") {
				try {
					const classified = classifyWord(word);
					partOfSpeech = classified?.partOfSpeech || "";
				} catch {
					partOfSpeech = "";
				}
			}

			const exampleSentence =
				typeof wordItem.sample_sentence === "string"
					? wordItem.sample_sentence
					: typeof wordItem.sampleSentence === "string"
						? wordItem.sampleSentence
						: typeof wordItem.example_sentence === "string"
							? wordItem.example_sentence
							: typeof wordItem.exampleSentence === "string"
								? wordItem.exampleSentence
								: typeof wordItem.example === "string"
									? wordItem.example
									: "";

			const songTitle =
				typeof wordItem.song_title === "string" &&
				wordItem.song_title.trim() !== ""
					? wordItem.song_title
					: typeof wordItem.songTitle === "string" &&
							wordItem.songTitle.trim() !== ""
						? wordItem.songTitle
						: null;

			return {
				id,
				front: {
					word,
					syllables,
					phoneticGuide,
				},
				back: {
					hebrewTranslation,
					hebrewDefinition,
					partOfSpeech,
					exampleSentence,
					songTitle,
				},
				meta: {
					box: resolveBox(schedulerState),
					nextReviewMs: resolveNextReviewMs(schedulerState),
				},
			};
		}

		function generateDeck(
			vocabList,
			schedulerStatesMap = {},
			options = { filterBox: null },
		) {
			if (!Array.isArray(vocabList)) {
				return [];
			}

			const filterBox =
				options &&
				typeof options === "object" &&
				Number.isInteger(options.filterBox)
					? options.filterBox
					: null;

			const cards = [];

			for (const item of vocabList) {
				if (!item || typeof item !== "object") {
					continue;
				}
				const state = findSchedulerState(schedulerStatesMap, item);
				const card = generateFlashcard(item, state);
				if (!card) {
					continue;
				}
				if (filterBox !== null && card.meta.box !== filterBox) {
					continue;
				}
				cards.push(card);
			}

			cards.sort((a, b) => {
				const aDue = a.meta.nextReviewMs;
				const bDue = b.meta.nextReviewMs;

				if (aDue === null && bDue !== null) return -1;
				if (aDue !== null && bDue === null) return 1;
				if (aDue !== null && bDue !== null && aDue !== bDue) {
					return aDue - bDue;
				}

				if (a.meta.box !== b.meta.box) {
					return a.meta.box - b.meta.box;
				}

				return a.front.word.localeCompare(b.front.word);
			});

			return cards;
		}

		return {
			generateFlashcard,
			generateDeck,
		};
	},
);
