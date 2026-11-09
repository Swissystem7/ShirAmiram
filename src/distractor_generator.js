((root, factory) => {
	if (typeof module === "object" && module.exports) {
		module.exports = factory(require("./vocab_taxonomy.js").classifyWord);
	} else {
		root.ShirAmiramDistractorGenerator = factory(
			root.ShirAmiramVocabTaxonomy.classifyWord,
		);
	}
})(typeof self !== "undefined" ? self : this, (classifyWord) => {
	function hashSeed(seed) {
		const text = String(seed);
		let hash = 2166136261;
		for (let index = 0; index < text.length; index += 1) {
			hash ^= text.charCodeAt(index);
			hash = Math.imul(hash, 16777619);
		}
		return hash >>> 0;
	}

	function createRandom(seed) {
		let state = hashSeed(seed);
		return () => {
			state += 1831565813;
			let value = Math.imul(state ^ (state >>> 15), 1 | state);
			value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
			return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
		};
	}

	function shuffle(items, seed) {
		const result = [...items];
		const random = createRandom(seed);
		for (let index = result.length - 1; index > 0; index -= 1) {
			const swapIndex = Math.floor(random() * (index + 1));
			[result[index], result[swapIndex]] = [result[swapIndex], result[index]];
		}
		return result;
	}

	function normalizeEntry(entry) {
		const isObject =
			entry !== null &&
			typeof entry === "object" &&
			typeof entry.word === "string";
		const word = isObject ? entry.word : entry;
		if (typeof word !== "string" || word.trim() === "") return null;

		const classification = classifyWord(word);
		const level = isObject ? (entry.level ?? entry.difficulty) : undefined;
		const numericLevel =
			typeof level === "number"
				? Number.isFinite(level)
					? level
					: undefined
				: typeof level === "string" && level.trim() !== ""
					? Number(level)
					: undefined;

		return {
			word: classification.cleanWord,
			partOfSpeech: classification.partOfSpeech,
			level: Number.isFinite(numericLevel) ? numericLevel : undefined,
		};
	}

	function getOptions(options) {
		if (options === undefined) return { count: 3, samePOS: true };
		if (options === null || typeof options !== "object") return null;
		const count = options.count === undefined ? 3 : options.count;
		if (!Number.isInteger(count) || count < 0) return null;
		return {
			count,
			samePOS: options.samePOS === undefined ? true : options.samePOS === true,
			seed: options.seed,
			hasSeed: Object.hasOwn(options, "seed") && options.seed !== undefined,
		};
	}

	function orderCandidates(candidates, target, hasSeed, seed) {
		if (hasSeed) return shuffle(candidates, seed);
		return [...candidates].sort((left, right) => {
			if (target.level !== undefined && left.level !== undefined) {
				const levelDifference =
					Math.abs(left.level - target.level) -
					Math.abs(right.level - target.level);
				if (levelDifference !== 0) return levelDifference;
			}
			return left.word.localeCompare(right.word);
		});
	}

	function generateDistractors(targetWord, wordPool, options) {
		try {
			const target = normalizeEntry(targetWord);
			if (!target || !Array.isArray(wordPool)) {
				return { distractors: [], relaxedPOS: false };
			}
			const settings = getOptions(options);
			if (!settings) return { distractors: [], relaxedPOS: false };

			const entries = [];
			const seen = new Set([target.word]);
			for (const entry of wordPool) {
				const normalized = normalizeEntry(entry);
				if (!normalized || seen.has(normalized.word)) continue;
				seen.add(normalized.word);
				entries.push(normalized);
			}

			const matching = settings.samePOS
				? entries.filter((entry) => entry.partOfSpeech === target.partOfSpeech)
				: entries;
			const relaxedPOS = settings.samePOS && matching.length < settings.count;
			const remaining = entries.filter(
				(entry) => !matching.some((match) => match.word === entry.word),
			);
			const orderedMatching = orderCandidates(
				matching,
				target,
				settings.hasSeed,
				settings.seed,
			);
			const orderedRemaining = orderCandidates(
				remaining,
				target,
				settings.hasSeed,
				settings.seed,
			);
			const selected = [
				...orderedMatching,
				...(relaxedPOS ? orderedRemaining : []),
			]
				.slice(0, settings.count)
				.map((entry) => entry.word);

			return { distractors: selected, relaxedPOS };
		} catch {
			return { distractors: [], relaxedPOS: false };
		}
	}

	function formatQuestionChoices(targetWord, distractors, seed = null) {
		try {
			const target = normalizeEntry(targetWord);
			if (
				!target ||
				!Array.isArray(distractors) ||
				distractors.some(
					(distractor) =>
						typeof distractor !== "string" || distractor.trim() === "",
				)
			) {
				return { choices: [], correctIndex: -1 };
			}
			const choices = [target.word, ...distractors.map((word) => word.trim())];
			const normalized = new Set();
			if (
				choices.some((choice) => {
					const cleanChoice = choice.toLowerCase();
					if (normalized.has(cleanChoice)) return true;
					normalized.add(cleanChoice);
					return false;
				})
			) {
				return { choices: [], correctIndex: -1 };
			}
			const ordered = seed === null ? choices : shuffle(choices, seed);
			return {
				choices: ordered,
				correctIndex: ordered.indexOf(target.word),
			};
		} catch {
			return { choices: [], correctIndex: -1 };
		}
	}

	return { generateDistractors, formatQuestionChoices };
});
