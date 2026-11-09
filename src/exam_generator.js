((root, factory) => {
	if (typeof module === "object" && module.exports) {
		const taxonomy = require("./vocab_taxonomy.js");
		const builder = require("./question_builder.js");
		module.exports = factory(builder.buildQuestion, taxonomy.classifyWord);
	} else {
		root.ShirAmiramExamGenerator = factory(
			root.ShirAmiramQuestionBuilder?.buildQuestion,
			root.ShirAmiramVocabTaxonomy?.classifyWord,
		);
	}
})(typeof self !== "undefined" ? self : this, (buildQuestion, classifyWord) => {
	function hashSeed(seed) {
		const text = String(seed);
		let hash = 2166136261;
		for (let index = 0; index < text.length; index += 1) {
			hash ^= text.charCodeAt(index);
			hash = Math.imul(hash, 16777619);
		}
		return hash >>> 0;
	}

	function createRandom(seed) {
		let state = hashSeed(seed);
		return () => {
			state += 1831565813;
			let value = Math.imul(state ^ (state >>> 15), 1 | state);
			value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
			return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
		};
	}

	function shuffle(items, seed) {
		const result = [...items];
		const random = createRandom(seed);
		for (let index = result.length - 1; index > 0; index -= 1) {
			const swapIndex = Math.floor(random() * (index + 1));
			[result[index], result[swapIndex]] = [result[swapIndex], result[index]];
		}
		return result;
	}

	function generateExamSection(
		itemBank,
		wordPool,
		options = { totalQuestions: 25, seed: null },
	) {
		try {
			const opts = options && typeof options === "object" ? options : {};
			const rawTotal = opts.totalQuestions;
			const totalQuestions =
				typeof rawTotal === "number" &&
				Number.isInteger(rawTotal) &&
				rawTotal > 0
					? rawTotal
					: rawTotal === undefined
						? 25
						: typeof rawTotal === "number"
							? rawTotal
							: 25;

			if (
				!Array.isArray(itemBank) ||
				!Array.isArray(wordPool) ||
				(opts.totalQuestions !== undefined &&
					(typeof opts.totalQuestions !== "number" ||
						!Number.isInteger(opts.totalQuestions) ||
						opts.totalQuestions <= 0))
			) {
				return {
					questions: [],
					isCompleteSection: false,
					totalQuestions:
						typeof opts.totalQuestions === "number" ? opts.totalQuestions : 25,
					partOfSpeechCounts: {},
				};
			}

			const seed = opts.seed ?? null;
			const candidates = [];
			for (const item of itemBank) {
				if (item === null || typeof item !== "object") continue;
				const rawWord = item.targetWord ?? item.word;
				if (typeof rawWord !== "string" || rawWord.trim() === "") continue;
				if (typeof item.sentence !== "string" || item.sentence.trim() === "") {
					continue;
				}
				const classification = classifyWord(rawWord);
				if (!classification || classification.cleanWord === "") continue;

				candidates.push({
					sentence: item.sentence,
					targetWord: classification.cleanWord,
					partOfSpeech: classification.partOfSpeech || "General",
					explanation:
						typeof item.explanation === "string" ? item.explanation : "",
				});
			}

			const groups = {};
			for (const candidate of candidates) {
				const pos = candidate.partOfSpeech;
				if (!groups[pos]) {
					groups[pos] = [];
				}
				groups[pos].push(candidate);
			}

			const groupKeys = Object.keys(groups).sort();
			if (seed !== null && seed !== undefined) {
				for (const pos of groupKeys) {
					groups[pos] = shuffle(groups[pos], `${seed}:${pos}`);
				}
			}

			const pointers = {};
			for (const pos of groupKeys) {
				pointers[pos] = 0;
			}

			const questions = [];
			const usedTargetWords = new Set();
			let addedAnyInRound = true;

			while (questions.length < totalQuestions && addedAnyInRound) {
				addedAnyInRound = false;
				for (const pos of groupKeys) {
					if (questions.length >= totalQuestions) break;
					const groupItems = groups[pos];
					while (pointers[pos] < groupItems.length) {
						const candidate = groupItems[pointers[pos]];
						pointers[pos] += 1;

						const normalizedWord = candidate.targetWord.toLowerCase();
						if (usedTargetWords.has(normalizedWord)) {
							continue;
						}

						const question = buildQuestion({
							sentence: candidate.sentence,
							targetWord: candidate.targetWord,
							wordPool,
							explanation: candidate.explanation,
							seed,
						});

						if (question === null) {
							continue;
						}

						usedTargetWords.add(normalizedWord);
						questions.push({
							id: `q${questions.length + 1}`,
							maskedSentence: question.maskedSentence,
							targetWord: question.targetWord,
							partOfSpeech: question.partOfSpeech,
							choices: question.choices,
							correctIndex: question.correctIndex,
							explanation: question.explanation,
							correctAnswer: question.choices[question.correctIndex],
						});
						addedAnyInRound = true;
						break;
					}
				}
			}

			const partOfSpeechCounts = {};
			for (const q of questions) {
				partOfSpeechCounts[q.partOfSpeech] =
					(partOfSpeechCounts[q.partOfSpeech] || 0) + 1;
			}

			return {
				questions,
				isCompleteSection: questions.length === totalQuestions,
				totalQuestions,
				partOfSpeechCounts,
			};
		} catch {
			return {
				questions: [],
				isCompleteSection: false,
				totalQuestions:
					typeof options?.totalQuestions === "number"
						? options.totalQuestions
						: 25,
				partOfSpeechCounts: {},
			};
		}
	}

	return {
		generateExamSection,
	};
});
