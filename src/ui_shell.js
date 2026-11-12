/* ShirAmiram UI shell: bottom navigation groups + light/dark theme toggle.
   Presentation only. It drives the existing .tab-btn[data-tab] buttons by
   clicking them, so the tab logic in index.html stays the single source of truth. */
(function (root) {
  'use strict';

  var GROUPS = [
    { id: 'words', label: 'מילים', tabs: ['vocab'] },
    { id: 'practice', label: 'תרגול', tabs: ['quiz', 'flashcards'] },
    { id: 'songs', label: 'שירים', tabs: ['song', 'songs', 'suno', 'karaoke'] },
    { id: 'progress', label: 'התקדמות', tabs: ['dashboard'] }
  ];
  var THEME_KEY = 'shiramiram-theme';
  var THEME_COLORS = { light: '#F3F4EF', dark: '#0B0C10' };

  function groupForTab(tabId) {
    for (var i = 0; i < GROUPS.length; i++) {
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

  var api = { GROUPS: GROUPS, groupForTab: groupForTab, normalizeTheme: normalizeTheme, nextTheme: nextTheme };
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
      btn.textContent = theme === 'dark' ? 'מצב בהיר' : 'מצב כהה';
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
      for (var i = 0; i < sections.length; i++) {
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
      var observer = new root.MutationObserver(sync);
      doc.querySelectorAll('.tab-content').forEach(function (sec) {
        observer.observe(sec, { attributes: true, attributeFilter: ['class'] });
      });
    }
    sync();
  }

  function init() { initTheme(); initNav(); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
