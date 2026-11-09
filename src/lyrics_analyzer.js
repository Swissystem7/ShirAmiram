((root, factory) => {
	if (typeof module === "object" && module.exports) {
		const difficultyEstimator = require("./difficulty_estimator.js");
		const vocabMatcher = require("./vocab_matcher.js");
		module.exports = factory(
			difficultyEstimator.calculateComplexityScore,
			vocabMatcher.matchWord,
		);
	} else {
		root.ShirAmiramLyricsAnalyzer = factory(
			root.ShirAmiramDifficultyEstimator?.calculateComplexityScore,
			root.ShirAmiramVocabMatcher?.matchWord,
		);
	}
})(
	typeof self !== "undefined" ? self : this,
	(calculateComplexityScore, matchWord) => {
		/**
		 * Frozen WEIGHTS object defining the contribution of each richness factor
		 * to overallScore. The weights sum to exactly 1.0:
		 * - typeTokenRatio (0.40): Lexical diversity (uniqueTokens / totalTokens);
		 *   varied lyrics score higher than repetitive lyrics.
		 * - targetWordDensity (0.30): Share of tokens matched as target vocabulary
		 *   by matchWord (reported 0-100, normalized to 0-1 in the formula).
		 * - averageComplexity (0.30): Mean calculateComplexityScore (0-1) of the
		 *   matched target tokens.
		 *
		 * overallScore = round(100 * (0.40 * typeTokenRatio
		 *   + 0.30 * (targetWordDensity / 100)
		 *   + 0.30 * averageComplexity)), clamped to an integer in [0, 100].
		 */
		const WEIGHTS = Object.freeze({
			typeTokenRatio: 0.4,
			targetWordDensity: 0.3,
			averageComplexity: 0.3,
		});

		function zeroReport() {
			return {
				totalTokens: 0,
				uniqueTokens: 0,
				typeTokenRatio: 0,
				targetWordDensity: 0,
				averageComplexity: 0,
				overallScore: 0,
			};
		}

		function tokenizeLyrics(text) {
			const normalized = text.toLowerCase().replace(/’/g, "'");
			return normalized.match(/[a-z]+(?:'[a-z]+)*/g) ?? [];
		}

		function analyzeLyricsRichness(lyricsText, vocabCatalog) {
			if (typeof lyricsText !== "string") {
				return zeroReport();
			}
			const tokens = tokenizeLyrics(lyricsText);
			const totalTokens = tokens.length;
			if (totalTokens === 0) {
				return zeroReport();
			}
			const uniqueTokens = new Set(tokens).size;
			const typeTokenRatio = uniqueTokens / totalTokens;
			const catalog = Array.isArray(vocabCatalog) ? vocabCatalog : [];
			const matchedTokens = [];
			if (catalog.length > 0 && typeof matchWord === "function") {
				for (const token of tokens) {
					try {
						const result = matchWord(token, catalog);
						if (result?.matched) {
							matchedTokens.push(token);
						}
					} catch {
						// A failed match counts as no match for this token.
					}
				}
			}
			const targetWordDensity =
				Math.round((matchedTokens.length / totalTokens) * 100 * 10) / 10;
			let averageComplexity = 0;
			if (
				matchedTokens.length > 0 &&
				typeof calculateComplexityScore === "function"
			) {
				let sum = 0;
				for (const token of matchedTokens) {
					const score = calculateComplexityScore(token);
					sum +=
						typeof score === "number" && Number.isFinite(score) ? score : 0;
				}
				averageComplexity = Number((sum / matchedTokens.length).toFixed(3));
			}
			const rawScore =
				WEIGHTS.typeTokenRatio * typeTokenRatio +
				WEIGHTS.targetWordDensity * (targetWordDensity / 100) +
				WEIGHTS.averageComplexity * averageComplexity;
			const overallScore = Math.max(
				0,
				Math.min(100, Math.round(rawScore * 100)),
			);
			return {
				totalTokens,
				uniqueTokens,
				typeTokenRatio,
				targetWordDensity,
				averageComplexity,
				overallScore,
			};
		}

		function extractLyrics(song) {
			if (typeof song === "string") {
				return song;
			}
			if (typeof song?.lyrics === "string") {
				return song.lyrics;
			}
			return "";
		}

		function compareSongsByDifficulty(songA, songB, vocabCatalog) {
			const reportA = analyzeLyricsRichness(extractLyrics(songA), vocabCatalog);
			const reportB = analyzeLyricsRichness(extractLyrics(songB), vocabCatalog);
			if (reportA.overallScore !== reportB.overallScore) {
				return reportA.overallScore - reportB.overallScore;
			}
			return reportA.averageComplexity - reportB.averageComplexity;
		}

		return {
			analyzeLyricsRichness,
			compareSongsByDifficulty,
			WEIGHTS,
		};
	},
);
