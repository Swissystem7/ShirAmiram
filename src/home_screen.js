/* ShirAmiram home and profile screens (approved design, 20.11.2026).
   Presentation only: every number comes from state the app already keeps (practice days and XP
   in shiramiram:progress:v1, word boxes in shiramiram:srs:v1, the song on the song screen and the
   song catalogue). Nothing here writes to storage. The pure helpers are exported for tests. */
(function (root) {
  'use strict';

  var DAY_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  function greetingFor(hour) {
    var h = Number(hour);
    if (h >= 5 && h < 12) return 'בוקר טוב';
    if (h >= 12 && h < 17) return 'צהריים טובים';
    if (h >= 17 && h < 22) return 'ערב טוב';
    return 'לילה טוב';
  }

  function titleFor(hour) {
    var h = Number(hour);
    return h >= 17 || h < 5 ? 'מה שרים הערב?' : 'מה שרים היום?';
  }

  function isoDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /** Sunday-to-Saturday counts for the week of `now`, from a { 'YYYY-MM-DD': count } map. */
  function weekCounts(days, now) {
    var map = days && typeof days === 'object' ? days : {};
    var today = now instanceof Date ? now : new Date();
    var start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    var out = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      out.push({ letter: DAY_LETTERS[i], count: Number(map[isoDate(d)]) || 0, today: i === today.getDay(), future: i > today.getDay() });
    }
    return out;
  }

  /** Words the learner knows (box 2 or higher) and words due for review now. */
  function srsCounts(cards, now) {
    var t = (now instanceof Date ? now : new Date()).getTime();
    var learned = 0, due = 0;
    Object.keys(cards || {}).forEach(function (k) {
      var c = cards[k];
      if (!c) return;
      if (Number(c.box) >= 2) learned += 1;
      var at = Date.parse(c.dueAt);
      if (!isNaN(at) && at <= t) due += 1;
    });
    return { learned: learned, due: due };
  }

  /** Chips for the song card: the first `shown` words (two fit at 375px) and "+N" for the rest. */
  function songChips(words, shown) {
    var list = (words || []).filter(Boolean);
    var n = shown || 2;
    var chips = list.slice(0, n);
    if (list.length > n) chips.push('+' + (list.length - n));
    return chips;
  }

  function topSongs(songs, n) {
    return (Array.isArray(songs) ? songs : [])
      .filter(function (s) { return s && s.title; })
      .map(function (s) { return { title: s.title, artist: s.artist || '', words: Array.isArray(s.highlight_words) ? s.highlight_words.length : 0 }; })
      .sort(function (a, b) { return b.words - a.words; })
      .slice(0, n || 2);
  }

  var HE_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  function sinceLabel(days) {
    var keys = Object.keys(days || {}).filter(function (k) { return /^\d{4}-\d{2}-\d{2}$/.test(k); }).sort();
    if (!keys.length) return 'מתחילים היום';
    var p = keys[0].split('-');
    return 'לומדים מאז ' + HE_MONTHS[Number(p[1]) - 1] + ' ' + p[0];
  }

  var api = { greetingFor: greetingFor, titleFor: titleFor, weekCounts: weekCounts, srsCounts: srsCounts,
    songChips: songChips, topSongs: topSongs, sinceLabel: sinceLabel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ShirAmiramHome = api;

  var doc = root.document;
  if (!doc || !doc.getElementById) return;
  var $ = function (id) { return doc.getElementById(id); };

  function readJSON(key) {
    try { var raw = root.localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }

  function progress() {
    var P = root.ShirAmiramProgress;
    var state = (P && P.load()) || (P ? P.emptyState() : { days: {} });
    var sum = P ? P.summarize(state, new Date(), root.ShirAmiramXPEngine, root.ShirAmiramStudyStreakBadges)
      : { streakDays: 0, level: 1, progressPercent: 0 };
    return { state: state, sum: sum };
  }

  function srs() {
    var S = root.ShirAmiramSRS;
    var st = S ? S.loadState() : readJSON('shiramiram:srs:v1');
    return (st && st.cards) || {};
  }

  function totalWords() {
    var v = root.AMIRAM_VOCAB_DATA;
    return Array.isArray(v) && v.length ? v.length : 300;
  }

  function songWords() {
    return Array.prototype.map.call(doc.querySelectorAll('#song article .vocab-badge'), function (b) { return b.dataset.word; });
  }

  function text(el) { return el ? el.textContent.replace(/ /g, ' ').replace(/\s+/g, ' ').trim() : ''; }

  function goTab(id) {
    var b = doc.querySelector('nav[aria-label="מסכים"] .tab-btn[data-tab="' + id + '"]');
    if (b) b.click();
    root.scrollTo(0, 0);
  }

  function weekBars(el, week, opts) {
    if (!el) return;
    var max = Math.max(1, Math.max.apply(null, week.map(function (d) { return d.count; })));
    el.innerHTML = week.map(function (d) {
      var state = d.today ? 'today' : (d.future ? 'future' : (d.count ? 'on' : 'off'));
      var inner;
      if (opts.blocks) {
        var n = d.count ? Math.max(1, Math.round(d.count / max * 7)) : 0;
        inner = '<span class="blocks">' + Array.from({ length: 7 }, function (_, j) { return '<i' + (j < n ? ' class="on"' : '') + '></i>'; }).join('') + '</span>';
      } else {
        var h = d.future || !d.count ? 8 : Math.max(10, Math.round(d.count / max * 46));
        inner = '<span class="bar" style="height:' + h + 'px"></span>';
      }
      return '<span class="day" data-state="' + state + '">' + inner + '<span class="letter">' + d.letter + '</span></span>';
    }).join('');
  }

  function renderHome() {
    var hour = new Date().getHours();
    var p = progress();
    var cards = srs();
    var counts = srsCounts(cards, new Date());
    var total = totalWords();
    var words = songWords();
    var newWords = words.filter(function (w) { var c = cards[w]; return !c || Number(c.box) < 2; }).length;

    $('home-greeting').textContent = greetingFor(hour);
    $('home-title').textContent = titleFor(hour);
    $('home-streak').textContent = String(p.sum.streakDays || 0);
    $('home-song-title').textContent = text(doc.querySelector('#song .hero-title')) || 'Hold the Light';
    $('home-song-artist').textContent = text(doc.querySelector('#song .hero-sub'));
    $('home-cover-label').textContent = text(doc.querySelector('#song .hero-title')).toUpperCase();
    $('home-new-words').textContent = String(newWords);
    var A = root.ShirAmiram;
    if (A && A.formatTime && A.LOOP_SEC) $('home-duration').textContent = A.formatTime(A.LOOP_SEC);
    $('home-chips').innerHTML = songChips(words).reverse().map(function (c) { return '<span>' + c + '</span>'; }).join('');
    $('home-learned').textContent = String(counts.learned);
    $('home-goal').textContent = 'מתוך ' + total + ' מילות אמיר״ם';
    $('home-ring').style.setProperty('--pct', Math.round(counts.learned / total * 100) + '%');
    $('home-ring').setAttribute('aria-label', 'למדת ' + counts.learned + ' מתוך ' + total + ' מילים');
    weekBars($('home-week'), weekCounts(p.state.days, new Date()), {});
    $('home-due').textContent = counts.due ? String(counts.due) : '';
    $('home-due-label').textContent = counts.due ? (counts.due === 1 ? 'מילה מחכה לחזרה' : 'מילים מחכות לחזרה') : 'אין מילים לחזרה כרגע';
    $('home-practice').dataset.target = counts.due ? 'flashcards' : 'practice';
  }

  function renderProfile() {
    var p = progress();
    var counts = srsCounts(srs(), new Date());
    var content = root.ShirAmiramContent;
    var songs = content && Array.isArray(content.songs) ? content.songs : [];
    $('me-words').textContent = String(counts.learned);
    $('me-streak').textContent = String(p.sum.streakDays || 0);
    $('me-songs').textContent = String(songs.length + 1);
    $('me-level').textContent = 'שלב ' + (p.sum.level || 1);
    $('me-next').textContent = (p.sum.progressPercent || 0) + '% לשלב ' + ((p.sum.level || 1) + 1);
    $('me-ring').style.setProperty('--pct', (p.sum.progressPercent || 0) + '%');
    $('me-since').textContent = sinceLabel(p.state.days);
    var week = weekCounts(p.state.days, new Date());
    var sum = week.reduce(function (a, d) { return a + d.count; }, 0);
    $('me-week-total').textContent = sum + (sum === 1 ? ' תרגול' : ' תרגולים');
    weekBars($('me-week'), week, { blocks: true });
    var top = topSongs(songs, 2);
    $('me-top-songs').innerHTML = top.map(function (s, i) {
      var esc = function (v) { return String(v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
      return '<div class="me-song"><span class="cover" data-cover="' + (i % 3 + 1) + '" aria-hidden="true"></span>'
        + '<span class="me-song-text" dir="ltr" lang="en"><b>' + esc(s.title) + '</b><small>' + esc(s.artist) + '</small></span>'
        + '<span class="me-song-count">' + s.words + ' מילים</span></div>';
    }).join('');
  }

  function whenShown(id, fn) {
    var sec = $(id);
    if (!sec) return;
    if (root.MutationObserver) {
      new root.MutationObserver(function () { if (!sec.classList.contains('hidden')) fn(); })
        .observe(sec, { attributes: true, attributeFilter: ['class'] });
    }
    fn();
  }

  function initPlayer() {
    var seek = $('seek');
    function jumpLine(delta) {
      if (!seek) return;
      var A = root.ShirAmiram;
      var lines = (A && A.LINES) || 4;
      var step = 100 / lines;
      var line = Math.floor((Number(seek.value) || 0) / step + 1e-6);
      var next = Math.max(0, Math.min(lines - 1, line + delta));
      seek.value = String(next * step);
      seek.dispatchEvent(new Event('input', { bubbles: true }));
    }
    var prev = $('player-prev'), next = $('player-next'), restart = $('player-restart'), back = $('player-back');
    if (prev) prev.addEventListener('click', function () { jumpLine(-1); });
    if (next) next.addEventListener('click', function () { jumpLine(1); });
    if (restart) restart.addEventListener('click', function () { if (seek) { seek.value = '0'; seek.dispatchEvent(new Event('input', { bubbles: true })); } });
    if (back) back.addEventListener('click', function () { goTab('home'); });
    // The word card follows the word that was tapped.
    doc.querySelectorAll('#song .vocab-badge').forEach(function (b) {
      b.addEventListener('click', function () {
        doc.querySelectorAll('#song .vocab-badge.is-on').forEach(function (o) { o.classList.remove('is-on'); });
        b.classList.add('is-on');
        var pop = $('insp-word');
        if (pop) pop.classList.add('has-word');
      });
    });
    // The scrub bars fill up to where the song is.
    var bars = doc.querySelectorAll('#song .player-scrub .wave-bar');
    function paintScrub() {
      var pct = seek ? Number(seek.value) || 0 : 0;
      bars.forEach(function (bar, i) { bar.classList.toggle('done', (i + 0.5) / bars.length * 100 <= pct); });
    }
    if (seek) {
      seek.addEventListener('input', paintScrub);
      var timer = $('timer');
      if (timer && root.MutationObserver) new root.MutationObserver(paintScrub).observe(timer, { childList: true, characterData: true, subtree: true });
    }
    paintScrub();
  }

  function init() {
    var play = $('home-play');
    if (play) play.addEventListener('click', function () {
      goTab('song');
      var btn = $('btn-play');
      if (btn && btn.getAttribute('aria-pressed') !== 'true') btn.click();
    });
    var practice = $('home-practice');
    if (practice) practice.addEventListener('click', function () { goTab(practice.dataset.target || 'practice'); });
    var close = $('quiz-close');
    if (close) close.addEventListener('click', function () { goTab('practice'); });
    initPlayer();
    // The design puts the light/dark switch in the profile's corner button.
    var toggle = $('theme-toggle'), slot = $('me-theme-slot');
    if (toggle && slot) slot.appendChild(toggle);
    whenShown('home', renderHome);
    whenShown('song', function () { doc.body.classList.toggle('is-player', !$('song').classList.contains('hidden')); });
    var song = $('song');
    if (song && root.MutationObserver) new root.MutationObserver(function () { doc.body.classList.toggle('is-player', !song.classList.contains('hidden')); })
      .observe(song, { attributes: true, attributeFilter: ['class'] });
    whenShown('dashboard', function () { if (!$('dashboard').classList.contains('hidden')) renderProfile(); });
    doc.addEventListener('shiramiram:content', function () {
      if (!$('dashboard').classList.contains('hidden')) renderProfile();
    });
  }

  var deferred = !!(doc.currentScript && doc.currentScript.defer);
  if (doc.readyState === 'loading' || deferred) doc.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
