((root, factory) => {
	if (typeof module === "object" && module.exports) {
		const generator = require("./distractor_generator.js");
		module.exports = factory(
			generator.generateDistractors,
			generator.formatQuestionChoices,
		);
	} else {
		root.ShirAmiramClozeGenerator = factory(
			root.ShirAmiramDistractorGenerator.generateDistractors,
			root.ShirAmiramDistractorGenerator.formatQuestionChoices,
		);
	}
})(
	typeof self !== "undefined" ? self : this,
	(generateDistractors, formatQuestionChoices) => {
		function escapeRegExp(value) {
			return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		}

		/**
		 * Generate a multi-blank cloze passage from text and target words.
		 *
		 * Matching uses strict ASCII word boundaries (`\b`) to match target words,
		 * ensuring e.g. 'ancient' does not match inside 'ancients'.
		 *
		 * @param {string} passageText The original passage text.
		 * @param {Array<string|Object>} targetWords Target words or catalog entries.
		 * @param {Array<string|Object>} wordPool Pool of vocabulary entries for distractors.
		 * @param {Object} [options={ seed: null }] Options object including optional PRNG seed.
		 * @returns {{ maskedPassage: string, blanks: Array<{ index: number, targetWord: string, choices: string[], correctIndex: number }> }}
		 */
		function generateClozePassage(
			passageText,
			targetWords,
			wordPool,
			options = { seed: null },
		) {
			if (
				typeof passageText !== "string" ||
				passageText.trim() === "" ||
				!Array.isArray(targetWords)
			) {
				return {
					maskedPassage: typeof passageText === "string" ? passageText : "",
					blanks: [],
				};
			}

			const opts =
				options !== null && typeof options === "object" ? options : {};
			const seed =
				Object.hasOwn(opts, "seed") && opts.seed !== undefined
					? opts.seed
					: null;

			// Extract unique target entries by lower-case word
			const seenTargetWords = new Set();
			const candidateTargets = [];
			for (const item of targetWords) {
				const isObject =
					item !== null &&
					typeof item === "object" &&
					typeof item.word === "string";
				const rawWord = isObject ? item.word : item;
				if (typeof rawWord !== "string" || rawWord.trim() === "") continue;
				const lowerWord = rawWord.trim().toLowerCase();
				if (seenTargetWords.has(lowerWord)) continue;
				seenTargetWords.add(lowerWord);
				candidateTargets.push({
					lowerWord,
					item,
				});
			}

			// Find first occurrence of each target word in passageText on word boundaries
			const rawMatches = [];
			for (const candidate of candidateTargets) {
				const pattern = new RegExp(
					`\\b${escapeRegExp(candidate.lowerWord)}\\b`,
					"i",
				);
				const match = pattern.exec(passageText);
				if (match) {
					rawMatches.push({
						start: match.index,
						end: match.index + match[0].length,
						lowerWord: candidate.lowerWord,
						matchedText: match[0],
						item: candidate.item,
					});
				}
			}

			// Sort by appearance in the passage
			rawMatches.sort((a, b) => a.start - b.start);

			// Filter out any overlapping matches (earlier takes precedence)
			const acceptedMatches = [];
			let lastEnd = 0;
			for (const match of rawMatches) {
				if (match.start >= lastEnd) {
					acceptedMatches.push(match);
					lastEnd = match.end;
				}
			}

			if (acceptedMatches.length === 0) {
				return {
					maskedPassage: passageText,
					blanks: [],
				};
			}

			// Build masked passage and blank question records
			let maskedPassage = "";
			let currentOffset = 0;
			const blanks = [];

			for (let i = 0; i < acceptedMatches.length; i += 1) {
				const blankIndex = i + 1;
				const match = acceptedMatches[i];

				maskedPassage +=
					passageText.slice(currentOffset, match.start) +
					`[${blankIndex}] ________`;
				currentOffset = match.end;

				const { distractors } = generateDistractors(match.item, wordPool, {
					count: 3,
					samePOS: true,
					seed,
				});

				let choices = [];
				let correctIndex = -1;

				if (Array.isArray(distractors) && distractors.length >= 3) {
					const formatted = formatQuestionChoices(
						match.item,
						distractors,
						seed,
					);
					if (
						Array.isArray(formatted?.choices) &&
						formatted.choices.length === 4 &&
						formatted.correctIndex >= 0
					) {
						choices = formatted.choices;
						correctIndex = formatted.correctIndex;
					}
				}

				blanks.push({
					index: blankIndex,
					targetWord: match.lowerWord,
					matchedText: match.matchedText,
					choices,
					correctIndex,
				});
			}

			maskedPassage += passageText.slice(currentOffset);

			return {
				maskedPassage,
				blanks,
			};
		}

		return {
			generateClozePassage,
		};
	},
);
