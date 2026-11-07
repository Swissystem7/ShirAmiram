// ShirAmiram — Suno Lyrics & Prompt Engine (Deterministic Local Generator)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShirAmiramSuno = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const THEMES = [
    { genre: 'Upbeat Synthpop', bpm: 120, vibe: 'energetic, catchy synth leads, crisp electronic drums' },
    { genre: 'Indie Folk Acoustic', bpm: 95, vibe: 'warm acoustic guitar, gentle percussion, heartfelt harmonies' },
    { genre: 'Modern Alt-Rock', bpm: 130, vibe: 'driving electric bass, soaring guitars, punchy drums' },
    { genre: 'Lo-Fi Chillhop', bpm: 85, vibe: 'mellow rhodes piano, vinyl crackle, laid-back groove' },
    { genre: 'Cinematic Orchestral Pop', bpm: 110, vibe: 'stirring strings, grand piano, building emotional crescendo' },
    { genre: 'Retro 80s City Pop', bpm: 118, vibe: 'funky bassline, brass hits, nostalgic city groove' }
  ];

  /**
   * Find all words in amiramVocab that are not included in existingSongs.
   * @param {Array} amiramVocab
   * @param {Array} existingSongs
   * @returns {Array} List of missing words
   */
  function findMissingWords(amiramVocab, existingSongs) {
    const existing = new Set();
    if (Array.isArray(existingSongs)) {
      existingSongs.forEach(s => {
        (s.highlight_words || []).forEach(hw => {
          if (hw && hw.word) existing.add(hw.word.toLowerCase());
        });
      });
    }

    return (amiramVocab || []).filter(item => {
      const w = String(item.word || '').toLowerCase();
      return !existing.has(w);
    });
  }

  /**
   * Cluster words into groups of 5 to 7 words deterministically.
   * @param {Array} words
   * @param {number} groupSize (default 6)
   * @returns {Array<Array>} Clusters
   */
  function clusterWords(words, groupSize = 6) {
    const list = (words || []).slice();
    const clusters = [];
    for (let i = 0; i < list.length; i += groupSize) {
      clusters.push(list.slice(i, i + groupSize));
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
    const theme = THEMES[songIndex % THEMES.length];
    const words = targetWords.map(w => ({
      word: w.word.toLowerCase(),
      tr: w.hebrew_translation || w.translation || '',
      def: w.hebrew_definition || '',
      pos: w.part_of_speech || 'noun',
      level: w.level || 'B_intermediate'
    }));

    const w = (idx) => words[idx] ? `[${words[idx].word.toUpperCase()}]` : '[ECHO]';
    const wRaw = (idx) => words[idx] ? words[idx].word : 'echo';

    const title = `Anthem of ${wRaw(0).charAt(0).toUpperCase() + wRaw(0).slice(1)}`;

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
      words[5] ? `With minds so ${w(5)} embracing all that's new.` : `With open minds embracing all that's new.`,
      words[6] ? `And when tomorrow comes we ${w(6)} without fear,` : `And when tomorrow comes we sing without fear,`,
      `The song of victory is crystal pure and clear!`,
      ``,
      `[Outro]`,
      `The rhythm keeps on beating strong,`,
      `We carry this eternal song,`,
      `Light shines on, forever free.`
    ].join('\n');

    const stylePrompt = `${theme.genre}, ${theme.bpm} BPM, ${theme.vibe}, clear crisp English vocals, anthemic melody, memorable hook`;

    return {
      id: songIndex + 1,
      title,
      genre: theme.genre,
      bpm: theme.bpm,
      target_words: words.map(x => x.word),
      word_details: words,
      style_prompt: stylePrompt,
      lyrics,
      status: 'pending_manual',
      audio_path: `assets/audio/suno_${songIndex + 1}.mp3`,
      timing_path: `assets/timing/suno_${songIndex + 1}.lrc`
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
    THEMES,
    findMissingWords,
    clusterWords,
    generateSongForWords,
    generateFullSuite
  };
}));
