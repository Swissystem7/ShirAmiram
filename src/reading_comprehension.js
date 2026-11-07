/**
 * ShirAmiram - Amiram Reading Comprehension Engine (הבנת הנקרא)
 * 
 * Provides academic passage parsing, line numbering, Amiram target vocabulary bridging,
 * question evaluation with detailed Hebrew explanations, and CEFR level scoring.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AmiramReading = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  /**
   * Validate and load reading passages
   * @param {Array} passages 
   * @returns {Array} Validated passages
   */
  function loadPassages(passages) {
    if (!Array.isArray(passages) || passages.length === 0) {
      return [];
    }

    return passages.filter(p => {
      return p &&
        typeof p.id === 'string' &&
        typeof p.title === 'string' &&
        typeof p.level === 'string' &&
        Array.isArray(p.paragraphs) && p.paragraphs.length > 0 &&
        Array.isArray(p.questions) && p.questions.length > 0;
    });
  }

  /**
   * Filter passages by difficulty level
   * @param {Array} passages 
   * @param {string} level 'A_foundational' | 'B_intermediate' | 'C_advanced' | 'all'
   */
  function filterByLevel(passages, level) {
    const list = loadPassages(passages);
    if (!level || level === 'all') {
      return list;
    }
    return list.filter(p => p.level === level);
  }

  /**
   * Format paragraph with academic line numbers
   * In MALAT Amiram tests, line markers appear at interval 5 (e.g. line 5, line 10, line 15)
   * @param {string} paragraphText
   * @param {number} startLineNumber
   * @param {number} wordsPerLine Approx words per line for standard formatting (default 10)
   * @returns {{ formattedHtml: string, endLineNumber: number }}
   */
  function formatParagraphLines(paragraphText, startLineNumber = 1, wordsPerLine = 10) {
    if (!paragraphText || typeof paragraphText !== 'string') {
      return { formattedHtml: '', endLineNumber: startLineNumber };
    }

    const words = paragraphText.trim().split(/\s+/);
    const lines = [];
    let currentLine = [];
    let currentLineNum = startLineNumber;

    for (let i = 0; i < words.length; i++) {
      currentLine.push(words[i]);
      if (currentLine.length >= wordsPerLine || i === words.length - 1) {
        const lineContent = currentLine.join(' ');
        const isMarker = (currentLineNum % 5 === 0);
        const markerBadge = isMarker 
          ? `<span class="rc-line-num marker">(${currentLineNum})</span>`
          : `<span class="rc-line-num dim">${currentLineNum}</span>`;
        lines.push(`<div class="rc-line" data-line="${currentLineNum}">${markerBadge} <span class="rc-line-text">${lineContent}</span></div>`);
        currentLine = [];
        currentLineNum++;
      }
    }

    return {
      formattedHtml: lines.join(''),
      endLineNumber: currentLineNum
    };
  }

  /**
   * Highlight Amiram target words inside a text string
   * @param {string} text 
   * @param {Array<string>} targetWords 
   * @returns {string} HTML with interactive badges
   */
  function highlightVocab(text, targetWords = []) {
    if (!text || typeof text !== 'string') return '';
    if (!Array.isArray(targetWords) || targetWords.length === 0) return text;

    let highlighted = text;
    targetWords.forEach(word => {
      if (!word) return;
      // Match whole word, case-insensitive
      const regex = new RegExp(`\\b(${word})\\b`, 'gi');
      highlighted = highlighted.replace(regex, `<span class="rc-target-word" data-word="$1" tabindex="0" title="מילת אמיר״ם: לחץ לשמיעה">$1</span>`);
    });

    return highlighted;
  }

  /**
   * Evaluate a question answer
   * @param {Object} question 
   * @param {number} selectedIndex 0-3
   * @returns {Object} Result object
   */
  function evaluateAnswer(question, selectedIndex) {
    if (!question || typeof question.correct_index !== 'number') {
      return { isCorrect: false, correctIndex: -1, explanation: '' };
    }

    const isCorrect = (selectedIndex === question.correct_index);
    return {
      isCorrect,
      selectedIndex,
      correctIndex: question.correct_index,
      explanation: question.hebrew_explanation || '',
      lineReference: question.line_reference || '',
      questionType: question.type || 'general'
    };
  }

  /**
   * Initialize a reading session
   * @param {Array} passages 
   * @param {Object} options { level: 'all' | 'A_foundational' | ... }
   */
  function createSession(passages, options = {}) {
    const pool = filterByLevel(passages, options.level || 'all');
    if (pool.length === 0) {
      return null;
    }

    // Default to first passage in the filtered list
    const activePassage = pool[0];
    return {
      passages: pool,
      activePassageIndex: 0,
      activePassage,
      activeQuestionIndex: 0,
      answers: {}, // questionId -> { selectedIndex, isCorrect, timestamp }
      startedAt: Date.now(),
      completed: false
    };
  }

  /**
   * Record answer in session
   * @param {Object} session 
   * @param {string} questionId 
   * @param {number} selectedIndex 
   */
  function recordSessionAnswer(session, questionId, selectedIndex) {
    if (!session || !session.activePassage) return null;
    const question = session.activePassage.questions.find(q => q.id === questionId);
    if (!question) return null;

    const evaluation = evaluateAnswer(question, selectedIndex);
    session.answers[questionId] = {
      ...evaluation,
      answeredAt: Date.now()
    };

    // Check if all questions in active passage are answered
    const totalQuestions = session.activePassage.questions.length;
    const answeredCount = Object.keys(session.answers).length;
    if (answeredCount >= totalQuestions) {
      session.completed = true;
    }

    return evaluation;
  }

  /**
   * Calculate summary and estimated CEFR Reading score
   * @param {Object} session 
   */
  function getSessionSummary(session) {
    if (!session || !session.activePassage) {
      return { total: 0, correct: 0, percentage: 0, cefr: 'Pre-A2' };
    }

    const questions = session.activePassage.questions;
    const total = questions.length;
    let correct = 0;
    const typeBreakdown = {};

    questions.forEach(q => {
      const ans = session.answers[q.id];
      const type = q.type || 'other';
      if (!typeBreakdown[type]) {
        typeBreakdown[type] = { total: 0, correct: 0 };
      }
      typeBreakdown[type].total++;
      if (ans && ans.isCorrect) {
        correct++;
        typeBreakdown[type].correct++;
      }
    });

    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

    // CEFR mapping for reading comprehension
    let cefr = 'Pre-A2 (טרום בסיסי)';
    if (percentage >= 90) cefr = 'C1 (פטור אקדמי מלא)';
    else if (percentage >= 75) cefr = 'B2 (מתקדמים ב\')';
    else if (percentage >= 55) cefr = 'B1 (מתקדמים א\')';
    else if (percentage >= 35) cefr = 'A2 (בסיסי)';

    return {
      total,
      correct,
      percentage,
      cefr,
      typeBreakdown,
      level: session.activePassage.level
    };
  }

  return {
    loadPassages,
    filterByLevel,
    formatParagraphLines,
    highlightVocab,
    evaluateAnswer,
    createSession,
    recordSessionAnswer,
    getSessionSummary
  };
});
