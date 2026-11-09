((root, factory) => {
	if (typeof module === "object" && module.exports) {
		module.exports = factory();
	} else {
		root.ShirAmiramKaraokeScoring = factory();
	}
})(typeof self !== "undefined" ? self : this, () => {
	function normalizeWord(s) {
		if (typeof s !== "string") {
			return "";
		}
		return s
			.toLowerCase()
			.replace(/[^\p{L}\p{N}\s]/gu, "")
			.replace(/\s+/g, " ")
			.trim();
	}

	function levenshtein(a, b) {
		const strA = typeof a === "string" ? a : String(a ?? "");
		const strB = typeof b === "string" ? b : String(b ?? "");
		if (strA === strB) return 0;
		if (strA.length === 0) return strB.length;
		if (strB.length === 0) return strA.length;

		let prev = Array.from({ length: strB.length + 1 }, (_, i) => i);
		for (let i = 1; i <= strA.length; i++) {
			const curr = [i];
			for (let j = 1; j <= strB.length; j++) {
				const cost = strA[i - 1] === strB[j - 1] ? 0 : 1;
				curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
			}
			prev = curr;
		}
		return prev[strB.length];
	}

	const RAW_HOMOPHONE_GROUPS = [
		["their", "there", "they're"],
		["to", "too", "two"],
		["your", "you're"],
		["its", "it's"],
		["hear", "here"],
		["write", "right"],
		["know", "no"],
		["see", "sea"],
		["buy", "by", "bye"],
		["peace", "piece"],
		["sun", "son"],
		["wait", "weight"],
		["break", "brake"],
		["meet", "meat"],
		["be", "bee"],
		["for", "four"],
		["one", "won"],
		["new", "knew"],
		["our", "hour"],
		["which", "witch"],
		["wear", "where"],
		["weather", "whether"],
		["whole", "hole"],
		["road", "rode"],
		["blew", "blue"],
		["pair", "pear"],
		["plain", "plane"],
		["stair", "stare"],
		["tail", "tale"],
		["mail", "male"],
		["sail", "sale"],
		["night", "knight"],
		["fair", "fare"],
		["bare", "bear"],
		["deer", "dear"],
		["heal", "heel"],
		["die", "dye"],
		["cell", "sell"],
		["scent", "sent", "cent"],
		["aloud", "allowed"],
		["steal", "steel"],
	];

	function buildHomophonesMap(groups) {
		const map = Object.create(null);
		for (const group of groups) {
			const normalizedItems = group
				.map((item) => normalizeWord(item))
				.filter(Boolean);
			const allVariants = new Set([...group, ...normalizedItems]);

			for (const key of allVariants) {
				const homophoneSet = new Set();
				for (const cand of allVariants) {
					if (cand !== key) {
						homophoneSet.add(cand);
					}
				}
				map[key] = Object.freeze(Array.from(homophoneSet));
			}
		}
		return Object.freeze(map);
	}

	const HOMOPHONES = buildHomophonesMap(RAW_HOMOPHONE_GROUPS);

	function areHomophones(target, candidate) {
		const normTarget = normalizeWord(target);
		const normCand = normalizeWord(candidate);
		if (!normTarget || !normCand || normTarget === normCand) {
			return false;
		}
		const targetHomophones = HOMOPHONES[normTarget] || HOMOPHONES[target];
		if (
			targetHomophones &&
			(targetHomophones.includes(normCand) ||
				targetHomophones.includes(candidate))
		) {
			return true;
		}
		const candHomophones = HOMOPHONES[normCand] || HOMOPHONES[candidate];
		if (
			candHomophones &&
			(candHomophones.includes(normTarget) || candHomophones.includes(target))
		) {
			return true;
		}
		return false;
	}

	function evaluatePhoneticMatch(targetWord, spokenTranscript) {
		const normTarget = normalizeWord(targetWord);
		const normTranscript = normalizeWord(spokenTranscript);
		if (!normTarget || !normTranscript) {
			return 0.0;
		}

		const transcriptWords = normTranscript.split(" ");
		if (
			normTarget === normTranscript ||
			transcriptWords.includes(normTarget) ||
			` ${normTranscript} `.includes(` ${normTarget} `)
		) {
			return 1.0;
		}

		const isQualityCandidate = (cand) => {
			if (areHomophones(normTarget, cand)) {
				return true;
			}
			if (normTarget.length > 4 && levenshtein(normTarget, cand) === 1) {
				return true;
			}
			return false;
		};

		if (isQualityCandidate(normTranscript)) {
			return 0.8;
		}

		for (const word of transcriptWords) {
			if (isQualityCandidate(word)) {
				return 0.8;
			}
		}

		return 0.0;
	}

	function evaluateTimingQuality(eventTimeMs, windowStartMs, windowEndMs) {
		if (
			typeof eventTimeMs !== "number" ||
			!Number.isFinite(eventTimeMs) ||
			typeof windowStartMs !== "number" ||
			!Number.isFinite(windowStartMs) ||
			typeof windowEndMs !== "number" ||
			!Number.isFinite(windowEndMs) ||
			windowEndMs <= windowStartMs
		) {
			return { quality: "MISS", multiplier: 0 };
		}

		const duration = windowEndMs - windowStartMs;
		const perfectStart = windowStartMs + 0.3 * duration;
		const perfectEnd = windowStartMs + 0.7 * duration;

		if (eventTimeMs >= perfectStart && eventTimeMs <= perfectEnd) {
			return { quality: "PERFECT", multiplier: 1.0 };
		}

		if (eventTimeMs >= windowStartMs && eventTimeMs <= windowEndMs) {
			return { quality: "GOOD", multiplier: 0.8 };
		}

		if (eventTimeMs > windowEndMs && eventTimeMs <= windowEndMs + 300) {
			return { quality: "LATE", multiplier: 0.5 };
		}

		return { quality: "MISS", multiplier: 0 };
	}

	function scoreAttempt(attempt) {
		try {
			if (attempt === null || typeof attempt !== "object") {
				return {
					isHit: false,
					points: 0,
					timingQuality: "MISS",
					newStreak: 0,
				};
			}

			const {
				targetWord,
				spokenTranscript,
				eventTimeMs,
				windowStartMs,
				windowEndMs,
				currentStreak = 0,
			} = attempt;

			const streak =
				typeof currentStreak === "number" &&
				Number.isInteger(currentStreak) &&
				currentStreak >= 0
					? currentStreak
					: 0;

			const phoneticScore = evaluatePhoneticMatch(targetWord, spokenTranscript);
			const timing = evaluateTimingQuality(
				eventTimeMs,
				windowStartMs,
				windowEndMs,
			);
			const timingQuality = timing.quality;
			const multiplier = timing.multiplier;

			const points = Math.round(
				100 * phoneticScore * multiplier * (1 + streak * 0.1),
			);
			const isHit = points > 0;
			const newStreak = isHit ? streak + 1 : 0;

			return {
				isHit,
				points,
				timingQuality,
				newStreak,
			};
		} catch {
			return {
				isHit: false,
				points: 0,
				timingQuality: "MISS",
				newStreak: 0,
			};
		}
	}

	return {
		normalizeWord,
		levenshtein,
		HOMOPHONES,
		evaluatePhoneticMatch,
		evaluateTimingQuality,
		scoreAttempt,
	};
});
