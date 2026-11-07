// ShirAmiram — Amiram Restatement Simulator Engine (ניסוח מחדש ושחבור תחבירי)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShirAmiramRestatements = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const GRAMMAR_CATEGORY_NAMES = {
    concession_contrast: 'ויתור וניגוד (Concession & Contrast)',
    cause_effect: 'סיבה ותוצאה (Cause & Effect)',
    comparison: 'השוואה ויחסי גודל (Comparison)',
    condition_negation: 'תנאי ושלילה (Conditions & Unless)',
    preference_choice: 'העדפה ובחירה (Preference)',
    passive_active: 'סביל ופעיל (Passive to Active)',
    time_sequence: 'סדר זמנים וכרונולוגיה (Time Sequences)',
    prohibition_permission: 'איסור והיתר (Prohibition & Modals)',
    hypothetical_conditional: 'תנאי בטל היפותטי (Conditionals)',
    limiting_adverbs: 'תוארי פועל מגבילים (Inversion: Hardly/Scarcely)',
    exclusivity_condition: 'תנאי בלעדי (Inversion: Only by)',
    negative_correlation: 'שלילה כפולה (Neither... Nor)',
    proportionate_change: 'יחס מקביל (The more... The less)',
    modals_speculation: 'מודלים והשערה בעבר (Modal Speculation)',
    contrast_balance: 'ניגוד מקביל (While / Whereas)',
    consequence_inevitability: 'תוצאה בלתי נמנעת (Inevitability)',
    counterfactual_wishes: 'חרטה ומשאלות עבר (Regret & Wishes)',
    negative_inversion: 'היפוך תחבירי שלילי (Seldom / Rarely)',
    unfulfilled_expectation: 'ציפייה לעומת מציאות (Far from being)',
    hypothetical_inversion: 'תנאי היפותטי מתקדם (Were it not for)',
    concession_degree: 'ויתור ברמת תואר (Invaluable though)',
    scarcity_restriction: 'פעולות עוקבות מידיות (Scarcely had... when)',
    counter_intuitive_balance: 'איזון עובדתי ניגודי (Notwithstanding)',
    inversion_extent: 'הוספה מדורגת (Not only... but also)',
    understatement_nuance: 'המעטה ודיוק משמעות (Less X than Y)',
    limiting_qualification: 'הגבלה סייגית (Only insofar as)',
    concession_superlative: 'ויתור הפלגה (However compelling)'
  };

  /**
   * Filter and create a restatement study session.
   * @param {Array} items
   * @param {Object} [options]
   * @returns {Array} Selected restatement questions
   */
  function createSession(items = [], options = {}) {
    if (!Array.isArray(items) || items.length === 0) return [];

    const mode = options.mode || 'all';
    const limit = options.limit || 15;
    const grammarFilter = options.grammar_target;

    let pool = items.slice();

    if (grammarFilter) {
      pool = pool.filter(q => q.grammar_target === grammarFilter);
    } else if (mode === 'A' || mode === 'A_foundational') {
      pool = pool.filter(q => q.difficulty === 'A_foundational');
    } else if (mode === 'B' || mode === 'B_intermediate') {
      pool = pool.filter(q => q.difficulty === 'B_intermediate');
    } else if (mode === 'C' || mode === 'C_advanced') {
      pool = pool.filter(q => q.difficulty === 'C_advanced');
    } else if (mode === 'mixed_15') {
      const a = pool.filter(q => q.difficulty === 'A_foundational').slice(0, 5);
      const b = pool.filter(q => q.difficulty === 'B_intermediate').slice(0, 5);
      const c = pool.filter(q => q.difficulty === 'C_advanced').slice(0, 5);
      return [...a, ...b, ...c];
    }

    return pool.slice(0, limit);
  }

  /**
   * Evaluate user's selected choice for a Restatement question.
   * @param {Object} question
   * @param {number} selectedIndex (0 to 3)
   * @returns {{ isCorrect: boolean, selectedOption: Object, correctOption: Object, explanation_he: string, error_type: string|null }}
   */
  function evaluateAnswer(question, selectedIndex) {
    if (!question || !Array.isArray(question.options)) {
      return { isCorrect: false, selectedOption: null, correctOption: null, explanation_he: '', error_type: 'invalid_question' };
    }

    const options = question.options;
    const selectedOption = options[selectedIndex] || null;
    const correctIndex = options.findIndex(o => o.is_correct);
    const correctOption = options[correctIndex] || null;

    const isCorrect = selectedOption ? Boolean(selectedOption.is_correct) : false;

    return {
      isCorrect,
      selectedOption,
      correctOption,
      correctIndex,
      explanation_he: question.explanation_he || '',
      error_type: selectedOption ? (selectedOption.error_type || null) : 'no_selection',
      grammarCategory: GRAMMAR_CATEGORY_NAMES[question.grammar_target] || question.grammar_target
    };
  }

  function getGrammarCategories(items = []) {
    const set = new Set();
    items.forEach(i => {
      if (i.grammar_target) set.add(i.grammar_target);
    });
    return Array.from(set).map(key => ({
      key,
      name: GRAMMAR_CATEGORY_NAMES[key] || key
    }));
  }

  return {
    GRAMMAR_CATEGORY_NAMES,
    createSession,
    evaluateAnswer,
    getGrammarCategories
  };
}));
