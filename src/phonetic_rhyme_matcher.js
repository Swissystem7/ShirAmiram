((root, factory) => {
	if (typeof module === "object" && module.exports) {
		const pronunciationHint = require("./pronunciation_hint.js");
		module.exports = factory(pronunciationHint.syllabifyWord);
	} else {
		root.ShirAmiramPhoneticRhymeMatcher = factory(
			root.ShirAmiramPronunciationHint?.syllabifyWord,
		);
	}
})(typeof self !== "undefined" ? self : this, (syllabifyWord) => {
	function cleanWord(word) {
		if (typeof word !== "string") {
			return "";
		}
		return word.toLowerCase().replace(/[^a-z]/g, "");
	}

	function getLastSyllable(clean) {
		if (typeof syllabifyWord === "function") {
			try {
				const res = syllabifyWord(clean);
				if (Array.isArray(res?.syllables) && res.syllables.length > 0) {
					return res.syllables[res.syllables.length - 1];
				}
			} catch {
				// fallback to clean word below
			}
		}
		return clean;
	}

	function getSyllableParts(syl) {
		if (syl.length >= 3 && syl.endsWith("e") && !syl.endsWith("ee")) {
			const m = syl.match(/^(.*?)([aeiouy]+)([bcdfghjklmnpqrstvwxyz]+)e$/);
			if (m) {
				const v = m[2];
				const c = m[3];
				let vowelSound = v;
				if (v.length > 1) {
					if (v === "ee" || v === "ea") {
						vowelSound = "long_e";
					} else if (v === "ai") {
						vowelSound = "long_a";
					} else if (v === "ou") {
						vowelSound = "ou";
					}
				} else {
					const isSingleConsonantOrDigraph =
						c.length === 1 || ["th", "sh", "ch", "ph", "wh"].includes(c);
					if (isSingleConsonantOrDigraph) {
						if (v === "a") vowelSound = "long_a";
						else if (v === "i" || v === "y") vowelSound = "long_i";
						else if (v === "o") vowelSound = "long_o";
						else if (v === "u") vowelSound = "long_u";
						else if (v === "e") vowelSound = "long_e";
					} else {
						if (v === "a") vowelSound = "short_a";
						else if (v === "e") vowelSound = "short_e";
						else if (v === "i" || v === "y") vowelSound = "short_i";
						else if (v === "o") vowelSound = "short_o";
						else if (v === "u") vowelSound = "short_u";
					}
				}
				return { vowelSound, coda: c };
			}
		}

		const mIgh = syl.match(/^(.*?)(igh)([bcdfghjklmnpqrstvwxyz]*)$/);
		if (mIgh) {
			return { vowelSound: "long_i", coda: mIgh[3] };
		}

		const mVowel = syl.match(
			/^(.*?)((?:[aeiouy]+(?:w)?))([bcdfghjklmnpqrstvwxyz]*)$/,
		);
		if (mVowel) {
			const v = mVowel[2];
			const c = mVowel[3];
			let vowelSound = v;
			if (v === "ay" || v === "ai" || v === "ey" || v === "eigh") {
				vowelSound = "long_a";
			} else if (v === "ee" || v === "ea" || v === "ie") {
				vowelSound = "long_e";
			} else if (v === "y") {
				vowelSound = "long_i";
			} else if (v === "oa" || v === "oe") {
				vowelSound = "long_o";
			} else if (v === "oo" || v === "ew" || v === "u" + "e") {
				vowelSound = "long_u";
			} else if (v === "ou" || v === "ow") {
				vowelSound = "ou";
			} else if (v === "oi" || v === "oy") {
				vowelSound = "oi";
			} else if (v === "au" || v === "aw") {
				vowelSound = "aw";
			} else if (v === "a") {
				vowelSound = "short_a";
			} else if (v === "e") {
				vowelSound = "short_e";
			} else if (v === "i") {
				vowelSound = "short_i";
			} else if (v === "o") {
				vowelSound = "short_o";
			} else if (v === "u") {
				vowelSound = "short_u";
			}
			return { vowelSound, coda: c };
		}

		return { vowelSound: syl, coda: "" };
	}

	function normalizeCoda(coda) {
		if (!coda) {
			return "";
		}
		let res = coda;
		res = res.replace(/ck$/, "k");
		res = res.replace(/c$/, "s");
		res = res.replace(/ph$/, "f");
		res = res.replace(/([bdfgklmnprstvz])\1+$/, "$1");
		return res;
	}

	function checkWordRhyme(a, b) {
		const normA = cleanWord(a);
		const normB = cleanWord(b);

		if (!normA || !normB) {
			return { type: "NONE", score: 0.0, isIdentical: false };
		}

		if (normA === normB) {
			return { type: "IDENTICAL", score: 0.0, isIdentical: true };
		}

		const lastA = getLastSyllable(normA);
		const lastB = getLastSyllable(normB);

		const partsA = getSyllableParts(lastA);
		const partsB = getSyllableParts(lastB);

		if (!partsA.vowelSound || !partsB.vowelSound) {
			return { type: "NONE", score: 0.0, isIdentical: false };
		}

		const codaA = normalizeCoda(partsA.coda);
		const codaB = normalizeCoda(partsB.coda);

		if (partsA.vowelSound === partsB.vowelSound) {
			if (codaA === codaB) {
				return { type: "EXACT", score: 1.0, isIdentical: false };
			}
			return { type: "SLANT", score: 0.6, isIdentical: false };
		}

		return { type: "NONE", score: 0.0, isIdentical: false };
	}

	function extractLastWord(line) {
		if (typeof line !== "string") {
			return "";
		}
		const match = line.match(/[a-zA-Z]+/g);
		return match ? match[match.length - 1].toLowerCase() : "";
	}

	function analyzeStanzaRhymeScheme(lines) {
		if (!Array.isArray(lines) || lines.length === 0) {
			return { scheme: "", pattern: "OTHER", score: 0 };
		}

		const words = lines.map((line) => extractLastWord(line));
		const letters = new Array(lines.length);
		let nextLetterIndex = 0;

		for (let i = 0; i < lines.length; i++) {
			if (!words[i]) {
				letters[i] = String.fromCharCode(65 + (nextLetterIndex % 26));
				nextLetterIndex++;
				continue;
			}

			let bestMatchJ = -1;
			let bestScore = 0;

			for (let j = 0; j < i; j++) {
				if (!words[j]) {
					continue;
				}
				const rhyme = checkWordRhyme(words[j], words[i]);
				if (
					(rhyme.type === "EXACT" || rhyme.type === "SLANT") &&
					rhyme.score > bestScore
				) {
					bestScore = rhyme.score;
					bestMatchJ = j;
				}
			}

			if (bestMatchJ !== -1) {
				letters[i] = letters[bestMatchJ];
			} else {
				letters[i] = String.fromCharCode(65 + (nextLetterIndex % 26));
				nextLetterIndex++;
			}
		}

		const scheme = letters.join("");
		let pattern = "OTHER";
		if (scheme === "AABB" || scheme === "ABAB" || scheme === "ABCB") {
			pattern = scheme;
		}

		let totalWeightedRhymingLines = 0;
		for (let i = 0; i < lines.length; i++) {
			if (!words[i]) {
				continue;
			}
			let maxLineScore = 0;
			for (let j = 0; j < lines.length; j++) {
				if (i === j || !words[j]) {
					continue;
				}
				const rhyme = checkWordRhyme(words[i], words[j]);
				if (rhyme.score > maxLineScore) {
					maxLineScore = rhyme.score;
				}
			}
			totalWeightedRhymingLines += maxLineScore;
		}

		const rawScore = (totalWeightedRhymingLines / lines.length) * 100;
		const score = Math.max(0, Math.min(100, Math.round(rawScore)));

		return { scheme, pattern, score };
	}

	return {
		checkWordRhyme,
		analyzeStanzaRhymeScheme,
	};
});
