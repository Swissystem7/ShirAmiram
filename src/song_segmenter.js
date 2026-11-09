((root, factory) => {
	if (typeof module === "object" && module.exports) {
		const vocabMatcher = require("./vocab_matcher.js");
		module.exports = factory(vocabMatcher.matchWord);
	} else {
		root.ShirAmiramSongSegmenter = factory(
			root.ShirAmiramVocabMatcher?.matchWord,
		);
	}
})(typeof self !== "undefined" ? self : this, (matchWord) => {
	const SECTION_TYPES = Object.freeze({
		CHORUS: "CHORUS",
		VERSE: "VERSE",
		BRIDGE: "BRIDGE",
		OTHER: "OTHER",
	});

	const DEFAULT_CHORUS_REINFORCEMENT_FACTOR = 2;

	const BRACKET_TAG_REGEX = /^\s*\[([^\]]+)\](?:\s*(.*))?$/;
	const COLON_TAG_REGEX = /^\s*([A-Za-z0-9 _-]+):\s*(.*)$/;

	const KNOWN_SECTION_KEYWORDS = new Set([
		"verse",
		"chorus",
		"bridge",
		"intro",
		"outro",
		"pre-chorus",
		"post-chorus",
		"hook",
		"refrain",
		"interlude",
		"solo",
		"coda",
	]);

	function isColonTag(name) {
		if (!name || typeof name !== "string") return false;
		const lower = name.trim().toLowerCase();
		const firstWord = lower.split(/\s+/)[0];
		return (
			KNOWN_SECTION_KEYWORDS.has(lower) || KNOWN_SECTION_KEYWORDS.has(firstWord)
		);
	}

	function classifySectionTag(rawTag) {
		if (typeof rawTag !== "string") return null;
		const tag = rawTag.trim().toLowerCase();
		if (!tag) return null;

		if (tag.includes("pre-chorus") || tag.includes("post-chorus")) {
			return SECTION_TYPES.OTHER;
		}
		if (
			tag.includes("chorus") ||
			tag.includes("hook") ||
			tag.includes("refrain")
		) {
			return SECTION_TYPES.CHORUS;
		}
		if (tag.includes("verse") || tag.includes("strophe")) {
			return SECTION_TYPES.VERSE;
		}
		if (tag.includes("bridge")) {
			return SECTION_TYPES.BRIDGE;
		}
		return SECTION_TYPES.OTHER;
	}

	function safeMatchWord(word, catalog, options) {
		if (typeof matchWord === "function") {
			try {
				return matchWord(word, catalog, options);
			} catch {
				return { matched: false };
			}
		}
		return { matched: false };
	}

	function tokenizeLine(line) {
		if (typeof line !== "string") return [];
		const normalized = line.toLowerCase().replace(/’/g, "'");
		return normalized.match(/[a-z]+(?:'[a-z]+)*/g) ?? [];
	}

	function segmentLyricsStructure(lyricsText) {
		if (typeof lyricsText !== "string") return [];
		const text = lyricsText.trim();
		if (text === "") return [];

		const lines = text.split(/\r?\n/);
		const sections = [];
		let currentSection = null;

		for (const rawLine of lines) {
			const line = rawLine.trim();

			let tagInfo = null;
			const bracketMatch = line.match(BRACKET_TAG_REGEX);
			if (bracketMatch) {
				tagInfo = {
					tag: bracketMatch[1].trim(),
					remainder: bracketMatch[2] ? bracketMatch[2].trim() : "",
				};
			} else {
				const colonMatch = line.match(COLON_TAG_REGEX);
				if (colonMatch && isColonTag(colonMatch[1])) {
					tagInfo = {
						tag: colonMatch[1].trim(),
						remainder: colonMatch[2] ? colonMatch[2].trim() : "",
					};
				}
			}

			if (tagInfo !== null) {
				if (currentSection && currentSection.lines.length > 0) {
					sections.push(currentSection);
				}
				currentSection = {
					type: classifySectionTag(tagInfo.tag),
					lines: tagInfo.remainder ? [tagInfo.remainder] : [],
				};
				continue;
			}

			if (line === "") {
				if (currentSection && currentSection.lines.length > 0) {
					sections.push(currentSection);
					currentSection = null;
				}
				continue;
			}

			if (currentSection === null) {
				currentSection = {
					type: SECTION_TYPES.VERSE,
					lines: [line],
				};
			} else {
				currentSection.lines.push(line);
			}
		}

		if (currentSection && currentSection.lines.length > 0) {
			sections.push(currentSection);
		}

		return sections;
	}

	function analyzeSectionVocabulary(sections, vocabCatalog, options = {}) {
		if (!Array.isArray(sections) || sections.length === 0) {
			const emptyResult = {
				sections: [],
				totalChorusRepetitions: 0,
				highImpactWords: [],
			};
			Object.defineProperty(emptyResult, "chorusReinforcementFactor", {
				value: DEFAULT_CHORUS_REINFORCEMENT_FACTOR,
				enumerable: false,
				writable: true,
				configurable: true,
			});
			return emptyResult;
		}

		const factor =
			typeof options === "number" && options > 0
				? options
				: typeof options?.chorusReinforcementFactor === "number" &&
						options.chorusReinforcementFactor > 0
					? options.chorusReinforcementFactor
					: DEFAULT_CHORUS_REINFORCEMENT_FACTOR;

		const threshold =
			typeof options?.minImpactThreshold === "number"
				? options.minImpactThreshold
				: Math.min(2, factor);

		const catalog =
			Array.isArray(vocabCatalog) || vocabCatalog?.exactMap ? vocabCatalog : [];

		const analyzedSections = [];
		const wordStats = new Map();
		let totalChorusRepetitions = 0;

		for (const section of sections) {
			const type = section?.type || SECTION_TYPES.OTHER;
			const lines = Array.isArray(section?.lines) ? section.lines : [];

			if (type === SECTION_TYPES.CHORUS) {
				totalChorusRepetitions++;
			}

			const sectionTargetWords = [];

			if (catalog) {
				for (const line of lines) {
					const tokens = tokenizeLine(line);
					for (const token of tokens) {
						const match = safeMatchWord(token, catalog);
						if (match?.matched) {
							const canonical = match.targetWord || token;
							sectionTargetWords.push(canonical);

							let stats = wordStats.get(canonical);
							if (!stats) {
								stats = { chorusCount: 0, nonChorusCount: 0 };
								wordStats.set(canonical, stats);
							}
							if (type === SECTION_TYPES.CHORUS) {
								stats.chorusCount++;
							} else {
								stats.nonChorusCount++;
							}
						}
					}
				}
			}

			analyzedSections.push({
				...section,
				type,
				lines: [...lines],
				targetWordCount: sectionTargetWords.length,
				targetWords: sectionTargetWords,
				uniqueTargetWords: Array.from(new Set(sectionTargetWords)),
			});
		}

		const highImpactItems = [];
		for (const [word, stats] of wordStats.entries()) {
			const impactScore = stats.chorusCount * factor + stats.nonChorusCount;
			if (impactScore >= threshold) {
				highImpactItems.push({ word, score: impactScore });
			}
		}

		highImpactItems.sort((a, b) => {
			if (b.score !== a.score) {
				return b.score - a.score;
			}
			return a.word.localeCompare(b.word);
		});

		const result = {
			sections: analyzedSections,
			totalChorusRepetitions,
			highImpactWords: highImpactItems.map((item) => item.word),
		};

		Object.defineProperty(result, "chorusReinforcementFactor", {
			value: factor,
			enumerable: false,
			writable: true,
			configurable: true,
		});

		return result;
	}

	return {
		SECTION_TYPES,
		DEFAULT_CHORUS_REINFORCEMENT_FACTOR,
		segmentLyricsStructure,
		analyzeSectionVocabulary,
	};
});
