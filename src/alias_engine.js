// Alias word game: the rules, without any DOM. The page (src/alias_ui.js) draws the screens and
// passes in the vocabulary, the SRS cards and today's date; everything here is pure except
// load()/save().
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ShirAmiramAlias = factory();
}(typeof self !== 'undefined' ? self : this, () => {
  const STORAGE_KEY = 'shiramiram:alias:v1';
  const WORD_MS = 30000;
  const CLUE_POINTS = [10, 7, 4, 2];
  const CLUE_QUALITY = [5, 4, 3, 2];
  const MISS_QUALITY = 1;
  const STREAK_BONUS = 5;
  const STREAK_BONUS_FROM = 3;
  const GAME_SIZE = 10;
  const MIX = { weak: 4, due: 3, fresh: 2, mastered: 1 };
  const MAX_NEW_PER_DAY = 3;
  const MAX_PER_SONG = 3;
  const STRONG_DAYS_TO_LEAVE = 2;

  // ---------- Answers ----------
  function normalize(text) {
    return String(text == null ? '' : text).trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function levenshtein(a, b) {
    const s = String(a);
    const t = String(b);
    if (s === t) return 0;
    if (!s.length) return t.length;
    if (!t.length) return s.length;
    let prev = Array.from({ length: t.length + 1 }, (_, j) => j);
    for (let i = 1; i <= s.length; i++) {
      const cur = [i];
      for (let j = 1; j <= t.length; j++) {
        const cost = s[i - 1] === t[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      }
      prev = cur;
    }
    return prev[t.length];
  }

  /** Exact match, or one typo (insert, delete, replace) for words of 5 letters or more. */
  function checkAnswer(input, target) {
    const guess = normalize(input);
    const word = normalize(target);
    if (!guess || !word) return { correct: false, typo: false };
    if (guess === word) return { correct: true, typo: false };
    if (word.length >= 5 && levenshtein(guess, word) <= 1) return { correct: true, typo: true };
    return { correct: false, typo: false };
  }

  function hasHebrew(text) {
    return /[֐-׿]/.test(String(text || ''));
  }

  // ---------- Scoring and SRS quality ----------
  /** clueIndex is 0..3 for the clue on screen when the word was guessed; null for a miss or skip. */
  function pointsFor(clueIndex) {
    return clueIndex == null ? 0 : (CLUE_POINTS[clueIndex] || 0);
  }

  /** A run of correct answers earns +5 on every answer from the third in a row. */
  function streakBonus(runAfterAnswer) {
    return runAfterAnswer >= STREAK_BONUS_FROM ? STREAK_BONUS : 0;
  }

  function qualityFor(clueIndex) {
    return clueIndex == null ? MISS_QUALITY : (CLUE_QUALITY[clueIndex] || MISS_QUALITY);
  }

  /** The app's Leitner SRS takes again/hard/good/easy. Quality 1 is a lapse. */
  function qualityToResult(quality) {
    if (quality >= 5) return 'easy';
    if (quality === 4) return 'good';
    if (quality >= 2) return 'hard';
    return 'again';
  }

  // ---------- Clues ----------
  function escapeRegExp(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function blankOut(sentence, word) {
    const text = String(sentence || '');
    const w = String(word || '');
    if (!text || !w) return '';
    const re = new RegExp(`\\b${escapeRegExp(w)}\\w*`, 'gi');
    if (!re.test(text)) return '';
    return text.replace(re, '_____');
  }

  function letterPattern(word) {
    const w = String(word || '');
    return `${w.charAt(0)} ${'_ '.repeat(Math.max(0, w.length - 1)).trim()} (${w.length})`;
  }

  /**
   * The clue ladder: synonym, simple English explanation, the song line (or the example
   * sentence) with the word blanked out, and the Hebrew translation last. Words without
   * synonyms start from the first letter and length instead.
   * @param {object} word - Vocabulary item { word, part_of_speech, hebrew_translation, sample_sentence }.
   * @param {object} [extra] - Clue data { synonyms, en_def }.
   * @param {object} [song] - { line, title } when the word is sung in a song the app has.
   */
  function buildClues(word, extra, song) {
    const w = word || {};
    const x = extra || {};
    const target = String(w.word || '');
    const synonyms = Array.isArray(x.synonyms) ? x.synonyms.filter(Boolean) : [];
    const clues = [];
    if (synonyms.length) {
      clues.push({ kind: 'synonym', label: 'מילה נרדפת', text: synonyms.slice(0, 2).join(' / '), lang: 'en' });
    } else {
      clues.push({ kind: 'pattern', label: 'האות הראשונה ואורך המילה', text: letterPattern(target), lang: 'en' });
    }
    const def = x.en_def ? String(x.en_def) : (synonyms.length > 2 ? synonyms.slice(2).join(' / ') : '');
    clues.push(def
      ? { kind: 'definition', label: 'הסבר באנגלית', text: def, lang: 'en' }
      : { kind: 'pattern', label: 'האות הראשונה ואורך המילה', text: letterPattern(target), lang: 'en' });
    const songLine = song && song.line ? blankOut(song.line, target) : '';
    const sentence = songLine || blankOut(w.sample_sentence, target);
    if (sentence) {
      clues.push({
        kind: songLine ? 'song' : 'sentence',
        label: songLine ? `שורה מהשיר${song.title ? ` "${song.title}"` : ''}` : 'משפט לדוגמה',
        text: sentence,
        lang: 'en',
        audio: songLine ? song.line : String(w.sample_sentence || '')
      });
    } else {
      clues.push({ kind: 'pattern', label: 'האות הראשונה ואורך המילה', text: letterPattern(target), lang: 'en' });
    }
    clues.push({ kind: 'hebrew', label: 'תרגום לעברית', text: String(w.hebrew_translation || ''), lang: 'he' });
    // Two clues of the same kind add nothing: keep the ladder at four steps but never repeat.
    const fallbacks = [
      { kind: 'pos', label: 'חלק דיבר', text: String(w.part_of_speech || 'word'), lang: 'en' },
      { kind: 'letters', label: 'שתי האותיות הראשונות והאות האחרונה', text: `${target.slice(0, 2)}${'_'.repeat(Math.max(0, target.length - 3))}${target.slice(-1)}`, lang: 'en' }
    ];
    for (let i = 1; i < clues.length - 1; i++) {
      const used = clues.slice(0, i).map((c) => c.kind);
      if (used.indexOf(clues[i].kind) !== -1) {
        const alt = fallbacks.find((f) => used.indexOf(f.kind) === -1);
        if (alt) clues[i] = alt;
      }
    }
    return clues;
  }

  // ---------- Decks ----------
  function keyOf(item) { return String(item && (item.id != null ? item.id : item.word)); }

  function categorize(item, ctx) {
    const key = keyOf(item);
    if (ctx.weak[key]) return 'weak';
    const card = ctx.cards[key];
    if (!card) return 'fresh';
    if (new Date(card.dueAt || 0).getTime() <= ctx.now.getTime()) return 'due';
    if ((card.box || 1) >= 4) return 'mastered';
    return 'learning';
  }

  // Seeded shuffle (mulberry32), so a test can fix the order.
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, random) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /**
   * Picks the words of one game.
   * @param {Array} pool - Vocabulary items.
   * @param {object} opts
   *   deck: 'mix' (4 weak, 3 due, 2 new, 1 mastered), 'today' (due and weak), 'weak' (weak only)
   *   cards: SRS cards by key; weak: weak list by key; now: Date;
   *   newToday: how many new words were already introduced today; songOf(item) -> song id or null;
   *   size (default 10); seed (number) for the shuffle.
   * @returns {Array<{item, slot}>} slot is the category the word was picked for.
   */
  function buildDeck(pool, opts) {
    const o = opts || {};
    const ctx = { cards: o.cards || {}, weak: o.weak || {}, now: o.now instanceof Date ? o.now : new Date() };
    const size = o.size || GAME_SIZE;
    const random = rng(o.seed == null ? 1 : o.seed);
    const songOf = typeof o.songOf === 'function' ? o.songOf : () => null;
    const deck = o.deck || 'mix';
    let newLeft = Math.max(0, MAX_NEW_PER_DAY - (o.newToday || 0));
    const perSong = {};
    const picked = [];
    const used = new Set();

    const buckets = { weak: [], due: [], fresh: [], mastered: [], learning: [] };
    shuffle(Array.isArray(pool) ? pool : [], random).forEach((item) => {
      if (item && item.word) buckets[categorize(item, ctx)].push(item);
    });

    function take(bucket, count, slot) {
      let n = 0;
      for (const item of buckets[bucket]) {
        if (n >= count || picked.length >= size) break;
        const key = keyOf(item);
        if (used.has(key)) continue;
        if (bucket === 'fresh' && newLeft <= 0) break;
        const song = songOf(item);
        if (song != null && (perSong[song] || 0) >= MAX_PER_SONG) continue;
        used.add(key);
        if (song != null) perSong[song] = (perSong[song] || 0) + 1;
        if (bucket === 'fresh') newLeft--;
        picked.push({ item, slot: slot || bucket });
        n++;
      }
      return n;
    }

    if (deck === 'weak') {
      take('weak', size);
    } else if (deck === 'today') {
      take('weak', size);
      take('due', size);
    } else {
      take('weak', MIX.weak);
      take('due', MIX.due);
      take('fresh', MIX.fresh);
      take('mastered', MIX.mastered);
      // Short of one kind: fill from the others, most useful first.
      ['weak', 'due', 'learning', 'fresh', 'mastered'].forEach((b) => { take(b, size); });
    }
    return shuffle(picked, random);
  }

  // ---------- Stored game state ----------
  function emptyState() {
    return { version: 1, weak: {}, srsDay: {}, newDays: {}, sentences: {}, seeded: false };
  }

  function normalizeState(raw) {
    const s = emptyState();
    if (!raw || typeof raw !== 'object') return s;
    ['weak', 'srsDay', 'newDays', 'sentences'].forEach((k) => {
      if (raw[k] && typeof raw[k] === 'object' && !Array.isArray(raw[k])) s[k] = { ...raw[k] };
    });
    s.seeded = raw.seeded === true;
    Object.keys(s.weak).forEach((k) => {
      const w = s.weak[k];
      s.weak[k] = { since: String((w && w.since) || ''), strongDays: Array.isArray(w && w.strongDays) ? w.strongDays.map(String) : [] };
    });
    return s;
  }

  /**
   * Weak list rule: quality 1-2 puts the word on the list (and restarts its count); it leaves
   * after strong answers (quality 4-5) on two different days.
   */
  function applyWeak(state, key, quality, todayIso) {
    const s = normalizeState(state);
    const k = String(key);
    if (quality <= 2) {
      s.weak[k] = { since: todayIso, strongDays: [] };
    } else if (quality >= 4 && s.weak[k]) {
      const days = s.weak[k].strongDays;
      if (days.indexOf(todayIso) === -1) days.push(todayIso);
      if (days.length >= STRONG_DAYS_TO_LEAVE) delete s.weak[k];
    }
    return s;
  }

  /** One SRS update per word per day, and only the first attempt at a word in a game counts. */
  function canUpdateSrs(state, key, todayIso, seenThisGame) {
    if (seenThisGame) return false;
    return normalizeState(state).srsDay[String(key)] !== todayIso;
  }

  function markSrsDay(state, key, todayIso) {
    const s = normalizeState(state);
    s.srsDay[String(key)] = todayIso;
    // Only the last 60 days matter for anything; keep the store small.
    const keys = Object.keys(s.srsDay);
    if (keys.length > 2000) keys.sort((a, b) => (s.srsDay[a] < s.srsDay[b] ? -1 : 1)).slice(0, keys.length - 2000).forEach((x) => { delete s.srsDay[x]; });
    return s;
  }

  function newCountToday(state, todayIso) {
    const list = normalizeState(state).newDays[todayIso];
    return Array.isArray(list) ? list.length : 0;
  }

  function markNew(state, key, todayIso) {
    const s = normalizeState(state);
    const list = Array.isArray(s.newDays[todayIso]) ? s.newDays[todayIso].slice() : [];
    if (list.indexOf(String(key)) === -1) list.push(String(key));
    s.newDays = { [todayIso]: list };
    return s;
  }

  // ---------- Timer ----------
  // The deadline is a timestamp, so a slow or throttled tick never stretches the time.
  // While the page is hidden the timer is paused and the remaining time is kept.
  function timerStart(now, durationMs) {
    return { endsAt: now + (durationMs || WORD_MS), remainingMs: null };
  }
  function timerLeft(timer, now) {
    if (!timer) return 0;
    if (timer.remainingMs != null) return Math.max(0, timer.remainingMs);
    return Math.max(0, timer.endsAt - now);
  }
  function timerPause(timer, now) {
    if (!timer || timer.remainingMs != null) return timer;
    return { endsAt: null, remainingMs: Math.max(0, timer.endsAt - now) };
  }
  function timerResume(timer, now) {
    if (!timer || timer.remainingMs == null) return timer;
    return { endsAt: now + timer.remainingMs, remainingMs: null };
  }

  function load(storage) {
    try {
      const store = storage !== undefined ? storage : (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!store) return emptyState();
      const raw = store.getItem(STORAGE_KEY);
      return raw ? normalizeState(JSON.parse(raw)) : emptyState();
    } catch (e) {
      return emptyState();
    }
  }

  function save(state, storage) {
    try {
      const store = storage !== undefined ? storage : (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!store) return false;
      store.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
      return true;
    } catch (e) {
      return false;
    }
  }

  return {
    STORAGE_KEY, WORD_MS, CLUE_POINTS, CLUE_QUALITY, MISS_QUALITY, STREAK_BONUS, STREAK_BONUS_FROM,
    GAME_SIZE, MIX, MAX_NEW_PER_DAY, MAX_PER_SONG, STRONG_DAYS_TO_LEAVE,
    normalize, levenshtein, checkAnswer, hasHebrew, pointsFor, streakBonus, qualityFor, qualityToResult,
    blankOut, buildClues, categorize, buildDeck, shuffle, rng,
    emptyState, normalizeState, applyWeak, canUpdateSrs, markSrsDay, newCountToday, markNew,
    timerStart, timerLeft, timerPause, timerResume, load, save
  };
}));
