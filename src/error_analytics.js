((root, factory) => {
	if (typeof module === "object" && module.exports) {
		const vocabTaxonomy = require("./vocab_taxonomy.js");
		const phoneticRhymeMatcher = require("./phonetic_rhyme_matcher.js");
		module.exports = factory(
			vocabTaxonomy.classifyWord,
			phoneticRhymeMatcher.checkWordRhyme,
		);
	} else {
		root.ShirAmiramErrorAnalytics = factory(
			root.ShirAmiramVocabTaxonomy?.classifyWord,
			root.ShirAmiramPhoneticRhymeMatcher?.checkWordRhyme,
		);
	}
})(
	typeof self !== "undefined" ? self : this,
	(classifyWord, checkWordRhyme) => {
		const POS_HEBREW = Object.freeze({
			Noun: "שם עצם",
			Verb: "פועל",
			Adjective: "שם תואר",
			Adverb: "תואר הפועל",
		});

		const KNOWN_POS = new Set(["Noun", "Verb", "Adjective", "Adverb"]);

		function normalizePOS(pos) {
			if (typeof pos !== "string") return null;
			const lower = pos.trim().toLowerCase();
			if (lower === "noun") return "Noun";
			if (lower === "verb") return "Verb";
			if (lower === "adjective" || lower === "adj") return "Adjective";
			if (lower === "adverb" || lower === "adv") return "Adverb";
			return null;
		}

		function getPosHebrew(pos) {
			if (!pos) return "";
			const normalized = normalizePOS(pos);
			if (normalized && Object.hasOwn(POS_HEBREW, normalized)) {
				return POS_HEBREW[normalized];
			}
			return pos;
		}

		function safeClassifyWord(word) {
			if (typeof classifyWord === "function") {
				try {
					return classifyWord(word);
				} catch {
					return null;
				}
			}
			return null;
		}

		function safeCheckWordRhyme(a, b) {
			if (typeof checkWordRhyme === "function") {
				try {
					return checkWordRhyme(a, b);
				} catch {
					return null;
				}
			}
			return null;
		}

		function analyzeMistakePattern(targetWord, chosenDistractor) {
			if (
				typeof targetWord !== "string" ||
				typeof chosenDistractor !== "string" ||
				targetWord.trim() === "" ||
				chosenDistractor.trim() === ""
			) {
				return {
					posConfusion: false,
					phoneticTrap: false,
					targetPOS: null,
					chosenPOS: null,
				};
			}

			let targetClass = null;
			let chosenClass = null;
			let rhymeRes = null;

			try {
				targetClass = safeClassifyWord(targetWord);
				chosenClass = safeClassifyWord(chosenDistractor);
				rhymeRes = safeCheckWordRhyme(targetWord, chosenDistractor);
			} catch {
				return {
					posConfusion: false,
					phoneticTrap: false,
					targetPOS: null,
					chosenPOS: null,
				};
			}

			const targetPOS = normalizePOS(targetClass?.partOfSpeech);
			const chosenPOS = normalizePOS(chosenClass?.partOfSpeech);

			const posConfusion = Boolean(
				targetPOS &&
					chosenPOS &&
					KNOWN_POS.has(targetPOS) &&
					KNOWN_POS.has(chosenPOS) &&
					targetPOS !== chosenPOS,
			);

			const phoneticTrap = Boolean(
				rhymeRes &&
					(rhymeRes.type === "EXACT" ||
						rhymeRes.type === "SLANT" ||
						(typeof rhymeRes.score === "number" && rhymeRes.score > 0)) &&
					!rhymeRes.isIdentical,
			);

			return {
				posConfusion,
				phoneticTrap,
				targetPOS,
				chosenPOS,
			};
		}

		function generateDiagnosticSummary(mistakesList = []) {
			if (!Array.isArray(mistakesList)) {
				return {
					total: 0,
					posConfusionPercent: 0,
					phoneticTrapPercent: 0,
					dominantBlindspot: "none",
					tipHe: "אין טעויות לניתוח! המשך כך בתרגול.",
				};
			}

			const validMistakes = [];
			for (const item of mistakesList) {
				if (
					item !== null &&
					typeof item === "object" &&
					typeof item.targetWord === "string" &&
					typeof item.chosenDistractor === "string" &&
					item.targetWord.trim() !== "" &&
					item.chosenDistractor.trim() !== ""
				) {
					validMistakes.push({
						targetWord: item.targetWord,
						chosenDistractor: item.chosenDistractor,
					});
				}
			}

			const total = validMistakes.length;
			if (total === 0) {
				return {
					total: 0,
					posConfusionPercent: 0,
					phoneticTrapPercent: 0,
					dominantBlindspot: "none",
					tipHe: "אין טעויות לניתוח! המשך כך בתרגול.",
				};
			}

			let posConfusionCount = 0;
			let phoneticTrapCount = 0;
			const pairCounts = new Map();

			for (const item of validMistakes) {
				const pattern = analyzeMistakePattern(
					item.targetWord,
					item.chosenDistractor,
				);
				if (pattern.posConfusion) {
					posConfusionCount++;
					const pairKey = `${pattern.chosenPOS}->${pattern.targetPOS}`;
					pairCounts.set(pairKey, (pairCounts.get(pairKey) || 0) + 1);
				}
				if (pattern.phoneticTrap) {
					phoneticTrapCount++;
				}
			}

			const posConfusionPercent = Math.round((posConfusionCount / total) * 100);
			const phoneticTrapPercent = Math.round((phoneticTrapCount / total) * 100);

			let dominantBlindspot = "none";
			if (posConfusionPercent > phoneticTrapPercent) {
				dominantBlindspot = "pos";
			} else if (phoneticTrapPercent > posConfusionPercent) {
				dominantBlindspot = "phonetic";
			}

			let tipHe =
				"לא זוהה דפוס טעויות מובהק - המשך לתרגל ולחזק את אוצר המילים.";
			if (dominantBlindspot === "pos") {
				let maxCount = 0;
				let topPairKey = null;
				const sortedKeys = Array.from(pairCounts.keys()).sort();
				for (const key of sortedKeys) {
					const count = pairCounts.get(key);
					if (count > maxCount) {
						maxCount = count;
						topPairKey = key;
					}
				}

				if (topPairKey) {
					const [chosenPOS, targetPOS] = topPairKey.split("->");
					const chosenHe = getPosHebrew(chosenPOS);
					const targetHe = getPosHebrew(targetPOS);
					tipHe = `${posConfusionPercent}% מהטעויות שלך נובעות מבחירת ${chosenHe} במקום ${targetHe}`;
				} else {
					tipHe = `${posConfusionPercent}% מהטעויות שלך נובעות מבלבול בחלקי דיבר`;
				}
			} else if (dominantBlindspot === "phonetic") {
				tipHe = `${phoneticTrapPercent}% מהטעויות שלך נובעות ממלכודות צליל דומה (דמיון פונטי) ולא ממשמעות המילה`;
			}

			return {
				total,
				posConfusionPercent,
				phoneticTrapPercent,
				dominantBlindspot,
				tipHe,
			};
		}

		return {
			analyzeMistakePattern,
			generateDiagnosticSummary,
			POS_HEBREW,
		};
	},
);
