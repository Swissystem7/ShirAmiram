// ShirAmiram — Voice Karaoke Challenge (static client-side).
// Pure logic is shared by the page (window.ShirAmiramKaraoke) and by node --test.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ShirAmiramKaraoke = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DEFAULT_WINDOW_MS = 1500;
  var BASE_POINTS = 100;
  var STREAK_2 = 1.2;
  var STREAK_3 = 1.5;

  // Predefined English inflections accepted as matches for a target lemma.
  var INFLECTIONS = {
    sing: ['sing', 'sings', 'sang', 'sung', 'singing'],
    run: ['run', 'runs', 'ran', 'running'],
    go: ['go', 'goes', 'went', 'going', 'gone'],
    be: ['be', 'am', 'is', 'are', 'was', 'were', 'being', 'been'],
    have: ['have', 'has', 'had', 'having'],
    do: ['do', 'does', 'did', 'doing', 'done'],
    make: ['make', 'makes', 'made', 'making'],
    say: ['say', 'says', 'said', 'saying'],
    get: ['get', 'gets', 'got', 'getting', 'gotten'],
    take: ['take', 'takes', 'took', 'taking', 'taken'],
    come: ['come', 'comes', 'came', 'coming'],
    see: ['see', 'sees', 'saw', 'seeing', 'seen'],
    know: ['know', 'knows', 'knew', 'knowing', 'known'],
    think: ['think', 'thinks', 'thought', 'thinking'],
    look: ['look', 'looks', 'looked', 'looking'],
    want: ['want', 'wants', 'wanted', 'wanting'],
    give: ['give', 'gives', 'gave', 'giving', 'given'],
    use: ['use', 'uses', 'used', 'using'],
    find: ['find', 'finds', 'found', 'finding'],
    tell: ['tell', 'tells', 'told', 'telling'],
    ask: ['ask', 'asks', 'asked', 'asking'],
    work: ['work', 'works', 'worked', 'working'],
    seem: ['seem', 'seems', 'seemed', 'seeming'],
    feel: ['feel', 'feels', 'felt', 'feeling'],
    try: ['try', 'tries', 'tried', 'trying'],
    leave: ['leave', 'leaves', 'left', 'leaving'],
    call: ['call', 'calls', 'called', 'calling'],
    keep: ['keep', 'keeps', 'kept', 'keeping'],
    let: ['let', 'lets', 'letting'],
    begin: ['begin', 'begins', 'began', 'beginning', 'begun'],
    show: ['show', 'shows', 'showed', 'showing', 'shown'],
    hear: ['hear', 'hears', 'heard', 'hearing'],
    play: ['play', 'plays', 'played', 'playing'],
    run: ['run', 'runs', 'ran', 'running'],
    move: ['move', 'moves', 'moved', 'moving'],
    live: ['live', 'lives', 'lived', 'living'],
    believe: ['believe', 'believes', 'believed', 'believing'],
    hold: ['hold', 'holds', 'held', 'holding'],
    bring: ['bring', 'brings', 'brought', 'bringing'],
    happen: ['happen', 'happens', 'happened', 'happening'],
    write: ['write', 'writes', 'wrote', 'writing', 'written'],
    sit: ['sit', 'sits', 'sat', 'sitting'],
    stand: ['stand', 'stands', 'stood', 'standing'],
    lose: ['lose', 'loses', 'lost', 'losing'],
    pay: ['pay', 'pays', 'paid', 'paying'],
    meet: ['meet', 'meets', 'met', 'meeting'],
    include: ['include', 'includes', 'included', 'including'],
    continue: ['continue', 'continues', 'continued', 'continuing'],
    set: ['set', 'sets', 'setting'],
    learn: ['learn', 'learns', 'learned', 'learnt', 'learning'],
    change: ['change', 'changes', 'changed', 'changing'],
    lead: ['lead', 'leads', 'led', 'leading'],
    understand: ['understand', 'understands', 'understood', 'understanding'],
    watch: ['watch', 'watches', 'watched', 'watching'],
    follow: ['follow', 'follows', 'followed', 'following'],
    stop: ['stop', 'stops', 'stopped', 'stopping'],
    create: ['create', 'creates', 'created', 'creating'],
    speak: ['speak', 'speaks', 'spoke', 'speaking', 'spoken'],
    read: ['read', 'reads', 'reading'],
    allow: ['allow', 'allows', 'allowed', 'allowing'],
    add: ['add', 'adds', 'added', 'adding'],
    spend: ['spend', 'spends', 'spent', 'spending'],
    grow: ['grow', 'grows', 'grew', 'growing', 'grown'],
    open: ['open', 'opens', 'opened', 'opening'],
    walk: ['walk', 'walks', 'walked', 'walking'],
    win: ['win', 'wins', 'won', 'winning'],
    offer: ['offer', 'offers', 'offered', 'offering'],
    remember: ['remember', 'remembers', 'remembered', 'remembering'],
    love: ['love', 'loves', 'loved', 'loving'],
    consider: ['consider', 'considers', 'considered', 'considering'],
    appear: ['appear', 'appears', 'appeared', 'appearing'],
    buy: ['buy', 'buys', 'bought', 'buying'],
    wait: ['wait', 'waits', 'waited', 'waiting'],
    serve: ['serve', 'serves', 'served', 'serving'],
    die: ['die', 'dies', 'died', 'dying'],
    send: ['send', 'sends', 'sent', 'sending'],
    build: ['build', 'builds', 'built', 'building'],
    stay: ['stay', 'stays', 'stayed', 'staying'],
    fall: ['fall', 'falls', 'fell', 'falling', 'fallen'],
    cut: ['cut', 'cuts', 'cutting'],
    reach: ['reach', 'reaches', 'reached', 'reaching'],
    kill: ['kill', 'kills', 'killed', 'killing'],
    raise: ['raise', 'raises', 'raised', 'raising'],
    pass: ['pass', 'passes', 'passed', 'passing'],
    sell: ['sell', 'sells', 'sold', 'selling'],
    decide: ['decide', 'decides', 'decided', 'deciding'],
    return: ['return', 'returns', 'returned', 'returning'],
    explain: ['explain', 'explains', 'explained', 'explaining'],
    hope: ['hope', 'hopes', 'hoped', 'hoping'],
    develop: ['develop', 'develops', 'developed', 'developing'],
    carry: ['carry', 'carries', 'carried', 'carrying'],
    break: ['break', 'breaks', 'broke', 'breaking', 'broken'],
    receive: ['receive', 'receives', 'received', 'receiving'],
    agree: ['agree', 'agrees', 'agreed', 'agreeing'],
    support: ['support', 'supports', 'supported', 'supporting'],
    hit: ['hit', 'hits', 'hitting'],
    produce: ['produce', 'produces', 'produced', 'producing'],
    eat: ['eat', 'eats', 'ate', 'eating', 'eaten'],
    cover: ['cover', 'covers', 'covered', 'covering'],
    catch: ['catch', 'catches', 'caught', 'catching'],
    draw: ['draw', 'draws', 'drew', 'drawing', 'drawn'],
    choose: ['choose', 'chooses', 'chose', 'choosing', 'chosen'],
    peace: ['peace'],
    comfort: ['comfort', 'comforts', 'comforted', 'comforting'],
    acceptance: ['acceptance'],
    wisdom: ['wisdom'],
    calm: ['calm', 'calmer', 'calmest', 'calmed', 'calming'],
    memory: ['memory', 'memories'],
    regret: ['regret', 'regrets', 'regretted', 'regretting'],
    deliberate: ['deliberate', 'deliberates', 'deliberated', 'deliberating', 'deliberately'],
    crucial: ['crucial', 'crucially'],
    undermine: ['undermine', 'undermines', 'undermined', 'undermining'],
    subtle: ['subtle', 'subtler', 'subtlest', 'subtly'],
    nevertheless: ['nevertheless'],
    inevitable: ['inevitable', 'inevitably'],
    hypothesis: ['hypothesis', 'hypotheses'],
    consequently: ['consequently']
  };

  function sanitize(text) {
    return String(text == null ? '' : text)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s']/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokens(text) {
    var s = sanitize(text);
    return s ? s.split(' ') : [];
  }

  function levenshtein(a, b) {
    a = String(a || '');
    b = String(b || '');
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var prev = new Array(b.length + 1);
    var cur = new Array(b.length + 1);
    var i, j, cost;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur[0] = i;
      for (j = 1; j <= b.length; j++) {
        cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      }
      var tmp = prev; prev = cur; cur = tmp;
    }
    return prev[b.length];
  }

  function maxDistance(word) {
    var n = String(word || '').length;
    return n > 6 ? 2 : 1;
  }

  function inflectionSet(target) {
    var t = sanitize(target);
    var list = INFLECTIONS[t] || [t];
    var out = {};
    list.forEach(function (w) { out[sanitize(w)] = true; });
    out[t] = true;
    // light plural / -ing / -ed heuristics on the lemma itself
    out[t + 's'] = true;
    out[t + 'es'] = true;
    out[t + 'ed'] = true;
    out[t + 'ing'] = true;
    if (t.endsWith('y') && t.length > 2) out[t.slice(0, -1) + 'ies'] = true;
    if (t.endsWith('e')) out[t + 'd'] = true;
    return out;
  }

  function wordMatches(heardWord, target) {
    var h = sanitize(heardWord);
    var t = sanitize(target);
    if (!h || !t) return false;
    if (h === t) return true;
    if (h.includes(t)) return true;
    var infl = inflectionSet(t);
    if (infl[h]) return true;
    if (levenshtein(h, t) <= maxDistance(t)) return true;
    var keys = Object.keys(infl);
    for (var i = 0; i < keys.length; i++) {
      if (levenshtein(h, keys[i]) <= maxDistance(keys[i])) return true;
    }
    return false;
  }

  function utteranceMatches(heard, target) {
    var t = sanitize(target);
    var cleaned = sanitize(heard);
    if (!t || !cleaned) return false;
    if (cleaned === t) return true;
    if (cleaned.includes(t)) return true;
    var parts = tokens(heard);
    for (var i = 0; i < parts.length; i++) {
      if (wordMatches(parts[i], t)) return true;
    }
    // whole-utterance fuzzy against target only when short
    if (parts.length <= 2 && levenshtein(cleaned.replace(/\s/g, ''), t) <= maxDistance(t)) return true;
    return false;
  }

  function isInWindow(nowMs, wordTimeMs, windowMs) {
    var now = Number(nowMs);
    var start = Number(wordTimeMs);
    var win = windowMs == null ? DEFAULT_WINDOW_MS : Number(windowMs);
    if (!isFinite(now) || !isFinite(start) || !isFinite(win)) return false;
    return now >= start && now <= start + win;
  }

  function streakMultiplier(streak) {
    var s = Math.max(0, Number(streak) || 0);
    if (s >= 3) return STREAK_3;
    if (s >= 2) return STREAK_2;
    return 1;
  }

  function pointsForHit(streakBefore) {
    // streakBefore is the streak count AFTER this hit is counted
    return Math.round(BASE_POINTS * streakMultiplier(streakBefore));
  }

  function detectSpeechSupport(SpeechRecognitionCtor) {
    if (SpeechRecognitionCtor) return { ok: true, ctor: SpeechRecognitionCtor };
    if (typeof window !== 'undefined') {
      var C = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (C) return { ok: true, ctor: C };
    }
    return { ok: false, reason: 'SpeechRecognition API is not available in this browser.' };
  }

  function createSession(opts) {
    opts = opts || {};
    var words = (opts.words || []).map(function (w, i) {
      return {
        id: w.id != null ? w.id : i,
        word: String(w.word || ''),
        he: w.he || w.translation || '',
        timeMs: w.timeMs != null ? Number(w.timeMs) : (w.time != null ? Number(w.time) * 1000 : i * 3000),
        windowMs: w.windowMs != null ? Number(w.windowMs) : (opts.target_window_ms != null ? Number(opts.target_window_ms) : DEFAULT_WINDOW_MS)
      };
    });
    var state = {
      words: words,
      index: 0,
      score: 0,
      streak: 0,
      hits: [],
      misses: [],
      mode: 'voice', // voice | rhythm
      status: 'idle', // idle | listening | processing | done | fallback
      fallbackMessage: '',
      started: false,
      ended: false
    };

    function current() {
      return state.index < state.words.length ? state.words[state.index] : null;
    }

    function accuracy() {
      var total = state.hits.length + state.misses.length;
      if (!total) return 0;
      return Math.round((state.hits.length / total) * 1000) / 10;
    }

    function endScreen() {
      return {
        accuracy: accuracy(),
        score: state.score,
        hits: state.hits.slice(),
        missed: state.misses.map(function (m) {
          return { word: m.word, he: m.he || '', translation: m.he || '' };
        }),
        mode: state.mode
      };
    }

    function registerHit(wordObj, heard) {
      state.streak += 1;
      var pts = pointsForHit(state.streak);
      state.score += pts;
      state.hits.push({ word: wordObj.word, he: wordObj.he, heard: heard, points: pts, streak: state.streak });
      state.index += 1;
      if (state.index >= state.words.length) {
        state.ended = true;
        state.status = 'done';
      }
      return { ok: true, points: pts, streak: state.streak, feedback: 'hit' };
    }

    function registerMiss(wordObj, reason) {
      state.streak = 0;
      state.misses.push({ word: wordObj.word, he: wordObj.he, reason: reason || 'miss' });
      state.index += 1;
      if (state.index >= state.words.length) {
        state.ended = true;
        state.status = 'done';
      }
      return { ok: false, points: 0, streak: 0, feedback: 'miss', reason: reason || 'miss' };
    }

    function tryVoice(heard, nowMs) {
      if (state.ended) return { ok: false, reason: 'ended' };
      var w = current();
      if (!w) return { ok: false, reason: 'no-word' };
      if (!isInWindow(nowMs, w.timeMs, w.windowMs)) {
        return { ok: false, reason: 'out-of-window', feedback: 'miss-window' };
      }
      if (!utteranceMatches(heard, w.word)) {
        return { ok: false, reason: 'no-match', feedback: 'miss-match' };
      }
      return registerHit(w, heard);
    }

    function skipCurrent(reason) {
      var w = current();
      if (!w || state.ended) return { ok: false, reason: 'none' };
      return registerMiss(w, reason || 'timeout');
    }

    function tryRhythmTap(choice) {
      if (state.mode !== 'rhythm' || state.ended) return { ok: false, reason: 'not-rhythm' };
      var w = current();
      if (!w) return { ok: false, reason: 'no-word' };
      if (sanitize(choice) === sanitize(w.word)) return registerHit(w, choice);
      return registerMiss(w, 'wrong-choice');
    }

    function rhythmChoices(distractors) {
      var w = current();
      if (!w) return [];
      var pool = (distractors || []).map(sanitize).filter(Boolean);
      var opts = [sanitize(w.word)];
      for (var i = 0; i < pool.length && opts.length < 3; i++) {
        if (opts.indexOf(pool[i]) === -1) opts.push(pool[i]);
      }
      // pad with simple fillers if needed
      var fillers = ['peace', 'hope', 'light', 'dream', 'heart', 'night', 'song', 'star'];
      for (var j = 0; j < fillers.length && opts.length < 3; j++) {
        if (opts.indexOf(fillers[j]) === -1 && fillers[j] !== sanitize(w.word)) opts.push(fillers[j]);
      }
      // shuffle deterministic-ish by word id
      var seed = Number(w.id) || 0;
      opts.sort(function (a, b) {
        var ha = (a.charCodeAt(0) + seed) % 7;
        var hb = (b.charCodeAt(0) + seed) % 7;
        return ha - hb || a.localeCompare(b);
      });
      return opts.slice(0, 3);
    }

    function enableFallback(message) {
      state.mode = 'rhythm';
      state.status = 'fallback';
      state.fallbackMessage = message || 'המיקרופון לא זמין. עברו למצב הקשה לפי הקצב (Rhythm Tap).';
      return state.fallbackMessage;
    }

    return {
      state: state,
      current: current,
      tryVoice: tryVoice,
      tryRhythmTap: tryRhythmTap,
      skipCurrent: skipCurrent,
      rhythmChoices: rhythmChoices,
      enableFallback: enableFallback,
      endScreen: endScreen,
      accuracy: accuracy,
      DEFAULT_WINDOW_MS: DEFAULT_WINDOW_MS,
      BASE_POINTS: BASE_POINTS
    };
  }

  // Melody-only instrumental via Web Audio (no vocals). Uses pentatonic tune.
  function createInstrumentalPlayer(audioCtx, tune, noteSec) {
    var TUNE = tune || [220, 261.63, 293.66, 329.63, 392, 329.63, 293.66, 261.63, 220, 261.63, 329.63, 392, 440, 392, 329.63];
    var NOTE = noteSec || 0.5;
    var timer = null;
    var startedAt = 0;
    var playing = false;
    var osc = null;
    var gain = null;

    function stopVoice() {
      if (osc) {
        try { osc.stop(); } catch (e) {}
        try { osc.disconnect(); } catch (e2) {}
        osc = null;
      }
      if (gain) {
        try { gain.disconnect(); } catch (e3) {}
        gain = null;
      }
    }

    function playNote(hz) {
      stopVoice();
      if (!audioCtx) return;
      gain = audioCtx.createGain();
      gain.gain.value = 0.08;
      gain.connect(audioCtx.destination);
      osc = audioCtx.createOscillator();
      osc.type = 'triangle'; // soft instrumental timbre — no speech/vocals
      osc.frequency.value = hz;
      osc.connect(gain);
      osc.start();
      var now = audioCtx.currentTime;
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + NOTE * 0.95);
    }

    function tick() {
      if (!playing) return;
      var elapsed = (Date.now() - startedAt) / 1000;
      var idx = Math.floor(elapsed / NOTE) % TUNE.length;
      playNote(TUNE[idx]);
    }

    return {
      hasVocals: false,
      kind: 'instrumental-synth',
      start: function () {
        if (!audioCtx) return false;
        if (audioCtx.state === 'suspended' && audioCtx.resume) audioCtx.resume();
        playing = true;
        startedAt = Date.now();
        tick();
        timer = setInterval(tick, NOTE * 1000);
        return true;
      },
      stop: function () {
        playing = false;
        if (timer) { clearInterval(timer); timer = null; }
        stopVoice();
      },
      currentTimeMs: function () {
        if (!playing) return 0;
        return Date.now() - startedAt;
      },
      isPlaying: function () { return playing; }
    };
  }

  function statusClass(status) {
    if (status === 'listening') return 'karaoke-status-listening';
    if (status === 'processing') return 'karaoke-status-processing';
    if (status === 'fallback' || status === 'done') return 'karaoke-status-idle';
    return 'karaoke-status-idle';
  }

  return {
    sanitize: sanitize,
    tokens: tokens,
    levenshtein: levenshtein,
    maxDistance: maxDistance,
    wordMatches: wordMatches,
    utteranceMatches: utteranceMatches,
    isInWindow: isInWindow,
    streakMultiplier: streakMultiplier,
    pointsForHit: pointsForHit,
    detectSpeechSupport: detectSpeechSupport,
    createSession: createSession,
    createInstrumentalPlayer: createInstrumentalPlayer,
    statusClass: statusClass,
    INFLECTIONS: INFLECTIONS,
    DEFAULT_WINDOW_MS: DEFAULT_WINDOW_MS,
    BASE_POINTS: BASE_POINTS,
    STREAK_2: STREAK_2,
    STREAK_3: STREAK_3
  };
});
