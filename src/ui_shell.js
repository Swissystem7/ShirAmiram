/* ShirAmiram UI shell: bottom navigation groups + light/dark theme toggle.
   Presentation only. It drives the existing .tab-btn[data-tab] buttons by
   clicking them, so the tab logic in index.html stays the single source of truth. */
(function (root) {
  'use strict';

  var GROUPS = [
    { id: 'words', label: 'מילים', tabs: ['vocab'] },
    { id: 'practice', label: 'תרגול', tabs: ['practice', 'quiz', 'flashcards', 'alias'] },
    { id: 'songs', label: 'שירים', tabs: ['song', 'songs', 'suno', 'karaoke'] },
    { id: 'progress', label: 'התקדמות', tabs: ['dashboard'] }
  ];
  var THEME_KEY = 'shiramiram-theme';
  var THEME_COLORS = { light: '#F3F4EF', dark: '#0B0C10' };

  function groupForTab(tabId) {
    for (let i = 0; i < GROUPS.length; i++) {
      if (GROUPS[i].tabs.indexOf(tabId) !== -1) return GROUPS[i];
    }
    return null;
  }

  function normalizeTheme(value) {
    return value === 'light' ? 'light' : 'dark';
  }

  function nextTheme(current) {
    return normalizeTheme(current) === 'dark' ? 'light' : 'dark';
  }

  var EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{23E9}-\u{23FF}\u{25B6}\u{25C0}]️?/gu;

  var HAS_EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{23E9}-\u{23FF}\u{25B6}\u{25C0}]/u;

  function stripEmoji(text) {
    return String(text).replace(EMOJI, '').replace(/️/g, '').replace(/^[ \t]+/, '').replace(/[ \t]{2,}/g, ' ');
  }

  function scoreToPercent(score) {
    var n = Number(score);
    if (!isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n - 50)));
  }

  var api = { GROUPS: GROUPS, groupForTab: groupForTab, normalizeTheme: normalizeTheme, nextTheme: nextTheme,
    stripEmoji: stripEmoji, scoreToPercent: scoreToPercent };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ShirAmiramShell = api;

  var doc = root.document;
  if (!doc || !doc.getElementById) return;

  var ICONS = {
    words: '<path d="M4 5h7a3 3 0 0 1 3 3v11a2 2 0 0 0-2-2H4z"/><path d="M20 5h-3a3 3 0 0 0-3 3"/><path d="M14 19a2 2 0 0 1 2-2h4V5"/>',
    practice: '<path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>',
    songs: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    progress: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>'
  };

  var UI_ICONS = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z" fill="currentColor" stroke="none"/>',
    speaker: '<path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'
  };
  function svg(inner) { return '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">' + inner + '</svg>'; }

  function readStoredTheme() {
    try { return root.localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }

  function applyTheme(theme) {
    theme = normalizeTheme(theme);
    doc.documentElement.setAttribute('data-theme', theme);
    var meta = doc.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLORS[theme]);
    var btn = doc.getElementById('theme-toggle');
    if (btn) {
      const label = theme === 'dark' ? 'מצב בהיר' : 'מצב כהה';
      btn.innerHTML = svg(theme === 'dark' ? UI_ICONS.sun : UI_ICONS.moon);
      btn.setAttribute('aria-label', label);
      btn.title = label;
      btn.setAttribute('aria-pressed', String(theme === 'dark'));
    }
  }

  function initTheme() {
    var stored = readStoredTheme();
    // Dark-first: the light theme is used only when the learner picked it.
    applyTheme(stored);
    var btn = doc.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var theme = nextTheme(doc.documentElement.getAttribute('data-theme'));
      applyTheme(theme);
      try { root.localStorage.setItem(THEME_KEY, theme); } catch (e) { /* private mode: keep for this visit only */ }
    });
  }

  function initNav() {
    var bottom = doc.getElementById('bottom-nav');
    var subnav = doc.querySelector('nav[aria-label="מסכים"]');
    if (!bottom || !subnav) return;
    var lastTab = {};

    function tabButton(tabId) { return subnav.querySelector('.tab-btn[data-tab="' + tabId + '"]'); }

    function visibleTab() {
      var sections = doc.querySelectorAll('.tab-content');
      for (let i = 0; i < sections.length; i++) {
        if (!sections[i].classList.contains('hidden')) return sections[i].id;
      }
      return null;
    }

    function sync() {
      var tabId = visibleTab();
      var group = groupForTab(tabId);
      if (!group) return;
      lastTab[group.id] = tabId;
      var pressed = tabButton(tabId);
      if (pressed) pressed.setAttribute('aria-pressed', 'true');
      subnav.querySelectorAll('.tab-btn[data-tab]').forEach(function (b) {
        b.hidden = group.tabs.indexOf(b.dataset.tab) === -1;
      });
      subnav.setAttribute('data-single', String(group.tabs.length < 2));
      bottom.querySelectorAll('button').forEach(function (b) {
        if (b.dataset.group === group.id) b.setAttribute('aria-current', 'page');
        else b.removeAttribute('aria-current');
      });
    }

    GROUPS.forEach(function (group) {
      var btn = doc.createElement('button');
      btn.type = 'button';
      btn.dataset.group = group.id;
      btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[group.id] + '</svg><span>' + group.label + '</span>';
      btn.addEventListener('click', function () {
        var target = tabButton(lastTab[group.id] || group.tabs[0]);
        if (target) target.click();
        root.scrollTo(0, 0);
      });
      bottom.appendChild(btn);
    });

    // Tabs also change from inside the page (for example the empty-state button),
    // so follow the sections themselves instead of the clicks.
    if (root.MutationObserver) {
      const observer = new root.MutationObserver(sync);
      doc.querySelectorAll('.tab-content').forEach(function (sec) {
        observer.observe(sec, { attributes: true, attributeFilter: ['class'] });
      });
    }
    sync();
  }

  // ---- v2 screens: hero, mini player, practice hub, score ring, tidy-ups ----
  // Everything here mirrors state the app already keeps in the DOM; it never owns data.

  function goTab(tabId) {
    var b = doc.querySelector('nav[aria-label="מסכים"] .tab-btn[data-tab="' + tabId + '"]');
    if (b) b.click();
    root.scrollTo(0, 0);
  }

  function initPlayer() {
    var play = doc.getElementById('btn-play');
    var heroPlay = doc.getElementById('hero-play');
    var miniPlay = doc.getElementById('mini-play');
    var mini = doc.getElementById('mini-player');
    if (!play || !heroPlay || !miniPlay || !mini) return;
    var seek = doc.getElementById('seek');
    var timer = doc.getElementById('timer');
    var words = doc.querySelectorAll('#song article .vocab-badge').length;
    var heroWords = doc.getElementById('hero-words');
    if (heroWords && words) heroWords.textContent = words + ' מילות אמיר״ם';

    function paint() {
      var on = play.getAttribute('aria-pressed') === 'true';
      var started = !!timer && timer.textContent !== '00:00';
      var label = on ? 'השהיה' : (started ? 'להמשיך ללמוד' : 'להתחיל לשיר');
      heroPlay.innerHTML = svg(on ? UI_ICONS.pause : UI_ICONS.play) + '<span>' + label + '</span>';
      miniPlay.innerHTML = svg(on ? UI_ICONS.pause : UI_ICONS.play);
      miniPlay.setAttribute('aria-label', on ? 'השהיה' : 'ניגון');
      var pct = seek ? Number(seek.value) || 0 : 0;
      var a = doc.getElementById('hero-bar-fill'), b = doc.getElementById('mini-bar-fill'), t = doc.getElementById('hero-time');
      if (a) a.style.width = pct + '%';
      if (b) b.style.width = pct + '%';
      if (t && timer) t.textContent = timer.textContent;
    }
    function placeMini() {
      var song = doc.getElementById('song');
      mini.hidden = !song || !song.classList.contains('hidden');
      doc.body.classList.toggle('has-mini', !mini.hidden);
    }
    heroPlay.addEventListener('click', function () { play.click(); });
    miniPlay.addEventListener('click', function () { play.click(); });
    var open = doc.getElementById('mini-open');
    if (open) open.addEventListener('click', function () { goTab('song'); });
    if (root.MutationObserver) {
      new root.MutationObserver(paint).observe(play, { attributes: true, attributeFilter: ['aria-pressed'] });
      if (timer) new root.MutationObserver(paint).observe(timer, { childList: true, characterData: true, subtree: true });
      const song = doc.getElementById('song');
      if (song) new root.MutationObserver(placeMini).observe(song, { attributes: true, attributeFilter: ['class'] });
    }
    if (seek) seek.addEventListener('input', paint);
    paint(); placeMini();
  }

  function initHub() {
    doc.querySelectorAll('[data-hub-tab]').forEach(function (card) {
      card.addEventListener('click', function () {
        goTab(card.getAttribute('data-hub-tab'));
        var extra = card.getAttribute('data-hub-click');
        var target = extra && doc.getElementById(extra);
        if (target) target.click();
      });
    });
  }

  function initScoreRing() {
    var score = doc.getElementById('amiram-score-display');
    if (!score || !score.parentElement) return;
    var ring = score.parentElement;
    ring.classList.add('score-ring');
    function paint() { ring.style.setProperty('--pct', scoreToPercent(score.textContent) + '%'); }
    if (root.MutationObserver) new root.MutationObserver(paint).observe(score, { childList: true, characterData: true, subtree: true });
    paint();
  }

  function initAdvanced() {
    // The song library mixes the catalogue with import and export tools. Fold the tools away.
    var songs = doc.getElementById('songs');
    if (!songs) return;
    var firstRule = null;
    for (let i = 0; i < songs.children.length; i++) {
      if (songs.children[i].tagName === 'HR') { firstRule = songs.children[i]; break; }
    }
    if (!firstRule) return;
    var details = doc.createElement('details');
    details.className = 'advanced';
    var summary = doc.createElement('summary');
    summary.textContent = 'כלים מתקדמים: שמע מקומי, תזמון וייצוא';
    details.appendChild(summary);
    songs.insertBefore(details, firstRule);
    var node = firstRule;
    while (node) { const next = node.nextSibling; details.appendChild(node); node = next; }
    var status = doc.getElementById('content-status');
    var coverage = status && status.nextElementSibling;
    if (coverage && coverage.tagName === 'P') details.insertBefore(coverage, summary.nextSibling);
  }

  function polish(scope) {
    // Emoji used as icons read as unfinished: labels keep their text, icon-only buttons get a drawn icon.
    var walker = doc.createTreeWalker(scope, 4, null);
    var nodes = [], n;
    for (n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n);
    nodes.forEach(function (t) {
      var el = t.parentElement;
      if (!el || /^(SCRIPT|STYLE|TEXTAREA|PRE|OPTION)$/.test(el.tagName)) return;
      // Only text that holds an emoji is touched; otherwise the space after <b>10</b> would be lost.
      if (!HAS_EMOJI.test(t.nodeValue)) return;
      var clean = stripEmoji(t.nodeValue);
      if (clean === t.nodeValue) return;
      var speaker = t.nodeValue.indexOf('🔊') !== -1;
      if (el.tagName === 'BUTTON' && !clean.trim() && el.childNodes.length === 1) {
        el.innerHTML = svg(speaker ? UI_ICONS.speaker : UI_ICONS.play);
      } else if (el.tagName === 'BUTTON' && speaker && !el.querySelector('svg')) {
        t.nodeValue = ' ' + clean;
        el.insertAdjacentHTML('afterbegin', svg(UI_ICONS.speaker));
      } else {
        t.nodeValue = clean;
      }
    });
    if (scope.querySelectorAll) {
      scope.querySelectorAll('#vocab-table tr').forEach(function (tr) {
        var m = /רמה\s*([ABC])/.exec(tr.textContent || '');
        if (m) tr.setAttribute('data-level', m[1]);
      });
    }
  }

  function initPolish() {
    var main = doc.querySelector('main');
    if (!main || !doc.createTreeWalker) return;
    polish(doc.body);
    if (!root.MutationObserver) return;
    var pending = false;
    new root.MutationObserver(function () {
      if (pending) return;
      pending = true;
      root.setTimeout(function () { pending = false; polish(main); }, 60);
    }).observe(main, { childList: true, subtree: true });
  }

  function initLanding() {
    // The v2 design opens on today's song. Run after the app's own start-up picked its tab.
    root.setTimeout(function () { goTab('song'); }, 0);
  }

  function initScreens() { initPlayer(); initHub(); initScoreRing(); initAdvanced(); initPolish(); initLanding(); }

  function initFreshness() {
    // Right after a release the page can arrive new while cached styles and scripts are still
    // the old ones. When the new service worker takes over, reload once so they match.
    var sw = root.navigator && root.navigator.serviceWorker;
    if (!sw || !sw.controller) return;
    var reloaded = false;
    sw.addEventListener('controllerchange', function () {
      if (reloaded) return;
      reloaded = true;
      root.location.reload();
    });
  }

  function init() { initTheme(); initNav(); initScreens(); initFreshness(); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
