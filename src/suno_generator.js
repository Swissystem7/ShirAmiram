// ShirAmiram — Suno Lyrics & Prompt Engine (Deterministic Local Generator)
((root, factory) => {
	if (typeof module === "object" && module.exports) {
		module.exports = factory();
	} else {
		root.ShirAmiramSuno = factory();
	}
})(typeof self !== "undefined" ? self : this, () => {
	const THEMES = [
		{
			genre: "Upbeat Synthpop",
			bpm: 120,
			vibe: "energetic, catchy synth leads, crisp electronic drums",
		},
		{
			genre: "Indie Folk Acoustic",
			bpm: 95,
			vibe: "warm acoustic guitar, gentle percussion, heartfelt harmonies",
		},
		{
			genre: "Modern Alt-Rock",
			bpm: 130,
			vibe: "driving electric bass, soaring guitars, punchy drums",
		},
		{
			genre: "Lo-Fi Chillhop",
			bpm: 85,
			vibe: "mellow rhodes piano, vinyl crackle, laid-back groove",
		},
		{
			genre: "Cinematic Orchestral Pop",
			bpm: 110,
			vibe: "stirring strings, grand piano, building emotional crescendo",
		},
		{
			genre: "Retro 80s City Pop",
			bpm: 118,
			vibe: "funky bassline, brass hits, nostalgic city groove",
		},
	];

	/**
	 * Find all words in amiramVocab that are not included in existingSongs.
	 * @param {Array} amiramVocab
	 * @param {Array} existingSongs
	 * @returns {Array} List of missing words
	 */
	function findMissingWords(amiramVocab, existingSongs) {
		if (!Array.isArray(amiramVocab)) return [];
		const existing = new Set();
		if (Array.isArray(existingSongs)) {
			existingSongs.forEach((s) => {
				if (!s || typeof s !== "object") return;
				(Array.isArray(s.highlight_words) ? s.highlight_words : []).forEach(
					(hw) => {
						const w =
							typeof hw === "string"
								? hw.trim().toLowerCase()
								: hw?.word
									? String(hw.word).trim().toLowerCase()
									: "";
						if (w) existing.add(w);
					},
				);
			});
		}

		const seen = new Set();
		return amiramVocab.filter((item) => {
			if (!item || typeof item !== "object") return false;
			const w = String(item.word || "")
				.trim()
				.toLowerCase();
			if (!w || existing.has(w) || seen.has(w)) return false;
			seen.add(w);
			return true;
		});
	}

	/**
	 * Cluster words into groups of 5 to 7 words deterministically.
	 * @param {Array} words
	 * @param {number} groupSize (default 6)
	 * @returns {Array<Array>} Clusters
	 */
	function clusterWords(words, groupSize = 6) {
		if (!Array.isArray(words) || words.length === 0) return [];
		const size =
			Number.isFinite(Number(groupSize)) && Number(groupSize) > 0
				? Math.floor(Number(groupSize))
				: 6;
		const list = words.slice();
		const clusters = [];
		for (let i = 0; i < list.length; i += size) {
			clusters.push(list.slice(i, i + size));
		}
		// If the last cluster has fewer than 4 words and we have previous clusters, merge or balance
		if (clusters.length > 1 && clusters[clusters.length - 1].length < 4) {
			const last = clusters.pop();
			clusters[clusters.length - 1].push(...last);
		}
		return clusters;
	}

	/**
	 * Build a complete lyrical text and Suno style prompt for an array of target words.
	 * @param {number} songIndex
	 * @param {Array} targetWords
	 * @returns {Object} Generated song object
	 */
	function generateSongForWords(songIndex, targetWords) {
		const idx =
			Number.isFinite(Number(songIndex)) && Number(songIndex) >= 0
				? Math.floor(Number(songIndex))
				: 0;
		const theme = THEMES[idx % THEMES.length];
		const rawList = Array.isArray(targetWords) ? targetWords : [];
		const seen = new Set();
		const words = [];
		rawList.forEach((item) => {
			if (typeof item === "string") {
				const clean = item.trim().toLowerCase();
				if (clean && !seen.has(clean)) {
					seen.add(clean);
					words.push({
						word: clean,
						tr: "",
						def: "",
						pos: "noun",
						level: "B_intermediate",
					});
				}
				return;
			}
			if (!item || typeof item !== "object") return;
			const clean = String(item.word || "")
				.trim()
				.toLowerCase();
			if (!clean || seen.has(clean)) return;
			seen.add(clean);
			words.push({
				word: clean,
				tr: item.hebrew_translation || item.translation || item.tr || "",
				def: item.hebrew_definition || item.def || "",
				pos: item.part_of_speech || item.pos || "noun",
				level: item.level || "B_intermediate",
			});
		});

		const w = (i) => (words[i] ? `[${words[i].word.toUpperCase()}]` : "[ECHO]");
		const wRaw = (i) => (words[i] ? words[i].word : "echo");

		const title = `Anthem of ${wRaw(0).charAt(0).toUpperCase() + wRaw(0).slice(1)}`;
		const extraWords =
			words.length > 7
				? words
						.slice(7)
						.map((item) => `[${item.word.toUpperCase()}]`)
						.join(" and ")
				: "";

		const lyrics = [
			`[Verse 1]`,
			`We start the morning when the light begins to play,`,
			`With every step we ${w(0)} our journey day by day.`,
			`The winds of time will challenge every single heart,`,
			`Yet with deep hope we ${w(1)} right from the very start.`,
			``,
			`[Chorus]`,
			`Hold the melody, listen to the call,`,
			`A vision so ${w(2)} that echoes through the hall!`,
			`No shadow can defeat us, no wall can break our voice,`,
			`When we stand united, we celebrate the choice!`,
			``,
			`[Verse 2]`,
			`Walking down the quiet street where memories reside,`,
			`We search for answers that the silent nights provide.`,
			`To ${w(3)} the balance when the heavy skies turn gray,`,
			`And ${w(4)} the courage that carries us away.`,
			``,
			`[Bridge]`,
			`Through all the trials we learn to stand upright and true,`,
			words[5]
				? `With minds so ${w(5)} embracing all that's new.`
				: `With open minds embracing all that's new.`,
			words[6]
				? `And when tomorrow comes we ${w(6)} without fear,`
				: `And when tomorrow comes we sing without fear,`,
			`The song of victory is crystal pure and clear!`,
			``,
			`[Outro]`,
			`The rhythm keeps on beating strong,`,
			extraWords
				? `We carry ${extraWords} in this eternal song,`
				: `We carry this eternal song,`,
			`Light shines on, forever free.`,
		].join("\n");

		const stylePrompt = `${theme.genre}, ${theme.bpm} BPM, ${theme.vibe}, clear crisp English vocals, anthemic melody, memorable hook`;

		return {
			id: idx + 1,
			title,
			genre: theme.genre,
			bpm: theme.bpm,
			target_words: words.map((x) => x.word),
			word_details: words,
			style_prompt: stylePrompt,
			lyrics,
			status: "pending_manual",
			audio_path: `assets/audio/suno_${idx + 1}.mp3`,
			timing_path: `assets/timing/suno_${idx + 1}.lrc`,
		};
	}

	/**
	 * Generate full song suite for all missing Amiram words.
	 * @param {Array} amiramVocab
	 * @param {Array} existingSongs
	 * @returns {Array<Object>} Generated songs
	 */
	function generateFullSuite(amiramVocab, existingSongs) {
		const missing = findMissingWords(amiramVocab, existingSongs);
		const clusters = clusterWords(missing, 6);
		return clusters.map((cluster, i) => generateSongForWords(i, cluster));
	}

	return {
		findMissingWords,
		clusterWords,
		generateSongForWords,
		generateFullSuite,
	};
});
