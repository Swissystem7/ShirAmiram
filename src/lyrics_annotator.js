((root, factory) => {
	if (typeof module === "object" && module.exports) {
		const matcher = require("./vocab_matcher.js");
		const taxonomy = require("./vocab_taxonomy.js");
		module.exports = factory(
			matcher.matchWord,
			taxonomy.classifyWord,
			matcher.buildLexicalIndex,
		);
	} else {
		root.ShirAmiramLyricsAnnotator = factory(
			root.ShirAmiramVocabMatcher?.matchWord,
			root.ShirAmiramVocabTaxonomy?.classifyWord,
			root.ShirAmiramVocabMatcher?.buildLexicalIndex,
		);
	}
})(
	typeof self !== "undefined" ? self : this,
	(matchWord, classifyWord, buildLexicalIndex) => {
		const TOKEN_REGEX = /([A-Za-z]+(?:['’][A-Za-z]+)*|\s+|\d+|[^A-Za-z0-9\s])/g;

		function resolveCatalogIndex(vocabCatalog) {
			if (!vocabCatalog) return null;
			if (vocabCatalog.exactMap && vocabCatalog.stemMap) {
				return vocabCatalog;
			}
			if (typeof buildLexicalIndex === "function") {
				try {
					return buildLexicalIndex(vocabCatalog);
				} catch {
					return vocabCatalog;
				}
			}
			return vocabCatalog;
		}

		function resolvePartOfSpeech(catalogItem, cleanWord) {
			const itemPos =
				catalogItem?.partOfSpeech ||
				catalogItem?.part_of_speech ||
				catalogItem?.category;
			if (itemPos && itemPos !== "unknown") {
				return itemPos;
			}
			if (typeof classifyWord === "function" && cleanWord) {
				try {
					const res = classifyWord(cleanWord);
					if (res?.partOfSpeech && res.partOfSpeech !== "unknown") {
						return res.partOfSpeech;
					}
				} catch {
					return "General";
				}
			}
			return "General";
		}

		function tokenizeLine(lineText, vocabCatalog) {
			if (typeof lineText !== "string" || lineText === "") {
				return [];
			}

			const catalogIndex = resolveCatalogIndex(vocabCatalog);
			const tokens = [];

			for (const match of lineText.matchAll(TOKEN_REGEX)) {
				const text = match[0];
				const start = match.index;
				const end = start + text.length;
				const isWord = /^[A-Za-z]/.test(text);

				let isTarget = false;
				let wordMetadata = null;

				if (isWord && typeof matchWord === "function" && catalogIndex) {
					try {
						const matchResult = matchWord(text, catalogIndex);
						if (
							matchResult &&
							(matchResult.matchType === "exact" ||
								matchResult.matchType === "stem")
						) {
							isTarget = true;
							const cleanWord =
								matchResult.targetWord ||
								matchResult.matchedWord ||
								matchResult.item?.word ||
								text.toLowerCase();
							const partOfSpeech = resolvePartOfSpeech(
								matchResult.item || matchResult.vocabEntry,
								cleanWord,
							);
							wordMetadata = {
								cleanWord,
								partOfSpeech,
								matchType: matchResult.matchType,
							};
						}
					} catch {
						isTarget = false;
						wordMetadata = null;
					}
				}

				tokens.push({
					text,
					isTarget,
					start,
					end,
					wordMetadata,
				});
			}

			return tokens;
		}

		function annotateFullLyrics(lyricsLines, vocabCatalog) {
			if (!Array.isArray(lyricsLines)) {
				return { lines: [], songTargetWords: [] };
			}

			try {
				const catalogIndex = resolveCatalogIndex(vocabCatalog);
				const lines = [];
				const songTargetWords = [];
				const seenTargets = new Set();

				for (let i = 0; i < lyricsLines.length; i++) {
					const rawLine = lyricsLines[i];
					const text =
						typeof rawLine === "string"
							? rawLine
							: rawLine && typeof rawLine.text === "string"
								? rawLine.text
								: "";
					const tokens = tokenizeLine(text, catalogIndex);

					for (let j = 0; j < tokens.length; j++) {
						const token = tokens[j];
						if (token.isTarget && token.wordMetadata?.cleanWord) {
							const targetWord = token.wordMetadata.cleanWord;
							if (!seenTargets.has(targetWord)) {
								seenTargets.add(targetWord);
								songTargetWords.push(targetWord);
							}
						}
					}

					lines.push({
						lineIndex: i,
						text,
						tokens,
					});
				}

				return { lines, songTargetWords };
			} catch {
				return { lines: [], songTargetWords: [] };
			}
		}

		return { tokenizeLine, annotateFullLyrics };
	},
);
