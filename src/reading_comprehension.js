/**
 * ShirAmiram - Amiram Reading Comprehension Engine (הבנת הנקרא)
 *
 * Provides academic passage parsing, line numbering, Amiram target vocabulary bridging,
 * question evaluation with detailed Hebrew explanations, and CEFR level scoring.
 */

(function (root, factory) {
	if (typeof module === "object" && module.exports) {
		module.exports = factory();
	} else {
		root.AmiramReading = factory();
	}
})(typeof self !== "undefined" ? self : this, function () {
	/**
	 * Validate and load reading passages
	 * @param {Array} passages
	 * @returns {Array} Validated passages
	 */
	function loadPassages(passages) {
		if (!Array.isArray(passages) || passages.length === 0) {
			return [];
		}

		return passages.filter((p) => {
			return (
				p &&
				typeof p.id === "string" &&
				typeof p.title === "string" &&
				typeof p.level === "string" &&
				Array.isArray(p.paragraphs) &&
				p.paragraphs.length > 0 &&
				Array.isArray(p.questions) &&
				p.questions.length > 0
			);
		});
	}

	/**
	 * Filter passages by difficulty level
	 * @param {Array} passages
	 * @param {string} level 'A_foundational' | 'B_intermediate' | 'C_advanced' | 'all'
	 */
	function filterByLevel(passages, level) {
		const list = loadPassages(passages);
		if (!level || level === "all") {
			return list;
		}
		return list.filter((p) => p.level === level);
	}

	/**
	 * Format paragraph with academic line numbers
	 * In MALAT Amiram tests, line markers appear at interval 5 (e.g. line 5, line 10, line 15)
	 * @param {string} paragraphText
	 * @param {number} startLineNumber
	 * @param {number} wordsPerLine Approx words per line for standard formatting (default 10)
	 * @returns {{ formattedHtml: string, endLineNumber: number }}
	 */
	function formatParagraphLines(
		paragraphText,
		startLineNumber = 1,
		wordsPerLine = 10,
	) {
		if (!paragraphText || typeof paragraphText !== "string") {
			return { formattedHtml: "", endLineNumber: startLineNumber };
		}

		const words = paragraphText.trim().split(/\s+/);
		const lines = [];
		let currentLine = [];
		let currentLineNum = startLineNumber;

		for (let i = 0; i < words.length; i++) {
			currentLine.push(words[i]);
			if (currentLine.length >= wordsPerLine || i === words.length - 1) {
				const lineContent = currentLine.join(" ");
				const isMarker = currentLineNum % 5 === 0;
				const markerBadge = isMarker
					? `<span class="rc-line-num marker">(${currentLineNum})</span>`
					: `<span class="rc-line-num dim">${currentLineNum}</span>`;
				lines.push(
					`<div class="rc-line" data-line="${currentLineNum}">${markerBadge} <span class="rc-line-text">${lineContent}</span></div>`,
				);
				currentLine = [];
				currentLineNum++;
			}
		}

		return {
			formattedHtml: lines.join(""),
			endLineNumber: currentLineNum,
		};
	}

	/**
	 * Look up a target word (exact or simple inflection) in the Amiram vocabulary bank.
	 * @param {string} word
	 * @param {Array<Object>} vocabBank
	 * @returns {{ word: string, translation: string, definition: string, partOfSpeech: string, level: string }|null}
	 */
	function lookupTargetWord(word, vocabBank = []) {
		const raw = typeof word === "string" ? word.trim().toLowerCase() : "";
		if (!raw || !Array.isArray(vocabBank) || vocabBank.length === 0) {
			return null;
		}

		const candidates = [raw];
		const suffixes = ["ing", "ed", "es", "d", "s"];
		for (let i = 0; i < suffixes.length; i++) {
			const suf = suffixes[i];
			if (raw.endsWith(suf) && raw.length - suf.length >= 3) {
				candidates.push(raw.slice(0, -suf.length));
				if (suf === "ed" || suf === "ing") {
					candidates.push(raw.slice(0, -suf.length) + "e");
				}
			}
		}

		let matched = null;
		for (let c = 0; c < candidates.length && !matched; c++) {
			const target = candidates[c];
			matched = vocabBank.find(
				(entry) =>
					entry &&
					typeof entry.word === "string" &&
					entry.word.trim().toLowerCase() === target,
			);
		}

		if (!matched) {
			return null;
		}

		let phoneticHint = "";
		if (typeof root !== "undefined" && root.PronunciationHint && typeof root.PronunciationHint.generatePhoneticHint === "function") {
			phoneticHint = root.PronunciationHint.generatePhoneticHint(matched.word);
		} else if (typeof require === "function") {
			try {
				const PronunciationHint = require("./pronunciation_hint.js");
				if (PronunciationHint && typeof PronunciationHint.generatePhoneticHint === "function") {
					phoneticHint = PronunciationHint.generatePhoneticHint(matched.word);
				}
			} catch (e) {
				// optional module require fallback
			}
		}

		return {
			word: String(matched.word),
			translation: String(
				matched.hebrew_translation || matched.translation || "",
			),
			definition: String(matched.hebrew_definition || matched.definition || ""),
			partOfSpeech: String(matched.part_of_speech || matched.category || ""),
			level: String(matched.level || matched.difficulty || ""),
			phoneticHint: String(phoneticHint || ""),
		};
	}

	function escapeAttr(str) {
		return String(str || "").replace(
			/[&<>"]/g,
			(ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch],
		);
	}

	/**
	 * Highlight Amiram target words inside a text string
	 * @param {string} text
	 * @param {Array<string>} targetWords
	 * @param {Array<Object>} vocabBank
	 * @returns {string} HTML with interactive badges
	 */
	const NBSP = "\u00A0";
	const PUNCT_AFTER = /^[,.;:!?%)\]\}]/;

	function escapeRegExp(str) {
		return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}

	/**
	 * Run fn on text that is not inside an existing highlight span.
	 * Tags are left untouched so a word boundary never matches markup.
	 */
	function mapTextOutsideHighlights(html, fn) {
		const parts = String(html).split(/(<[^>]+>)/);
		let depth = 0;
		return parts
			.map((part) => {
				if (part.charAt(0) === "<") {
					if (/^<span\b[^>]*\brc-target-word\b/i.test(part)) depth += 1;
					else if (/^<\/span\b/i.test(part) && depth) depth -= 1;
					return part;
				}
				if (depth || !part) return part;
				return fn(part);
			})
			.join("");
	}

	function highlightTextSegment(segment, regex, spanFor) {
		const flags = regex.flags.includes("g") ? regex.flags : `${regex.flags}g`;
		const re = new RegExp(regex.source, flags);
		let out = "";
		let cursor = 0;
		let match = re.exec(segment);
		while (match) {
			const start = match.index;
			const word = match[1] || match[0];
			if (!word || start < cursor) break;
			let before = segment.slice(cursor, start);
			if (/\S/.test(before)) before = before.replace(/[ \t\u00A0]+$/, "") + NBSP;
			const after = segment.slice(start + word.length);
			const leadLen = (/^[ \t\u00A0]*/.exec(after) || [""])[0].length;
			const nextChar = after.charAt(leadLen);
			const punct = PUNCT_AFTER.test(nextChar);
			out += before + spanFor(word);
			if (punct) {
				cursor = start + word.length + leadLen;
			} else {
				out += NBSP;
				cursor = start + word.length + (nextChar ? leadLen : 0);
			}
			re.lastIndex = cursor;
			match = re.exec(segment);
		}
		out += segment.slice(cursor);
		return out;
	}

	function spanForMatch(word, vocabBank) {
		const entry = lookupTargetWord(word, vocabBank);
		const transAttr =
			entry && entry.translation
				? ` data-translation="${escapeAttr(entry.translation)}"`
				: "";
		const titleText =
			entry && entry.translation
				? `מילת אמיר״ם (${escapeAttr(entry.translation)}): לחץ לשמיעה ותרגום`
				: "מילת אמיר״ם: לחץ לשמיעה";
		const safe = escapeAttr(word);
		return `<span class="rc-target-word" data-word="${safe}"${transAttr} tabindex="0" title="${titleText}">${safe}</span>`;
	}

	function wordAlternation(targetWords) {
		return targetWords
			.map((word) => (word && typeof word === "string" ? word.trim() : ""))
			.filter(Boolean)
			.sort((a, b) => b.length - a.length)
			.map(escapeRegExp)
			.join("|");
	}

	function highlightVocab(text, targetWords = [], vocabBank = []) {
		if (!text || typeof text !== "string") return "";
		if (!Array.isArray(targetWords) || targetWords.length === 0) return text;
		const alts = wordAlternation(targetWords);
		if (!alts) return text;
		const spanFor = (word) => spanForMatch(word, vocabBank);
		// Whole word, including a simple inflection, with a hard space on each side.
		let highlighted = mapTextOutsideHighlights(text, (segment) =>
			highlightTextSegment(
				segment,
				new RegExp(`\\b((?:${alts})(?:s|es|d|ed|ing)?)\\b`, "gi"),
				spanFor,
			),
		);
		// Recovery for a target word that was stored glued to the next word ("apparentthat").
		highlighted = mapTextOutsideHighlights(highlighted, (segment) =>
			highlightTextSegment(
				segment,
				new RegExp(`\\b((?:${alts}))(?=[A-Za-z])`, "gi"),
				spanFor,
			),
		);
		return highlighted;
	}

	/**
	 * Parse a free-text line reference such as "Paragraph 2, lines 3-5".
	 * @param {string} ref
	 * @returns {{ scope: string, paragraphs: number[]|null, lines: number[]|null, concluding: boolean, raw: string }}
	 */
	function parseLineReference(ref) {
		const raw = typeof ref === "string" ? ref.trim() : "";
		const result = {
			scope: "none",
			paragraphs: null,
			lines: null,
			concluding: false,
			raw,
		};
		if (!raw) return result;

		if (/^entire text$/i.test(raw)) {
			result.scope = "entire";
			return result;
		}

		const toRange = (start, end) => {
			const a = Number.parseInt(start, 10);
			const b = end === undefined ? a : Number.parseInt(end, 10);
			return a <= b ? [a, b] : [b, a];
		};

		const paraMatch = raw.match(/paragraphs?\s+(\d+)(?:\s*[-–]\s*(\d+))?/i);
		if (paraMatch) {
			result.paragraphs = toRange(paraMatch[1], paraMatch[2]);
		}

		const lineMatch = raw.match(/lines?\s+(\d+)(?:\s*[-–]\s*(\d+))?/i);
		if (lineMatch) {
			result.lines = toRange(lineMatch[1], lineMatch[2]);
		}

		result.concluding = /concluding sentence/i.test(raw);

		if (result.paragraphs || result.lines || result.concluding) {
			result.scope = "located";
		} else {
			result.scope = "unknown";
		}
		return result;
	}
	// End of parseLineReference – added for test coverage clarity

	/**
	 * Format a line reference as a short Hebrew label for the answer feedback UI.
	 * Examples: "Paragraph 2, lines 3-5" -> "פסקה 2, שורות 3-5"; "Entire text" -> "כל הקטע".
	 * Unrecognized references are returned trimmed as-is.
	 * @param {string} ref
	 * @returns {string}
	 */
	function formatLineReference(ref) {
		const parsed = parseLineReference(ref);
		if (parsed.scope === "none") return "";
		if (parsed.scope === "entire") return "כל הקטע";
		if (parsed.scope === "unknown") return parsed.raw;

		const formatRange = (range, single, plural) => {
			return range[0] === range[1]
				? `${single} ${range[0]}`
				: `${plural} ${range[0]}-${range[1]}`;
		};

		const parts = [];
		if (parsed.paragraphs) {
			parts.push(formatRange(parsed.paragraphs, "פסקה", "פסקאות"));
		}
		if (parsed.lines) {
			parts.push(formatRange(parsed.lines, "שורה", "שורות"));
		}
		if (parsed.concluding) {
			parts.push("משפט הסיום");
		}
		return parts.join(", ");
	}

	/**
	 * Evaluate a question answer
	 * @param {Object} question
	 * @param {number} selectedIndex 0-3
	 * @returns {Object} Result object
	 */
	function evaluateAnswer(question, selectedIndex) {
		if (!question || typeof question.correct_index !== "number") {
			return { isCorrect: false, correctIndex: -1, explanation: "" };
		}

		const isCorrect = selectedIndex === question.correct_index;
		return {
			isCorrect,
			selectedIndex,
			correctIndex: question.correct_index,
			explanation: question.hebrew_explanation || "",
			lineReference: question.line_reference || "",
			lineReferenceLabel: formatLineReference(question.line_reference),
			questionType: question.type || "general",
		};
	}

	/**
	 * Initialize a reading session
	 * @param {Array} passages
	 * @param {Object} options { level: 'all' | 'A_foundational' | ... }
	 */
	function createSession(passages, options = {}) {
		const pool = filterByLevel(passages, options.level || "all");
		if (pool.length === 0) {
			return null;
		}

		// Default to first passage in the filtered list
		const activePassage = pool[0];
		return {
			passages: pool,
			activePassageIndex: 0,
			activePassage,
			activeQuestionIndex: 0,
			answers: {}, // questionId -> { selectedIndex, isCorrect, timestamp }
			startedAt: Date.now(),
			completed: false,
		};
	}

	/**
	 * Record answer in session
	 * @param {Object} session
	 * @param {string} questionId
	 * @param {number} selectedIndex
	 */
	function recordSessionAnswer(session, questionId, selectedIndex) {
		if (!session || !session.activePassage) return null;
		const question = session.activePassage.questions.find(
			(q) => q.id === questionId,
		);
		if (!question) return null;

		const evaluation = evaluateAnswer(question, selectedIndex);
		session.answers[questionId] = {
			...evaluation,
			answeredAt: Date.now(),
		};

		// Check if all questions in active passage are answered
		const totalQuestions = session.activePassage.questions.length;
		const answeredCount = Object.keys(session.answers).length;
		if (answeredCount >= totalQuestions) {
			session.completed = true;
		}

		return evaluation;
	}

	/**
	 * Calculate summary and estimated CEFR Reading score
	 * @param {Object} session
	 */
	function getSessionSummary(session) {
		if (!session || !session.activePassage) {
			return { total: 0, correct: 0, percentage: 0, cefr: "Pre-A2" };
		}

		const questions = session.activePassage.questions;
		const total = questions.length;
		let correct = 0;
		const typeBreakdown = {};

		questions.forEach((q) => {
			const ans = session.answers[q.id];
			const type = q.type || "other";
			if (!typeBreakdown[type]) {
				typeBreakdown[type] = { total: 0, correct: 0 };
			}
			typeBreakdown[type].total++;
			if (ans && ans.isCorrect) {
				correct++;
				typeBreakdown[type].correct++;
			}
		});

		const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

		// CEFR mapping for reading comprehension
		let cefr = "Pre-A2 (טרום בסיסי)";
		if (percentage >= 90) cefr = "C1 (פטור אקדמי מלא)";
		else if (percentage >= 75) cefr = "B2 (מתקדמים ב')";
		else if (percentage >= 55) cefr = "B1 (מתקדמים א')";
		else if (percentage >= 35) cefr = "A2 (בסיסי)";

		return {
			total,
			correct,
			percentage,
			cefr,
			typeBreakdown,
			level: session.activePassage.level,
		};
	}

	return {
		filterByLevel,
		formatParagraphLines,
		lookupTargetWord,
		highlightVocab,
		parseLineReference,
		formatLineReference,
		evaluateAnswer,
		createSession,
		recordSessionAnswer,
		getSessionSummary,
	};
});
