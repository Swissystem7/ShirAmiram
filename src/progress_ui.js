// Puts the learner's progress on screen: level, XP and day streak in the practice hub, a
// time-boxed study plan, the 28-day practice calendar and the progress report download.
// The numbers come from the existing engines (xp_engine, study_streak_badges,
// review_calendar_grid, study_session_optimizer, export_summary_formatter); this file only
// stores what the learner did (through progress_tracker) and draws it.
(function (root) {
  'use strict';
  var doc = root.document;
  var P = root.ShirAmiramProgress;
  if (!doc || !P) return;

  var XP = root.ShirAmiramXPEngine || null;
  var STREAKS = root.ShirAmiramStudyStreakBadges || null;
  var CALENDAR = root.ShirAmiramReviewCalendarGrid || null;
  var PLAN_KEY = 'shiramiram:plan-minutes';
  var $ = function (id) { return doc.getElementById(id); };

  // The widgets are extras: nothing in here may stop the quiz or the flashcards from working.
  function safely(fn) {
    try { return fn(); } catch (e) { if (root.console) root.console.warn('progress widget:', e); return undefined; }
  }

  var state = safely(function () {
    var loaded = P.load();
    if (loaded) return loaded;
    var AN = root.ShirAmiramAnalytics;
    var attempts = [];
    try { attempts = AN ? AN.loadAnalyticsState().attempts : []; } catch (e) { attempts = []; }
    var seeded = P.seedFromAttempts(attempts, XP);
    if (attempts.length) P.save(seeded);
    return seeded;
  }) || P.emptyState();

  function el(tag, className, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function daysWord(n) { return n === 1 ? 'יום אחד' : n + ' ימים'; }
  function actionsWord(n) { return n === 1 ? 'פעולה אחת' : n + ' פעולות'; }
  function practiceDaysWord(n) { return n === 1 ? 'יום תרגול אחד' : n + ' ימי תרגול'; }

  // ---------- Level, XP and streak ----------
  function renderXP() {
    var box = $('xp-widget');
    if (!box) return;
    var s = P.summarize(state, new Date(), XP, STREAKS);
    $('xp-level').textContent = String(s.level);
    $('xp-fill').style.width = s.progressPercent + '%';
    var bar = $('xp-bar');
    bar.setAttribute('aria-valuenow', String(s.progressPercent));
    bar.setAttribute('aria-valuetext', s.xp + ' נקודות, ' + s.progressPercent + '% מהדרך לשלב הבא');
    $('xp-note').textContent = s.xpToNext > 0
      ? s.xp + ' נק׳ · עוד ' + s.xpToNext + ' לשלב ' + (s.level + 1)
      : s.xp + ' נק׳ · השלב הגבוה ביותר';
    var streak = $('xp-streak');
    if (s.streakDays === 0) {
      streak.textContent = 'עוד אין רצף. תשובה אחת היום מתחילה אותו.';
    } else {
      let text = 'רצף של ' + daysWord(s.streakDays);
      if (s.streakTitle) text += ' · ' + s.streakTitle;
      if (!s.practisedToday) text += ' · תרגול היום שומר עליו';
      else if (s.nextMilestoneDays) text += ' · היעד הבא: ' + s.nextMilestoneDays + ' ימים';
      streak.textContent = text;
    }
    streak.setAttribute('data-live', s.streakDays > 0 && s.practisedToday ? 'on' : 'off');
  }

  // ---------- Practice calendar ----------
  function renderHeatmap() {
    var grid = $('heatmap-grid');
    if (!grid || !CALENDAR) return;
    var data = CALENDAR.buildHeatmapGrid(state.days, P.localISODate(new Date()), 28);
    grid.textContent = '';
    data.weeks.forEach(function (week) {
      week.forEach(function (cell) {
        var parts = cell.date.split('-');
        var label = Number(parts[2]) + '.' + Number(parts[1]) + ': '
          + (cell.count ? actionsWord(cell.count) + ' של תרגול' : 'בלי תרגול');
        var box = el('span', 'heat-cell');
        box.setAttribute('data-i', String(cell.intensity));
        box.title = label;
        grid.appendChild(box);
      });
    });
    grid.setAttribute('aria-label', 'לוח תרגול של 28 הימים האחרונים: ' + practiceDaysWord(data.totalActiveDays));
    $('heatmap-summary').textContent = data.totalActiveDays
      ? daysWord(data.totalActiveDays) + ' של תרגול · ' + actionsWord(data.totalActions) + ' · הרצף הארוך ביותר: ' + daysWord(data.maxStreak)
      : 'עוד לא נרשם תרגול. כל תשובה בחידון וכל כרטיסייה נספרות כאן.';
  }

  // ---------- Time-boxed plan ----------
  function context() {
    var fallback = { songs: [], questions: [], dueWords: [], snapshot: null };
    try { return typeof root.ShirAmiramContext === 'function' ? (root.ShirAmiramContext() || fallback) : fallback; }
    catch (e) { return fallback; }
  }

  function go(tabId, thenClick) {
    var btn = doc.querySelector('nav[aria-label="מסכים"] .tab-btn[data-tab="' + tabId + '"]')
      || doc.querySelector('.tab-btn[data-tab="' + tabId + '"]');
    if (btn) btn.click();
    (thenClick || []).forEach(function (id) { var t = $(id); if (t) t.click(); });
    root.scrollTo(0, 0);
  }

  var STEP = {
    song: { label: 'האזנה לשיר היום', unit: '', open: function () { go('song'); } },
    quiz: { label: 'חידון מהיר', unit: 'שאלות', one: 'שאלה אחת', open: function () { go('quiz', ['exam-type-cloze', 'quiz-mode-quick']); } },
    simulation: { label: 'סימולציית אמיר״ם', unit: 'שאלות', one: 'שאלה אחת', open: function () { go('quiz', ['exam-type-cloze', 'quiz-mode-amiram-mix']); } },
    flashcards: { label: 'כרטיסיות', unit: 'מילים', one: 'מילה אחת', open: function () { go('flashcards'); } },
    'error-review': { label: 'חזרה על מילים חלשות', unit: 'מילים', one: 'מילה אחת', open: function () { go('flashcards'); } }
  };

  function renderPlan(minutes) {
    var list = $('plan-list');
    var note = $('plan-note');
    if (!list || !note) return;
    doc.querySelectorAll('[data-plan-min]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-plan-min')) === minutes));
    });
    list.textContent = '';
    if (!minutes) { note.textContent = 'בוחרים זמן ומקבלים סדר תרגול שמתאים לו.'; return; }
    var A = root.ShirAmiram;
    var optimizer = root.ShirAmiramStudySessionOptimizer;
    if (!A || typeof A.buildQuickStudyPlan !== 'function' || !optimizer) { note.textContent = 'התוכנית לא זמינה כרגע.'; return; }
    var c = context();
    var plan = A.buildQuickStudyPlan(minutes, c.dueWords || [], c.songs || [], c.questions || [], optimizer);
    if (!plan.activities.length) { note.textContent = 'התוכן עוד נטען. נסו שוב בעוד רגע.'; return; }
    plan.activities.forEach(function (act) {
      var step = STEP[act.type] || { label: act.title, unit: '', open: function () {} };
      // A new learner has no weak words yet: the review step is then plain flashcards.
      if (act.type === 'error-review' && !c.hasWeakWords) step = STEP.flashcards;
      var count = Array.isArray(act.items) ? act.items.length : 0;
      var li = el('li');
      var btn = el('button', 'plan-step');
      btn.type = 'button';
      btn.appendChild(el('span', 'plan-step-name', step.label));
      var meta = act.durationMinutes + ' דק׳' + (step.unit && count ? ' · ' + (count === 1 ? step.one : count + ' ' + step.unit) : '');
      btn.appendChild(el('span', 'plan-step-meta', meta));
      btn.addEventListener('click', step.open);
      li.appendChild(btn);
      list.appendChild(li);
    });
    var hasQuiz = plan.activities.some(function (a) { return a.type === 'quiz' || a.type === 'simulation'; });
    note.textContent = 'סה״כ כ-' + plan.estimatedMinutes + ' דקות. לוחצים על שלב כדי להתחיל בו.'
      + (hasQuiz ? ' החידון נפתח באורכו הרגיל; עוצרים כשמגיעים למספר השאלות שבתוכנית.' : '');
  }

  function initPlan() {
    var saved = 0;
    try { saved = Number(root.localStorage.getItem(PLAN_KEY)) || 0; } catch (e) { saved = 0; }
    doc.querySelectorAll('[data-plan-min]').forEach(function (b) {
      b.addEventListener('click', function () {
        var minutes = Number(b.getAttribute('data-plan-min'));
        try { root.localStorage.setItem(PLAN_KEY, String(minutes)); } catch (e) { /* not remembered */ }
        renderPlan(minutes);
      });
    });
    renderPlan(0);
    // The song and question catalogue arrives after start-up, so the remembered plan is drawn
    // when the learner opens the practice screen.
    var practice = $('practice');
    if (saved && practice && root.MutationObserver) {
      new root.MutationObserver(function () {
        if (practice.classList.contains('hidden')) return;
        saved = currentMinutes() || saved;
        renderPlan(saved);
      }).observe(practice, { attributes: true, attributeFilter: ['class'] });
    }
  }

  function currentMinutes() {
    var pressed = doc.querySelector('[data-plan-min][aria-pressed="true"]');
    return pressed ? Number(pressed.getAttribute('data-plan-min')) : 0;
  }

  // ---------- Progress report ----------
  function buildReport() {
    var FMT = root.ShirAmiramExportSummaryFormatter;
    var snap = context().snapshot;
    if (!FMT || !snap) return null;
    var s = P.summarize(state, new Date(), XP, STREAKS);
    var md = FMT.formatStudentMarkdownReport({
      cefrLevel: snap.cefr,
      estimatedScore: String(snap.score),
      masteredCount: snap.mastered,
      totalVocab: snap.total,
      weakCategories: (snap.weakWords || []).map(function (w) {
        var he = w.hebrew_translation || w.translation || '';
        return he ? w.word + ' (' + he + ')' : String(w.word);
      })
    });
    // The formatter stamps a UTC date and speaks of 'areas'; this report lists words, by local date.
    md = md.replace(/^תאריך הפקה: .*$/m, 'תאריך הפקה: ' + P.localISODate(new Date()))
      .replace('## תחומים לחיזוק', '## מילים לחיזוק')
      .replace('- אין תחומים חלשים שדווחו', '- עוד אין מילים שטעית בהן בחידון');
    return md.trimEnd() + '\n\n' + [
      '## תרגול',
      '',
      '| מדד | ערך |',
      '| --- | --- |',
      '| שלב | ' + s.level + ' |',
      '| נקודות (XP) | ' + s.xp + ' |',
      '| רצף נוכחי | ' + daysWord(s.streakDays) + ' |',
      '| ימי תרגול שנרשמו | ' + s.activeDays + ' |',
      '| תשובות נכונות בחידון | ' + s.correct + ' מתוך ' + s.answered + ' |',
      ''
    ].join('\n');
  }

  function initExport() {
    var btn = $('btn-export-progress');
    var status = $('export-status');
    if (!btn || !status) return;
    btn.addEventListener('click', function () {
      var md = buildReport();
      if (!md) { status.textContent = 'הדוח לא זמין כרגע. נסו שוב אחרי שהנתונים נטענו.'; return; }
      var name = 'shiramiram-progress-' + P.localISODate(new Date()) + '.md';
      try {
        const url = root.URL.createObjectURL(new root.Blob([md], { type: 'text/markdown;charset=utf-8' }));
        const a = el('a');
        a.href = url;
        a.download = name;
        doc.body.appendChild(a);
        a.click();
        a.remove();
        // Some browsers (iOS Safari) ask before saving and read the file only after the answer.
        root.setTimeout(function () { root.URL.revokeObjectURL(url); }, 60000);
        status.textContent = 'ההורדה התחילה: ' + name;
      } catch (e) {
        status.textContent = 'ההורדה נכשלה בדפדפן הזה.';
      }
    });
  }

  function renderAll() { safely(renderXP); safely(renderHeatmap); }

  // Another tab or window may have saved progress since this page loaded; build on that.
  function latest() { return P.load() || state; }

  function initRefresh() {
    // Streaks and the calendar depend on today's date, so redraw whenever they come into view.
    ['practice', 'dashboard'].forEach(function (id) {
      var sec = $(id);
      if (!sec || !root.MutationObserver) return;
      var wasHidden = sec.classList.contains('hidden');
      new root.MutationObserver(function () {
        var hidden = sec.classList.contains('hidden');
        if (wasHidden && !hidden) { state = latest(); renderAll(); }
        wasHidden = hidden;
      }).observe(sec, { attributes: true, attributeFilter: ['class'] });
    });
    doc.addEventListener('visibilitychange', function () {
      if (doc.visibilityState === 'visible') { state = latest(); renderAll(); }
    });
    root.addEventListener('storage', function (e) {
      if (e.key === P.STORAGE_KEY) { state = latest(); renderAll(); }
    });
  }

  root.ShirAmiramProgressUI = {
    onAnswer: function (isCorrect) {
      safely(function () {
        state = P.recordAnswer(latest(), isCorrect === true, new Date(), XP);
        P.save(state);
      });
      renderAll();
    },
    onReview: function () {
      safely(function () {
        state = P.recordReview(latest(), new Date());
        P.save(state);
      });
      renderAll();
    },
    buildReport: function () { return safely(buildReport) || null; },
    refresh: renderAll
  };

  function init() { renderAll(); safely(initPlan); safely(initExport); safely(initRefresh); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
