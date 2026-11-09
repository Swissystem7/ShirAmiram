((root, factory) => {
	if (typeof module === "object" && module.exports) {
		const taxonomy = require("./vocab_taxonomy.js");
		const generator = require("./distractor_generator.js");
		module.exports = factory(
			taxonomy.classifyWord,
			generator.generateDistractors,
			generator.formatQuestionChoices,
		);
	} else {
		root.ShirAmiramQuestionBuilder = factory(
			root.ShirAmiramVocabTaxonomy.classifyWord,
			root.ShirAmiramDistractorGenerator.generateDistractors,
			root.ShirAmiramDistractorGenerator.formatQuestionChoices,
		);
	}
})(
	typeof self !== "undefined" ? self : this,
	(classifyWord, generateDistractors, formatQuestionChoices) => {
		function escapeRegExp(value) {
			return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		}

		function maskTargetWord(sentence, targetWord, mask = "________") {
			if (typeof sentence !== "string") return "";
			if (
				typeof targetWord !== "string" ||
				sentence === "" ||
				targetWord.trim() === ""
			) {
				return sentence;
			}
			const pattern = new RegExp(`\\b${escapeRegExp(targetWord)}\\b`, "gi");
			return sentence.replace(pattern, mask);
		}

		function buildQuestion(input) {
			try {
				if (input === null || typeof input !== "object") return null;
				const {
					sentence,
					targetWord,
					wordPool,
					explanation = "",
					seed = null,
				} = input;
				if (typeof sentence !== "string" || sentence.trim() === "") {
					return null;
				}
				if (typeof targetWord !== "string" || targetWord.trim() === "") {
					return null;
				}
				const maskedSentence = maskTargetWord(sentence, targetWord);
				if (maskedSentence === sentence) return null;
				const { distractors } = generateDistractors(targetWord, wordPool, {
					count: 3,
					samePOS: true,
					seed,
				});
				if (!Array.isArray(distractors) || distractors.length < 3) {
					return null;
				}
				const { choices, correctIndex } = formatQuestionChoices(
					targetWord,
					distractors,
					seed,
				);
				if (
					!Array.isArray(choices) ||
					choices.length !== 4 ||
					correctIndex < 0
				) {
					return null;
				}
				const { partOfSpeech } = classifyWord(targetWord);
				return {
					maskedSentence,
					targetWord,
					partOfSpeech,
					choices,
					correctIndex,
					explanation,
				};
			} catch {
				return null;
			}
		}

		return { maskTargetWord, buildQuestion };
	},
);
