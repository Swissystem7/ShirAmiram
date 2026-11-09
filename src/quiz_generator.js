((root, factory) => {
	if (typeof module === "object" && module.exports) {
		const questionBuilder = require("./question_builder.js");
		const vocabTaxonomy = require("./vocab_taxonomy.js");
		module.exports = factory(
			questionBuilder.buildQuestion,
			vocabTaxonomy.classifyWord,
		);
	} else {
		root.ShirAmiramQuizGenerator = factory(
			root.ShirAmiramQuestionBuilder?.buildQuestion,
			root.ShirAmiramVocabTaxonomy?.classifyWord,
		);
	}
})(typeof self !== "undefined" ? self : this, (buildQuestion, classifyWord) => {
	function computeTargets(totalQuestions) {
		let dueTarget = Math.round(totalQuestions * 0.5);
		let newTarget = Math.round(totalQuestions * 0.3);
		let masteredTarget = Math.round(totalQuestions * 0.2);
		const diff = totalQuestions - (dueTarget + newTarget + masteredTarget);
		dueTarget += diff;
		if (dueTarget < 0) {
			newTarget += dueTarget;
			dueTarget = 0;
		}
		if (newTarget < 0) {
			masteredTarget += newTarget;
			newTarget = 0;
		}
		return { dueTarget, newTarget, masteredTarget };
	}

	function indexSentenceBank(sentenceBank) {
		const map = new Map();

		function addSentence(word, sentence, explanation = "") {
			if (typeof word !== "string" || typeof sentence !== "string") {
				return;
			}
			const clean = word.trim().toLowerCase();
			const trimmedSentence = sentence.trim();
			if (!clean || !trimmedSentence) {
				return;
			}
			if (!map.has(clean)) {
				map.set(clean, []);
			}
			const list = map.get(clean);
			if (!list.some((entry) => entry.sentence === trimmedSentence)) {
				list.push({
					sentence: trimmedSentence,
					explanation: typeof explanation === "string" ? explanation : "",
				});
			}
		}

		if (Array.isArray(sentenceBank)) {
			for (const entry of sentenceBank) {
				if (!entry || typeof entry !== "object") continue;
				const word = entry.word ?? entry.targetWord;
				const explanation = entry.explanation ?? entry.explanation_he ?? "";
				const singleSentence =
					entry.sentence ??
					entry.sample_sentence ??
					entry.sampleSentence ??
					entry.example_sentence ??
					entry.exampleSentence ??
					entry.example;
				if (typeof singleSentence === "string") {
					addSentence(word, singleSentence, explanation);
				}
				const multiSentences = entry.sentences ?? entry.examples;
				if (Array.isArray(multiSentences)) {
					for (const item of multiSentences) {
						if (typeof item === "string") {
							addSentence(word, item, explanation);
						} else if (item && typeof item === "object") {
							const s =
								item.sentence ??
								item.sample_sentence ??
								item.sampleSentence ??
								item.example_sentence ??
								item.exampleSentence ??
								item.example;
							addSentence(word, s, item.explanation ?? explanation);
						}
					}
				}
			}
		} else if (sentenceBank && typeof sentenceBank === "object") {
			for (const key of Object.keys(sentenceBank)) {
				const val = sentenceBank[key];
				if (typeof val === "string") {
					addSentence(key, val);
				} else if (Array.isArray(val)) {
					for (const item of val) {
						if (typeof item === "string") {
							addSentence(key, item);
						} else if (item && typeof item === "object") {
							const s =
								item.sentence ??
								item.sample_sentence ??
								item.sampleSentence ??
								item.example_sentence ??
								item.exampleSentence ??
								item.example;
							addSentence(key, s, item.explanation);
						}
					}
				} else if (val && typeof val === "object") {
					const s =
						val.sentence ??
						val.sample_sentence ??
						val.sampleSentence ??
						val.example_sentence ??
						val.exampleSentence ??
						val.example;
					addSentence(key, s, val.explanation);
				}
			}
		}

		return map;
	}

	function extractCleanWord(item) {
		if (typeof item === "string") {
			if (typeof classifyWord === "function") {
				const classified = classifyWord(item);
				if (classified?.cleanWord) return classified.cleanWord;
			}
			return item.trim().toLowerCase();
		}
		if (item && typeof item === "object") {
			const raw = item.word ?? item.targetWord;
			if (typeof raw === "string") {
				if (typeof classifyWord === "function") {
					const classified = classifyWord(raw);
					if (classified?.cleanWord) return classified.cleanWord;
				}
				return raw.trim().toLowerCase();
			}
		}
		return "";
	}

	function getCandidateSentences(item, cleanWord, sentenceIndex) {
		const result = [];
		const fromBank = sentenceIndex.get(cleanWord);
		if (Array.isArray(fromBank)) {
			for (const entry of fromBank) {
				result.push(entry);
			}
		}
		if (item && typeof item === "object") {
			const s =
				item.sentence ??
				item.sample_sentence ??
				item.sampleSentence ??
				item.example_sentence ??
				item.exampleSentence ??
				item.example;
			if (typeof s === "string" && s.trim()) {
				const trimmed = s.trim();
				if (!result.some((entry) => entry.sentence === trimmed)) {
					result.push({
						sentence: trimmed,
						explanation:
							typeof item.explanation === "string"
								? item.explanation
								: typeof item.explanation_he === "string"
									? item.explanation_he
									: "",
					});
				}
			}
		}
		return result;
	}

	function generateAdaptiveQuiz(input) {
		let seedPart = "default";
		try {
			if (!input || typeof input !== "object") {
				return {
					quizId: `quiz-${seedPart}-0`,
					questions: [],
					composition: { dueCount: 0, newCount: 0, masteredCount: 0 },
				};
			}

			const opts =
				input.options && typeof input.options === "object" ? input.options : {};
			seedPart =
				opts.seed !== undefined && opts.seed !== null
					? String(opts.seed)
					: "default";
			const seed = opts.seed ?? null;

			const rawTotal = opts.totalQuestions;
			const totalQuestions = rawTotal === undefined ? 10 : rawTotal;
			if (
				typeof totalQuestions !== "number" ||
				!Number.isInteger(totalQuestions) ||
				totalQuestions <= 0
			) {
				return {
					quizId: `quiz-${seedPart}-0`,
					questions: [],
					composition: { dueCount: 0, newCount: 0, masteredCount: 0 },
				};
			}

			if (
				!Array.isArray(input.wordPool) ||
				!input.sentenceBank ||
				typeof input.sentenceBank !== "object" ||
				typeof buildQuestion !== "function"
			) {
				return {
					quizId: `quiz-${seedPart}-0`,
					questions: [],
					composition: { dueCount: 0, newCount: 0, masteredCount: 0 },
				};
			}

			const targets = computeTargets(totalQuestions);
			const sentenceIndex = indexSentenceBank(input.sentenceBank);

			const dueWords = Array.isArray(input.dueWords) ? input.dueWords : [];
			const newWords = Array.isArray(input.newWords) ? input.newWords : [];
			const masteredWords = Array.isArray(input.masteredWords)
				? input.masteredWords
				: [];

			const categories = [
				{ name: "due", items: dueWords, target: targets.dueTarget, pointer: 0 },
				{ name: "new", items: newWords, target: targets.newTarget, pointer: 0 },
				{
					name: "mastered",
					items: masteredWords,
					target: targets.masteredTarget,
					pointer: 0,
				},
			];

			const questions = [];
			const usedWords = new Set();
			const counts = { due: 0, new: 0, mastered: 0 };

			function tryBuildQuestion(item) {
				const cleanWord = extractCleanWord(item);
				if (!cleanWord || usedWords.has(cleanWord)) {
					return null;
				}
				const candidateSentences = getCandidateSentences(
					item,
					cleanWord,
					sentenceIndex,
				);
				if (candidateSentences.length === 0) {
					return null;
				}
				const explanationFallback =
					item && typeof item === "object"
						? typeof item.explanation === "string"
							? item.explanation
							: typeof item.explanation_he === "string"
								? item.explanation_he
								: ""
						: "";

				for (const candidate of candidateSentences) {
					const question = buildQuestion({
						sentence: candidate.sentence,
						targetWord: cleanWord,
						wordPool: input.wordPool,
						explanation: candidate.explanation || explanationFallback,
						seed,
					});
					if (question !== null && typeof question === "object") {
						return { question, cleanWord };
					}
				}
				return null;
			}

			// Phase 1: Fill each category up to its target
			for (const cat of categories) {
				while (
					counts[cat.name] < cat.target &&
					cat.pointer < cat.items.length
				) {
					const item = cat.items[cat.pointer];
					cat.pointer += 1;
					const result = tryBuildQuestion(item);
					if (result) {
						usedWords.add(result.cleanWord);
						counts[cat.name] += 1;
						const partOfSpeech =
							result.question.partOfSpeech ||
							(typeof classifyWord === "function"
								? classifyWord(result.cleanWord)?.partOfSpeech
								: "") ||
							"General";
						questions.push({
							...result.question,
							targetWord: result.cleanWord,
							partOfSpeech,
							category: cat.name,
						});
					}
				}
			}

			// Phase 2: Cascade fallback in due -> new -> mastered order
			while (questions.length < totalQuestions) {
				let added = false;
				for (const cat of categories) {
					while (cat.pointer < cat.items.length) {
						const item = cat.items[cat.pointer];
						cat.pointer += 1;
						const result = tryBuildQuestion(item);
						if (result) {
							usedWords.add(result.cleanWord);
							counts[cat.name] += 1;
							const partOfSpeech =
								result.question.partOfSpeech ||
								(typeof classifyWord === "function"
									? classifyWord(result.cleanWord)?.partOfSpeech
									: "") ||
								"General";
							questions.push({
								...result.question,
								targetWord: result.cleanWord,
								partOfSpeech,
								category: cat.name,
							});
							added = true;
							break;
						}
					}
					if (added || questions.length >= totalQuestions) {
						break;
					}
				}
				if (!added) {
					break;
				}
			}

			return {
				quizId: `quiz-${seedPart}-${questions.length}`,
				questions,
				composition: {
					dueCount: counts.due,
					newCount: counts.new,
					masteredCount: counts.mastered,
				},
			};
		} catch {
			return {
				quizId: `quiz-${seedPart}-0`,
				questions: [],
				composition: { dueCount: 0, newCount: 0, masteredCount: 0 },
			};
		}
	}

	return {
		generateAdaptiveQuiz,
	};
});
