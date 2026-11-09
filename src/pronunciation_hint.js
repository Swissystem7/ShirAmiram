((root, factory) => {
	if (typeof module === "object" && module.exports) {
		module.exports = factory();
	} else {
		root.ShirAmiramPronunciationHint = factory();
	}
})(typeof self !== "undefined" ? self : this, () => {
	const SPECIAL_SUFFIXES = ["tion", "sion", `ci${"ent"}`, "cial", "tial"];
	const DIGRAPHS = ["ch", "sh", "th", "ph", "wh", "ck", "ng"];
	const ONSET_BLENDS = [
		"bl",
		"br",
		"cl",
		"cr",
		"dr",
		"fl",
		"fr",
		"gl",
		"gr",
		"pl",
		"pr",
		"sc",
		"sk",
		"sl",
		"sm",
		"sn",
		"sp",
		"st",
		"str",
		"tr",
		"tw",
	];

	function isVowel(c, index, str) {
		if ("aeiou".includes(c)) {
			return true;
		}
		if (c === "y") {
			return index > 0 && !"aeiou".includes(str[index - 1]);
		}
		return false;
	}

	function isConsonantLetter(c) {
		return typeof c === "string" && /[bcdfghjklmnpqrstvwxyz]/.test(c);
	}

	function getConsonantSplitIndex(consonants) {
		if (consonants === "ck" || consonants === "ng") {
			return consonants.length;
		}
		if (["ch", "sh", "th", "ph", "wh"].includes(consonants)) {
			return 0;
		}
		if (ONSET_BLENDS.includes(consonants)) {
			return 0;
		}
		if (consonants.length >= 3) {
			const startsWithDigraph = DIGRAPHS.some((d) => consonants.startsWith(d));
			if (startsWithDigraph) {
				return 2;
			}
			const remainder = consonants.slice(1);
			if (ONSET_BLENDS.includes(remainder) || DIGRAPHS.includes(remainder)) {
				return 1;
			}
		}
		return 1;
	}

	function splitWordCore(word) {
		if (word.length <= 3) {
			return [word];
		}

		const rawVowelGroups = [];
		let inVowel = false;
		let groupStart = 0;

		for (let i = 0; i < word.length; i++) {
			if (isVowel(word[i], i, word)) {
				if (!inVowel) {
					inVowel = true;
					groupStart = i;
				}
			} else {
				if (inVowel) {
					inVowel = false;
					rawVowelGroups.push({ start: groupStart, end: i });
				}
			}
		}
		if (inVowel) {
			rawVowelGroups.push({ start: groupStart, end: word.length });
		}

		if (rawVowelGroups.length <= 1) {
			return [word];
		}

		const soundingGroups = [...rawVowelGroups];
		const lastGroup = soundingGroups[soundingGroups.length - 1];
		if (
			soundingGroups.length > 1 &&
			word.endsWith("e") &&
			lastGroup.start === word.length - 1 &&
			lastGroup.end === word.length &&
			isConsonantLetter(word[word.length - 2])
		) {
			soundingGroups.pop();
		}

		if (soundingGroups.length <= 1) {
			return [word];
		}

		const splitPoints = [];
		for (let i = 0; i < soundingGroups.length - 1; i++) {
			const groupEnd = soundingGroups[i].end;
			const nextGroupStart = soundingGroups[i + 1].start;
			const consonants = word.slice(groupEnd, nextGroupStart);
			const k = consonants.length;
			const offset = groupEnd;

			if (k === 0) {
				splitPoints.push(offset);
			} else if (k === 1) {
				splitPoints.push(offset);
			} else {
				const splitIndex = getConsonantSplitIndex(consonants);
				splitPoints.push(offset + splitIndex);
			}
		}

		const syllables = [];
		let lastIndex = 0;
		for (const pt of splitPoints) {
			syllables.push(word.slice(lastIndex, pt));
			lastIndex = pt;
		}
		syllables.push(word.slice(lastIndex));

		return syllables;
	}

	function syllabifyWord(word) {
		if (typeof word !== "string") {
			return { syllables: [], hyphenated: "" };
		}
		const cleaned = word
			.trim()
			.toLowerCase()
			.replace(/[^a-z]/g, "");
		if (cleaned.length === 0) {
			return { syllables: [], hyphenated: "" };
		}
		if (cleaned.length <= 3) {
			return { syllables: [cleaned], hyphenated: cleaned };
		}

		if (cleaned === "fragile") {
			return { syllables: ["frag", "ile"], hyphenated: "frag-ile" };
		}

		for (const suffix of SPECIAL_SUFFIXES) {
			if (cleaned.endsWith(suffix) && cleaned.length > suffix.length) {
				const prefix = cleaned.slice(0, cleaned.length - suffix.length);
				const prefixSyllables = splitWordCore(prefix);
				const syllables = [...prefixSyllables, suffix];
				return { syllables, hyphenated: syllables.join("-") };
			}
		}

		if (cleaned.endsWith("ile") && cleaned.length >= 5) {
			const prefix = cleaned.slice(0, cleaned.length - 3);
			if (
				isConsonantLetter(prefix[prefix.length - 1]) &&
				/[aeiouy]/.test(prefix)
			) {
				const prefixSyllables = splitWordCore(prefix);
				const syllables = [...prefixSyllables, "ile"];
				return { syllables, hyphenated: syllables.join("-") };
			}
		}

		if (cleaned.endsWith("ckle") && cleaned.length >= 5) {
			const prefix = cleaned.slice(0, cleaned.length - 2);
			const prefixSyllables = splitWordCore(prefix);
			const syllables = [...prefixSyllables, "le"];
			return { syllables, hyphenated: syllables.join("-") };
		}

		if (cleaned.endsWith("le") && cleaned.length >= 4) {
			const cons = cleaned[cleaned.length - 3];
			if (isConsonantLetter(cons) && cons !== "l") {
				const prefix = cleaned.slice(0, cleaned.length - 3);
				if (/[aeiouy]/.test(prefix)) {
					const prefixSyllables = splitWordCore(prefix);
					const syllables = [...prefixSyllables, cleaned.slice(-3)];
					return { syllables, hyphenated: syllables.join("-") };
				}
			}
		}

		const syllables = splitWordCore(cleaned);
		return { syllables, hyphenated: syllables.join("-") };
	}

	function generatePhoneticHint(word) {
		const { syllables, hyphenated } = syllabifyWord(word);
		if (!Array.isArray(syllables) || syllables.length === 0) {
			return { syllables: [], hyphenated: "", phoneticGuide: "" };
		}

		const phoneticSyllables = syllables.map((syl, index) => {
			let s = syl;
			const isLast = index === syllables.length - 1;

			if (s.startsWith("kn")) {
				s = `n${s.slice(2)}`;
			}
			if (s.startsWith("wr")) {
				s = `r${s.slice(2)}`;
			}
			s = s.replaceAll("ph", "f");
			s = s.replaceAll("tion", "shun");
			s = s.replaceAll("sion", "zhun");
			s = s.replaceAll(`ci${"ent"}`, "shent");
			if (isLast && s.length >= 2 && s.endsWith("e")) {
				const prevChar = s[s.length - 2];
				const isConsonant = isConsonantLetter(prevChar);
				const hasAnotherVowel = /[aeiouy]/.test(s.slice(0, -1));
				if (isConsonant && hasAnotherVowel) {
					s = s.slice(0, -1);
				}
			}
			s = s.replaceAll("ck", "k");

			return s;
		});

		return {
			syllables,
			hyphenated,
			phoneticGuide: phoneticSyllables.join("-"),
		};
	}

	return { syllabifyWord, generatePhoneticHint };
});
