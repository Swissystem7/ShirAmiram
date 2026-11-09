((root, factory) => {
	if (typeof module === "object" && module.exports) {
		const questionBuilder = require("./question_builder.js");
		const vocabTaxonomy = require("./vocab_taxonomy.js");
		module.exports = factory(
			questionBuilder.buildQuestion,
			vocabTaxonomy.classifyWord,
		);
	} else {
		root.ShirAmiramReviewSessionBuilder = factory(
			root.ShirAmiramQuestionBuilder?.buildQuestion,
			root.ShirAmiramVocabTaxonomy?.classifyWord,
		);
	}
})(typeof self !== "undefined" ? self : this, (buildQuestion, classifyWord) => {
	function escapeRegExp(value) {
		return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}

	function normalizePOS(pos) {
		if (typeof pos !== "string") return null;
		const lower = pos.trim().toLowerCase();
		if (lower === "noun") return "Noun";
		if (lower === "verb") return "Verb";
		if (lower === "adjective" || lower === "adj") return "Adjective";
		if (lower === "adverb" || lower === "adv") return "Adverb";
		return null;
	}

	function getDominantPOSFromErrors(errorsList) {
		if (!Array.isArray(errorsList) || errorsList.length === 0) return null;
		const counts = new Map();
		for (const err of errorsList) {
			let word = "";
			let pos = null;
			if (typeof err === "string") {
				word = err;
			} else if (err && typeof err === "object") {
				word = err.targetWord || err.word || err.term || "";
				pos = normalizePOS(
					err.targetPOS ||
						err.category ||
						err.partOfSpeech ||
						err.part_of_speech,
				);
			}
			if (!pos && word && typeof classifyWord === "function") {
				try {
					const classified = classifyWord(word);
					pos = normalizePOS(classified?.partOfSpeech);
				} catch {
					pos = null;
				}
			}
			if (pos) {
				counts.set(pos, (counts.get(pos) || 0) + 1);
			}
		}
		let topPOS = null;
		let maxCount = 0;
		for (const [pos, count] of counts.entries()) {
			if (count > maxCount) {
				maxCount = count;
				topPOS = pos;
			}
		}
		return topPOS;
	}

	function resolveBlindspotPOS(diagnosticSummary, errors) {
		if (diagnosticSummary && typeof diagnosticSummary === "object") {
			const directPos = normalizePOS(diagnosticSummary.dominantBlindspot);
			if (directPos) return directPos;

			const targetPos = normalizePOS(
				diagnosticSummary.targetPOS ||
					diagnosticSummary.dominantPOS ||
					diagnosticSummary.partOfSpeech ||
					diagnosticSummary.targetBlindspot ||
					diagnosticSummary.blindspotPOS,
			);
			if (targetPos) return targetPos;

			if (typeof diagnosticSummary.tipHe === "string") {
				if (diagnosticSummary.tipHe.includes("במקום פועל")) return "Verb";
				if (diagnosticSummary.tipHe.includes("במקום שם עצם")) return "Noun";
				if (diagnosticSummary.tipHe.includes("במקום שם תואר")) {
					return "Adjective";
				}
				if (diagnosticSummary.tipHe.includes("במקום תואר הפועל")) {
					return "Adverb";
				}
			}

			const internalErrors =
				diagnosticSummary.mistakes ||
				diagnosticSummary.errors ||
				diagnosticSummary.mistakesList;
			if (Array.isArray(internalErrors) && internalErrors.length > 0) {
				const posFromErrors = getDominantPOSFromErrors(internalErrors);
				if (posFromErrors) return posFromErrors;
			}
		}

		if (Array.isArray(errors) && errors.length > 0) {
			const posFromErrors = getDominantPOSFromErrors(errors);
			if (posFromErrors) return posFromErrors;
		}

		return null;
	}

	function determineTargetBlindspotLabel(diagnosticSummary, blindspotPOS) {
		if (diagnosticSummary && typeof diagnosticSummary === "object") {
			if (typeof diagnosticSummary.dominantBlindspot === "string") {
				const raw = diagnosticSummary.dominantBlindspot.trim();
				const normalized = normalizePOS(raw);
				if (normalized) return normalized;
				if (raw.toLowerCase() === "pos") {
					return blindspotPOS || "pos";
				}
				if (raw) return raw;
			}
			if (blindspotPOS) return blindspotPOS;
		}
		return blindspotPOS || "none";
	}

	function extractWordInfo(item) {
		if (typeof item === "string") {
			const clean = item.trim().toLowerCase();
			return { word: clean, sentence: null, explanation: "" };
		}
		if (item && typeof item === "object") {
			const raw = item.word ?? item.targetWord ?? item.term ?? item.id;
			const clean = typeof raw === "string" ? raw.trim().toLowerCase() : "";
			const sentence =
				item.sentence ??
				item.sample_sentence ??
				item.sampleSentence ??
				item.example ??
				item.example_sentence ??
				null;
			const explanation =
				typeof item.explanation === "string"
					? item.explanation
					: typeof item.explanation_he === "string"
						? item.explanation_he
						: "";
			return {
				word: clean,
				sentence:
					typeof sentence === "string" && sentence.trim()
						? sentence.trim()
						: null,
				explanation,
			};
		}
		return { word: "", sentence: null, explanation: "" };
	}

	function getSentenceForWord(info, sentenceBank) {
		if (info.sentence) {
			const pattern = new RegExp(`\\b${escapeRegExp(info.word)}\\b`, "i");
			if (pattern.test(info.sentence)) {
				return info.sentence;
			}
		}
		if (sentenceBank && typeof sentenceBank === "object") {
			const fromBank = sentenceBank[info.word];
			if (typeof fromBank === "string") {
				const pattern = new RegExp(`\\b${escapeRegExp(info.word)}\\b`, "i");
				if (pattern.test(fromBank)) return fromBank;
			} else if (Array.isArray(fromBank)) {
				for (const s of fromBank) {
					if (typeof s === "string") {
						const pattern = new RegExp(`\\b${escapeRegExp(info.word)}\\b`, "i");
						if (pattern.test(s)) return s;
					}
				}
			}
		}
		return `The concept of ${info.word} is important to remember.`;
	}

	function buildRemediationSession(options = {}) {
		try {
			const opts = options && typeof options === "object" ? options : {};
			const diagnosticSummary =
				opts.diagnosticSummary && typeof opts.diagnosticSummary === "object"
					? opts.diagnosticSummary
					: {};

			const blindspotPOS = resolveBlindspotPOS(diagnosticSummary, opts.errors);
			const targetBlindspot = determineTargetBlindspotLabel(
				diagnosticSummary,
				blindspotPOS,
			);

			const rawMax = opts.maxQuestions;
			const maxQuestions =
				typeof rawMax === "number" && Number.isInteger(rawMax) && rawMax >= 0
					? rawMax
					: rawMax === undefined
						? 5
						: typeof rawMax === "number" && rawMax >= 0
							? Math.floor(rawMax)
							: 5;

			const seedPart =
				opts.seed !== null && opts.seed !== undefined
					? String(opts.seed)
					: "session";
			const sessionId =
				typeof opts.sessionId === "string" && opts.sessionId.trim() !== ""
					? opts.sessionId.trim()
					: opts.seed !== null && opts.seed !== undefined
						? `remediation-${seedPart}`
						: `remediation-${seedPart}-${Date.now()}`;

			if (maxQuestions === 0) {
				return {
					sessionId,
					targetBlindspot,
					targetedWordCount: 0,
					questions: [],
				};
			}

			const dueWordsList = Array.isArray(opts.dueWords) ? opts.dueWords : [];
			const validDueItems = [];
			const seenWords = new Set();

			for (const item of dueWordsList) {
				const info = extractWordInfo(item);
				if (!info.word || seenWords.has(info.word)) continue;
				seenWords.add(info.word);

				let pos = null;
				if (item && typeof item === "object") {
					pos = normalizePOS(
						item.partOfSpeech || item.category || item.part_of_speech,
					);
				}
				if (!pos && typeof classifyWord === "function") {
					try {
						const classified = classifyWord(info.word);
						pos = normalizePOS(classified?.partOfSpeech);
					} catch {
						pos = null;
					}
				}

				validDueItems.push({
					info,
					partOfSpeech: pos,
				});
			}

			const matchingItems = blindspotPOS
				? validDueItems.filter((entry) => entry.partOfSpeech === blindspotPOS)
				: [];

			const isFocused = matchingItems.length > 0;
			const selectedItems = isFocused
				? matchingItems.slice(0, maxQuestions)
				: validDueItems.slice(0, maxQuestions);

			const confusingWords = [];
			if (Array.isArray(diagnosticSummary.confusingWords)) {
				for (const w of diagnosticSummary.confusingWords) {
					if (typeof w === "string" && w.trim()) {
						confusingWords.push(w.trim());
					}
				}
			}
			const mistakeList =
				diagnosticSummary.mistakes ||
				diagnosticSummary.errors ||
				diagnosticSummary.mistakesList ||
				opts.errors;
			if (Array.isArray(mistakeList)) {
				for (const m of mistakeList) {
					if (m && typeof m === "object") {
						if (
							typeof m.chosenDistractor === "string" &&
							m.chosenDistractor.trim()
						) {
							confusingWords.push(m.chosenDistractor.trim());
						}
					}
				}
			}

			const rawPool = Array.isArray(opts.wordPool) ? opts.wordPool : [];
			const combinedPool = [...confusingWords, ...rawPool];

			const questions = [];
			const seed = opts.seed ?? null;
			const sentenceBank = opts.sentenceBank || opts.sentences;

			for (const entry of selectedItems) {
				if (typeof buildQuestion !== "function") break;
				const sentence = getSentenceForWord(entry.info, sentenceBank);
				const questionSeed =
					seed !== null && seed !== undefined
						? `${seed}:${entry.info.word}`
						: null;

				const q = buildQuestion({
					sentence,
					targetWord: entry.info.word,
					wordPool: combinedPool,
					explanation: entry.info.explanation,
					seed: questionSeed,
				});

				if (q !== null && typeof q === "object") {
					questions.push({
						id: `rem-q${questions.length + 1}`,
						...q,
						partOfSpeech: q.partOfSpeech || entry.partOfSpeech || "General",
					});
				}
			}

			const targetedWordCount = isFocused ? questions.length : 0;

			return {
				sessionId,
				targetBlindspot,
				targetedWordCount,
				questions,
			};
		} catch {
			return {
				sessionId: "remediation-error",
				targetBlindspot: "none",
				targetedWordCount: 0,
				questions: [],
			};
		}
	}

	return {
		buildRemediationSession,
	};
});
