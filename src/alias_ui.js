// Alias word game: screens and wiring. Rules live in src/alias_engine.js. Every answer goes to
// the same places as a quiz answer (analytics + XP/streak through window.recordWordAttempt) and,
// once per word per day, to the flashcards' Leitner SRS.
(function (root) {
  const doc = root.document;
  const G = root.ShirAmiramAlias;
  if (!doc || !G) return;
  const $ = (id) => doc.getElementById(id);

  function safely(fn) {
    try { return fn(); } catch (e) { if (root.console) root.console.warn('alias game:', e); return undefined; }
  }

  function today() {
    const P = root.ShirAmiramProgress;
    if (P && typeof P.localISODate === 'function') return P.localISODate(new Date());
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function vocab() { return Array.isArray(root.AMIRAM_VOCAB_DATA) ? root.AMIRAM_VOCAB_DATA : []; }
  function clueData(item) {
    const all = root.ALIAS_CLUES_DATA || {};
    return all[String(item.id)] || null;
  }
  function srs() { return root.ShirAmiramSRS || null; }
  function srsCards() { const S = srs(); return S ? (S.loadState().cards || {}) : {}; }
  function byKey(key) { return vocab().find((v) => String(v.id) === String(key)) || null; }

  let store = G.load();

  // ---------- Songs: which words are sung in a song the app has ----------
  function builtinLines() {
    return Array.from(doc.querySelectorAll('#song article .lyric-line'))
      .map((p) => p.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
  }
  function builtinTitle() {
    const t = doc.querySelector('#song-hero .hero-title');
    return t ? t.textContent.replace(/\s+/g, ' ').trim() : '';
  }
  let songIndex = null;
  function songsFor() {
    if (songIndex) return songIndex;
    const map = {};
    safely(() => {
      const ctx = typeof root.ShirAmiramContext === 'function' ? root.ShirAmiramContext() : null;
      ((ctx && ctx.songs) || []).forEach((s) => { (s.highlight_words || []).forEach((h) => {
        if (h && h.word) map[String(h.word).toLowerCase()] = { id: `song:${s.id}`, title: s.title, line: '' };
      }); });
    });
    const lines = builtinLines();
    const title = builtinTitle();
    vocab().forEach((v) => {
      const re = new RegExp(`\\b${String(v.word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      const line = lines.find((l) => re.test(l));
      if (line) map[String(v.word).toLowerCase()] = { id: 'builtin', title, line };
    });
    songIndex = map;
    return map;
  }
  function songOf(item) { const s = songsFor()[String(item.word).toLowerCase()]; return s ? s.id : null; }
  function songLineOf(item) { const s = songsFor()[String(item.word).toLowerCase()]; return s && s.line ? s : null; }

  // ---------- Weak list ----------
  function seedWeakOnce() {
    if (store.seeded) return;
    safely(() => {
      const AN = root.ShirAmiramAnalytics;
      const cards = AN ? (AN.loadAnalyticsState().cards || {}) : {};
      const ids = new Set(vocab().map((v) => String(v.id)));
      Object.keys(cards).forEach((k) => {
        const c = cards[k];
        const mistakes = (c.clozeIncorrect || 0) + (c.incorrect || 0);
        if (mistakes > 0 && ids.has(k)) store = G.applyWeak(store, k, 1, today());
      });
    });
    store.seeded = true;
    G.save(store);
  }
  function weakCount() { return Object.keys(store.weak).filter((k) => byKey(k)).length; }

  // ---------- Screens ----------
  const SCREENS = ['alias-start', 'alias-play', 'alias-results', 'alias-review'];
  function show(id) {
    SCREENS.forEach((s) => { const el = $(s); if (el) el.hidden = s !== id; });
    root.scrollTo(0, 0);
  }

  function el(tag, cls, text, attrs) {
    const n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    Object.keys(attrs || {}).forEach((k) => { n.setAttribute(k, attrs[k]); });
    return n;
  }
  const en = (tag, cls, text) => el(tag, cls, text, { dir: 'ltr', lang: 'en' });

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const t = new Date();
    const sameDay = d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
    if (sameDay || d < t) return 'היום';
    return `${d.getDate()}.${d.getMonth() + 1}`;
  }

  // ---------- Start screen ----------
  let deckChoice = 'mix';
  function deckFor(name, seed) {
    return G.buildDeck(vocab(), {
      deck: name, cards: srsCards(), weak: store.weak, now: new Date(),
      newToday: G.newCountToday(store, today()), songOf, seed
    });
  }
  function renderStart() {
    seedWeakOnce();
    const counts = { mix: deckFor('mix', 1).length, today: deckFor('today', 1).length, weak: deckFor('weak', 1).length };
    doc.querySelectorAll('[data-alias-deck]').forEach((b) => {
      const name = b.getAttribute('data-alias-deck');
      b.setAttribute('aria-checked', String(name === deckChoice));
      const meta = b.querySelector('.deck-meta');
      if (meta) meta.textContent = counts[name] ? `${counts[name]} מילים` : 'אין מילים כרגע';
    });
    $('alias-weak-count').textContent = String(weakCount());
    const ok = counts[deckChoice] > 0;
    $('alias-start-btn').disabled = !ok;
    $('alias-start-note').textContent = ok ? '' : (deckChoice === 'weak'
      ? 'עוד אין מילים חלשות. מילה שמנחשים רק מהתרגום, או מדלגים עליה, נכנסת לכאן.'
      : 'אין כרגע מילים לחזרה להיום. נסו את המיקס החכם.');
  }

  // ---------- Game ----------
  let g = null;
  let ticking = null;

  function startGame(name) {
    const deck = deckFor(name, Math.floor(Math.random() * 4294967295));
    if (!deck.length) { renderStart(); return; }
    g = { deck, i: 0, score: 0, run: 0, results: [], seen: new Set(), deckName: name };
    show('alias-play');
    showWord();
  }

  function current() { return g && g.deck[g.i]; }

  function showWord() {
    const entry = current();
    const item = entry.item;
    g.clueIdx = 0;
    g.timedOut = false;
    g.tries = 0;
    g.clues = G.buildClues(item, clueData(item), songLineOf(item));
    $('alias-progress').textContent = `מילה ${g.i + 1} מתוך ${g.deck.length}`;
    $('alias-score').textContent = `${g.score} נק׳`;
    $('alias-run').textContent = g.run >= 2 ? `רצף ${g.run}` : '';
    const list = $('alias-clues');
    list.textContent = '';
    addClue(0);
    $('alias-feedback').textContent = '';
    $('alias-feedback').removeAttribute('data-tone');
    $('alias-hebrew-warning').hidden = true;
    $('alias-form').hidden = false;
    $('alias-reveal').hidden = true;
    const input = $('alias-input');
    input.value = '';
    input.disabled = false;
    updateHint();
    g.timer = G.timerStart(Date.now(), G.WORD_MS);
    startTick();
    root.setTimeout(() => { if (!$('alias-play').hidden) input.focus({ preventScroll: true }); }, 30);
  }

  function addClue(idx) {
    const clue = g.clues[idx];
    const li = el('li', 'alias-clue');
    li.setAttribute('data-kind', clue.kind);
    li.appendChild(el('span', 'clue-label', `רמז ${idx + 1} · ${clue.label}`));
    const body = clue.lang === 'en' ? en('span', 'clue-text', clue.text) : el('span', 'clue-text', clue.text, { lang: 'he' });
    li.appendChild(body);
    if (clue.audio) {
      const b = el('button', 'clue-play', 'השמעה', { type: 'button', 'aria-label': 'השמעת השורה' });
      b.addEventListener('click', () => {
        if (root.ShirAmiramSpeech) root.ShirAmiramSpeech.speak(clue.audio);
      });
      li.appendChild(b);
    }
    $('alias-clues').appendChild(li);
  }

  function updateHint() {
    const btn = $('alias-hint');
    if (g.clueIdx >= 3) {
      btn.disabled = true;
      btn.textContent = 'כל הרמזים פתוחים';
    } else {
      btn.disabled = false;
      btn.textContent = `רמז נוסף (${G.CLUE_POINTS[g.clueIdx + 1]} נק׳)`;
    }
    $('alias-check').textContent = `בדיקה (${G.CLUE_POINTS[g.clueIdx]} נק׳)`;
  }

  function nextClue() {
    if (!g || g.clueIdx >= 3) return;
    g.clueIdx += 1;
    addClue(g.clueIdx);
    updateHint();
  }

  // ---------- Timer ----------
  const reduceMotion = () => root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function paintTimer() {
    if (!g || !g.timer) return;
    const left = G.timerLeft(g.timer, Date.now());
    const frac = left / G.WORD_MS;
    $('alias-timer-fill').style.transform = `scaleX(${frac.toFixed(3)})`;
    $('alias-timer').setAttribute('data-low', String(left <= 10000));
    $('alias-timer-text').textContent = left > 0 ? `${Math.ceil(left / 1000)} שנ׳` : 'הזמן נגמר';
    if (left <= 0 && !g.timedOut) timeUp();
  }
  function startTick() {
    stopTick();
    paintTimer();
    ticking = root.setInterval(paintTimer, reduceMotion() ? 1000 : 200);
  }
  function stopTick() { if (ticking) root.clearInterval(ticking); ticking = null; }
  function timeUp() {
    g.timedOut = true;
    stopTick();
    while (g.clueIdx < 3) nextClue();
    setFeedback('הזמן נגמר, כל הרמזים פתוחים. אפשר עדיין לכתוב את המילה, או לדלג.', 'info');
  }
  function pause() {
    if (!g || !g.timer || $('alias-play').hidden || !$('alias-reveal').hidden) return;
    g.timer = G.timerPause(g.timer, Date.now());
    stopTick();
  }
  function resume() {
    if (!g || !g.timer || g.timedOut || $('alias-play').hidden || !$('alias-reveal').hidden) return;
    if (!aliasVisible() || doc.visibilityState === 'hidden') return;
    g.timer = G.timerResume(g.timer, Date.now());
    startTick();
  }
  function aliasVisible() { const s = $('alias'); return s && !s.classList.contains('hidden'); }

  function setFeedback(text, tone) {
    const f = $('alias-feedback');
    f.textContent = text;
    if (tone) f.setAttribute('data-tone', tone); else f.removeAttribute('data-tone');
  }

  // ---------- Answers ----------
  function check(ev) {
    if (ev) ev.preventDefault();
    if (!g) return;
    const input = $('alias-input');
    const value = input.value;
    if (G.hasHebrew(value)) { $('alias-hebrew-warning').hidden = false; input.focus(); return; }
    $('alias-hebrew-warning').hidden = true;
    if (!G.normalize(value)) { input.focus(); return; }
    const res = G.checkAnswer(value, current().item.word);
    if (res.correct) { finish(g.clueIdx, res.typo ? value : null); return; }
    g.tries += 1;
    setFeedback(g.clueIdx < 3 ? 'לא זה. נסו שוב או קחו רמז נוסף.' : 'לא זה. נסו שוב או דלגו.', 'bad');
    input.select();
  }

  function recordProgress(key, correct) {
    safely(() => {
      if (typeof root.recordWordAttempt === 'function') root.recordWordAttempt(key, correct, 'alias');
      else if (root.ShirAmiramProgressUI) root.ShirAmiramProgressUI.onAnswer(correct);
    });
  }

  function updateSrs(item, quality) {
    const S = srs();
    const key = String(item.id);
    let nextDue = null;
    let updated = false;
    safely(() => {
      if (!S) return;
      const st = S.loadState();
      st.cards = st.cards || {};
      const before = st.cards[key];
      if (G.canUpdateSrs(store, key, today(), g.seen.has(key))) {
        const next = S.calculateNextState(before || S.initProgress(key), G.qualityToResult(quality));
        st.cards[key] = next;
        S.saveState(st);
        store = G.markSrsDay(store, key, today());
        if (!before) store = G.markNew(store, key, today());
        nextDue = next.dueAt;
        updated = true;
      } else {
        nextDue = before ? before.dueAt : null;
      }
    });
    return { nextDue, updated };
  }

  function finish(clueIdx, typoText) {
    stopTick();
    const entry = current();
    const item = entry.item;
    const key = String(item.id);
    const correct = clueIdx != null;
    const points = G.pointsFor(clueIdx);
    g.run = correct ? g.run + 1 : 0;
    const bonus = correct ? G.streakBonus(g.run) : 0;
    g.score += points + bonus;
    const quality = G.qualityFor(clueIdx);
    recordProgress(key, correct);
    const srsRes = updateSrs(item, quality);
    store = G.applyWeak(store, key, quality, today());
    g.seen.add(key);
    G.save(store);
    g.results.push({ item, clueIdx, points, bonus, quality, nextDue: srsRes.nextDue, srsUpdated: srsRes.updated, typo: typoText });
    revealWord(item, clueIdx, points, bonus, typoText);
  }

  function revealWord(item, clueIdx, points, bonus, typoText) {
    $('alias-form').hidden = true;
    const box = $('alias-reveal');
    box.hidden = false;
    $('alias-reveal-word').textContent = item.word;
    $('alias-reveal-he').textContent = item.hebrew_translation || '';
    let msg;
    if (clueIdx == null) msg = 'דילגתם על המילה. היא נכנסת לרשימת המילים החלשות.';
    else msg = `+${points} נק׳${bonus ? ` ועוד ${bonus} על רצף` : ''} · ${clueIdx === 0 ? 'בלי עזרה' : `אחרי ${clueIdx + 1} רמזים`}`;
    if (typoText) msg += ` · כמעט מדויק: כתבתם "${typoText}"`;
    $('alias-reveal-msg').textContent = msg;
    box.setAttribute('data-tone', clueIdx == null ? 'bad' : 'ok');
    $('alias-score').textContent = `${g.score} נק׳`;
    $('alias-run').textContent = g.run >= 2 ? `רצף ${g.run}` : '';
    const next = $('alias-next');
    next.textContent = g.i + 1 < g.deck.length ? 'המילה הבאה' : 'לתוצאות';
    next.focus({ preventScroll: true });
  }

  function next() {
    if (!g) return;
    g.i += 1;
    if (g.i < g.deck.length) showWord(); else renderResults();
  }

  function quit() {
    stopTick();
    if (g && g.results.length) renderResults(); else { g = null; renderStart(); show('alias-start'); }
  }

  // ---------- Results ----------
  function outcomeLabel(r) {
    if (r.clueIdx == null) return 'פספוס';
    return r.clueIdx === 0 ? 'בלי עזרה' : `אחרי רמז ${r.clueIdx + 1}`;
  }

  let sentenceOpened = false;
  function sentenceBox(item) {
    const key = String(item.id);
    // Folded, so a game with many misses still reads as a list; the first one starts open.
    const wrap = el('details', 'alias-sentence');
    if (!sentenceOpened) { wrap.open = true; sentenceOpened = true; }
    wrap.appendChild(el('summary', 'alias-sentence-summary', store.sentences[key] ? 'המשפט שלכם נשמר' : 'כתבו משפט משלכם'));
    const id = `alias-sent-${key}`;
    wrap.appendChild(el('label', 'alias-sentence-label', `משפט באנגלית עם ${item.word}`, { for: id }));
    const ta = el('textarea', 'alias-sentence-input', null, { id, dir: 'ltr', lang: 'en', rows: '2', spellcheck: 'true' });
    ta.value = store.sentences[key] || '';
    wrap.appendChild(ta);
    const row = el('div', 'alias-sentence-row');
    const btn = el('button', 'alias-secondary', 'שמירת המשפט', { type: 'button' });
    const status = el('p', 'alias-sentence-status', '', { 'aria-live': 'polite' });
    btn.addEventListener('click', () => {
      const text = ta.value.trim();
      const words = text.split(/[^A-Za-z'-]+/).filter(Boolean);
      const uses = words.some((w) => G.checkAnswer(w.replace(/(s|ed|ing|ly)$/i, ''), item.word).correct || G.checkAnswer(w, item.word).correct
        || w.toLowerCase().startsWith(String(item.word).toLowerCase().replace(/e$/, '')));
      if (G.hasHebrew(text)) { status.textContent = 'כתבו את המשפט באנגלית.'; return; }
      if (words.length < 4) { status.textContent = 'משפט קצר מדי. נסו לפחות ארבע מילים.'; return; }
      if (!uses) { status.textContent = `המשפט צריך לכלול את המילה ${item.word}.`; return; }
      store.sentences[key] = text.slice(0, 300);
      G.save(store);
      status.textContent = 'נשמר. המשפט יופיע במסך המילים החלשות.';
    });
    row.appendChild(btn);
    row.appendChild(status);
    wrap.appendChild(row);
    return wrap;
  }

  function renderResults() {
    stopTick();
    const res = g ? g.results : [];
    const solo = res.filter((r) => r.clueIdx === 0);
    const helped = res.filter((r) => r.clueIdx != null && r.clueIdx > 0);
    const missed = res.filter((r) => r.clueIdx == null);
    const pts = (list) => list.reduce((s, r) => s + r.points, 0);
    const bonus = res.reduce((s, r) => s + r.bonus, 0);
    $('alias-total').textContent = String(g ? g.score : 0);
    $('alias-solo').textContent = `${solo.length} מילים · ${pts(solo)} נק׳`;
    $('alias-helped').textContent = `${helped.length} מילים · ${pts(helped)} נק׳`;
    $('alias-missed').textContent = `${missed.length} מילים`;
    $('alias-bonus').textContent = bonus ? `+${bonus} נק׳ על רצפים` : '';
    const list = $('alias-result-list');
    list.textContent = '';
    sentenceOpened = false;
    res.forEach((r) => {
      const li = el('li', 'alias-result');
      li.setAttribute('data-q', String(r.quality));
      const head = el('div', 'alias-result-head');
      head.appendChild(en('span', 'alias-result-word', r.item.word));
      head.appendChild(el('span', 'alias-result-he', r.item.hebrew_translation || ''));
      li.appendChild(head);
      const due = fmtDate(r.nextDue);
      const meta = `${outcomeLabel(r)} · ${r.points + r.bonus} נק׳${due ? ` · חזרה הבאה: ${due}` : ''}${r.srsUpdated ? '' : ' · הכרטיסייה כבר עודכנה היום'}`;
      li.appendChild(el('p', 'alias-result-meta', meta));
      if (r.quality <= 2) li.appendChild(sentenceBox(r.item));
      list.appendChild(li);
    });
    $('alias-weak-prompt').hidden = !res.some((r) => r.quality <= 2);
    show('alias-results');
  }

  // ---------- Weak words review ----------
  function renderReview() {
    const list = $('alias-review-list');
    list.textContent = '';
    const keys = Object.keys(store.weak).filter((k) => byKey(k))
      .sort((a, b) => String(store.weak[b].since).localeCompare(String(store.weak[a].since)));
    $('alias-review-empty').hidden = keys.length > 0;
    $('alias-review-play').disabled = keys.length === 0;
    keys.forEach((k) => {
      const item = byKey(k);
      const extra = clueData(item) || {};
      const w = store.weak[k];
      const li = el('li', 'alias-review-item');
      const head = el('div', 'alias-result-head');
      head.appendChild(en('span', 'alias-result-word', item.word));
      head.appendChild(el('span', 'alias-result-he', item.hebrew_translation || ''));
      li.appendChild(head);
      if (extra.en_def) li.appendChild(en('p', 'alias-review-def', extra.en_def));
      if (Array.isArray(extra.synonyms) && extra.synonyms.length) {
        const syn = el('p', 'alias-review-syn');
        syn.appendChild(el('span', null, 'מילים נרדפות: '));
        syn.appendChild(en('span', null, extra.synonyms.join(', ')));
        li.appendChild(syn);
      }
      if (store.sentences[k]) {
        const s = el('p', 'alias-review-own');
        s.appendChild(el('span', null, 'המשפט שלכם: '));
        s.appendChild(en('span', null, store.sentences[k]));
        li.appendChild(s);
      }
      const n = (w.strongDays || []).length;
      li.appendChild(el('p', 'alias-result-meta', `יוצאת מהרשימה אחרי ${G.STRONG_DAYS_TO_LEAVE} הצלחות חזקות בימים שונים · עד עכשיו: ${n}`));
      list.appendChild(li);
    });
    show('alias-review');
  }

  // ---------- Public hooks ----------
  root.ShirAmiramAliasUI = {
    /** A wrong quiz answer about a vocabulary word also puts it on the weak list. */
    noteMistake(key) {
      safely(() => {
        if (!byKey(key)) return;
        store = G.applyWeak(G.load(), String(key), G.MISS_QUALITY, today());
        G.save(store);
      });
    },
    open(deckName) {
      const tab = doc.querySelector('nav[aria-label="מסכים"] .tab-btn[data-tab="alias"]');
      if (tab) tab.click();
      if (deckName) deckChoice = deckName;
      store = G.load();
      renderStart();
      show('alias-start');
    }
  };

  function init() {
    if (!$('alias')) return;
    doc.querySelectorAll('[data-alias-deck]').forEach((b) => { b.addEventListener('click', () => {
      deckChoice = b.getAttribute('data-alias-deck');
      renderStart();
    }); });
    $('alias-start-btn').addEventListener('click', () => startGame(deckChoice));
    $('alias-review-btn').addEventListener('click', renderReview);
    $('alias-form').addEventListener('submit', check);
    $('alias-hint').addEventListener('click', () => { nextClue(); $('alias-input').focus({ preventScroll: true }); });
    $('alias-skip').addEventListener('click', () => { if (g) finish(null, null); });
    $('alias-next').addEventListener('click', next);
    $('alias-quit').addEventListener('click', quit);
    $('alias-input').addEventListener('input', (e) => { $('alias-hebrew-warning').hidden = !G.hasHebrew(e.target.value); });
    $('alias-again').addEventListener('click', () => { g = null; store = G.load(); renderStart(); show('alias-start'); });
    $('alias-results-review').addEventListener('click', renderReview);
    $('alias-review-play').addEventListener('click', () => { deckChoice = 'weak'; startGame('weak'); });
    $('alias-review-back').addEventListener('click', () => { renderStart(); show('alias-start'); });
    doc.querySelectorAll('[data-open-alias]').forEach((b) => { b.addEventListener('click', () => root.ShirAmiramAliasUI.open(b.getAttribute('data-open-alias') || null)); });

    doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'hidden') pause(); else resume(); });
    const section = $('alias');
    let wasHidden = section.classList.contains('hidden');
    if (root.MutationObserver) {
      new root.MutationObserver(() => {
        const hidden = section.classList.contains('hidden');
        if (hidden && !wasHidden) pause();
        if (!hidden && wasHidden) {
          if (g && !$('alias-play').hidden) resume();
          else if (!g || $('alias-results').hidden) { store = G.load(); renderStart(); show('alias-start'); }
        }
        wasHidden = hidden;
      }).observe(section, { attributes: true, attributeFilter: ['class'] });
    }
    renderStart();
    show('alias-start');
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', () => safely(init));
  else safely(init);
})(typeof window !== 'undefined' ? window : globalThis);
