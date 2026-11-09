((root, factory) => {
	if (typeof module === "object" && module.exports) {
		const pronunciationHint = require("./pronunciation_hint.js");
		module.exports = factory(pronunciationHint.syllabifyWord);
	} else {
		root.ShirAmiramDifficultyEstimator = factory(
			root.ShirAmiramPronunciationHint?.syllabifyWord,
		);
	}
})(typeof self !== "undefined" ? self : this, (syllabifyWord) => {
	/**
	 * Frozen WEIGHTS object defining the contribution of each linguistic factor.
	 * The weights sum to exactly 1.0:
	 * - length (0.35): Word length reflects lexical complexity; words longer than 7 letters
	 *   receive an extra step boost.
	 * - syllables (0.35): Phonological complexity based on syllabifyWord; 3+ syllables
	 *   substantially increases cognitive processing load.
	 * - suffix (0.20): Academic suffixes (-ological, -ization, -iousness, -itude at 1.0;
	 *   common academic endings like -ented, -able, -ory at 0.70) indicate formal register.
	 * - morphology (0.10): Morphological complexity (prefixes such as un-, in-, dis-, contra-)
	 *   signals multi-morphemic academic words.
	 *
	 * Together, these weights ensure:
	 * - Level A (< 0.40): "sing", "dice", "fear" (~0.20)
	 * - Level B (0.40 - 0.70): "ancient", "fragile", "achieve" (~0.42)
	 * - Level C (> 0.70): "unprecedented", "indispensable", "contradictory" (~0.94)
	 */
	const WEIGHTS = Object.freeze({
		length: 0.35,
		syllables: 0.35,
		suffix: 0.2,
		morphology: 0.1,
	});

	const COMPLEX_ACADEMIC_SUFFIXES = Object.freeze([
		"ological",
		"ization",
		"iousness",
		"itude",
	]);

	const PARTIAL_ACADEMIC_SUFFIXES = Object.freeze([
		"ented",
		"able",
		"ible",
		"ence",
		"ance",
		"ious",
		"ory",
	]);

	const PREFIXES = Object.freeze([
		"counter",
		"contra",
		"inter",
		"dis",
		"pre",
		"un",
		"in",
		"re",
	]);

	function cleanWord(word) {
		if (typeof word !== "string") {
			return "";
		}
		return word.toLowerCase().replace(/[^a-z]/g, "");
	}

	function calculateLengthFactor(clean) {
		const len = clean.length;
		if (len === 0) {
			return 0;
		}
		if (len <= 7) {
			return Number(((len / 7) * 0.65).toFixed(2));
		}
		const factor = Math.min(1.0, 0.75 + ((len - 7) / 5) * 0.25);
		return Number(factor.toFixed(2));
	}

	function calculateSyllableFactor(clean) {
		if (!clean) {
			return 0;
		}
		let count = 1;
		if (typeof syllabifyWord === "function") {
			try {
				const res = syllabifyWord(clean);
				if (Array.isArray(res?.syllables) && res.syllables.length > 0) {
					count = res.syllables.length;
				}
			} catch {
				const vowels = clean.match(/[aeiouy]+/g);
				count = vowels ? vowels.length : 1;
			}
		} else {
			const vowels = clean.match(/[aeiouy]+/g);
			count = vowels ? vowels.length : 1;
		}

		if (count <= 1) {
			return 0.2;
		}
		if (count === 2) {
			return 0.55;
		}
		if (count === 3) {
			return 0.8;
		}
		if (count === 4) {
			return 0.9;
		}
		return 1.0;
	}

	function calculateSuffixFactor(clean) {
		if (clean.length < 4) {
			return 0;
		}
		for (const suf of COMPLEX_ACADEMIC_SUFFIXES) {
			if (clean.endsWith(suf) && clean.length > suf.length + 1) {
				return 1.0;
			}
		}
		for (const suf of PARTIAL_ACADEMIC_SUFFIXES) {
			if (clean.endsWith(suf) && clean.length > suf.length + 1) {
				return 0.7;
			}
		}
		return 0;
	}

	function calculateMorphologyFactor(clean) {
		if (clean.length < 4) {
			return 0;
		}
		for (const pre of PREFIXES) {
			if (clean.startsWith(pre) && clean.length >= pre.length + 3) {
				return 1.0;
			}
		}
		return 0;
	}

	function getFactors(clean) {
		if (!clean) {
			return {
				length: 0,
				syllables: 0,
				suffix: 0,
				morphology: 0,
			};
		}
		return {
			length: calculateLengthFactor(clean),
			syllables: calculateSyllableFactor(clean),
			suffix: calculateSuffixFactor(clean),
			morphology: calculateMorphologyFactor(clean),
		};
	}

	function calculateComplexityScore(word) {
		const clean = cleanWord(word);
		if (!clean) {
			return 0;
		}
		const factors = getFactors(clean);
		const raw =
			factors.length * WEIGHTS.length +
			factors.syllables * WEIGHTS.syllables +
			factors.suffix * WEIGHTS.suffix +
			factors.morphology * WEIGHTS.morphology;
		const clamped = Math.max(0, Math.min(1, raw));
		return Number(clamped.toFixed(2));
	}

	function estimateAmiramLevel(word) {
		const clean = cleanWord(word);
		if (!clean) {
			return {
				word: "",
				score: 0,
				level: "A_foundational",
				factors: {
					length: 0,
					syllables: 0,
					suffix: 0,
					morphology: 0,
				},
			};
		}
		const factors = getFactors(clean);
		const score = calculateComplexityScore(clean);
		const level =
			score < 0.4
				? "A_foundational"
				: score <= 0.7
					? "B_intermediate"
					: "C_advanced";
		return {
			word: clean,
			score,
			level,
			factors,
		};
	}

	return {
		calculateComplexityScore,
		estimateAmiramLevel,
		WEIGHTS,
	};
});
