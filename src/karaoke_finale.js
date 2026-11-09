// ShirAmiram — Dual-Track Karaoke Finale Engine
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShirAmiramKaraokeFinale = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function normalize(str) {
    if (!str || typeof str !== 'string') return '';
    return str.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
  }

  function createFinaleSession(options) {
    const opts = options || {};
    const weakWords = Array.isArray(opts.weakWords) ? opts.weakWords.map(w => String(w).trim().toLowerCase()).filter(Boolean) : [];

    const suno = opts.sunoSong || {};
    const familiar = opts.familiarSong || {};

    const track1 = {
      type: 'invented_suno',
      title: suno.title || 'שיר אמיר"ם מקורי שהופק עבורך',
      lyrics: suno.lyrics || 'Facing the challenge, we rise above.',
      tempo: suno.bpm || 120,
      genre: suno.genre || 'Epic Pop Anthemic',
      audioUrl: suno.audioUrl || null
    };

    const track2 = {
      type: 'familiar_popular',
      title: familiar.title || 'שיר מוכר ומפורסם',
      artist: familiar.artist || 'אמן מוביל',
      youtube_id: familiar.youtube_id || null,
      spotify_id: familiar.spotify_id || null,
      lyric_line: familiar.lyric_line || '',
      guidanceHebrew: 'שיר את מילות היעד לפי המקצב והמלודיה של השיר המוכר המושמע ברקע!'
    };

    return {
      sessionId: 'finale_' + Date.now(),
      targetWords: Object.freeze(weakWords),
      tracks: Object.freeze([track1, track2]),
      currentTrackIndex: 0,
      status: 'ready', // 'ready' | 'track1_active' | 'track2_active' | 'completed'
      scores: [],
      overallScore: 0
    };
  }

  function scorePerformance(spokenText, expectedLyrics, targetWords) {
    const spoken = normalize(spokenText);
    const spokenTokens = new Set(spoken.split(/\s+/).filter(Boolean));
    const targets = Array.isArray(targetWords) ? targetWords.map(normalize).filter(Boolean) : [];

    if (targets.length === 0) {
      return {
        targetWordsHit: 0,
        targetWordsTotal: 0,
        targetScorePercent: 0,
        passed: false,
        feedbackHebrew: 'לא הוגדרו מילות יעד'
      };
    }

    let hitCount = 0;
    targets.forEach(tw => {
      if (spokenTokens.has(tw) || spoken.includes(tw)) {
        hitCount++;
      }
    });

    const scorePercent = Math.round((hitCount / targets.length) * 100);
    const passed = scorePercent >= 60;

    let feedbackHebrew = '';
    if (scorePercent === 100) {
      feedbackHebrew = 'ביצוע מושלם! שרת וביטאת את כל מילות היעד בדיוק רב!';
    } else if (scorePercent >= 60) {
      feedbackHebrew = 'ביצוע מצוין! הצלחת לשיר את רוב מילות היעד במקצב הנכון!';
    } else {
      feedbackHebrew = 'התחלה טובה, נסה שוב לשיר בקול ברור ולהקפיד על מילות היעד.';
    }

    return {
      targetWordsHit: hitCount,
      targetWordsTotal: targets.length,
      targetScorePercent: scorePercent,
      passed,
      feedbackHebrew
    };
  }

  function advanceSession(session, trackResult) {
    if (!session || typeof session !== 'object') return null;
    const scores = Array.isArray(session.scores) ? [...session.scores] : [];
    if (trackResult && typeof trackResult.score === 'number') {
      scores.push(trackResult.score);
    }

    const nextIdx = (session.currentTrackIndex || 0) + 1;
    const isDone = nextIdx >= session.tracks.length;

    let overallScore = 0;
    if (scores.length > 0) {
      const sum = scores.reduce((a, b) => a + b, 0);
      overallScore = Math.round(sum / scores.length);
    }

    return Object.freeze(Object.assign({}, session, {
      currentTrackIndex: isDone ? session.tracks.length - 1 : nextIdx,
      status: isDone ? 'completed' : 'track2_active',
      scores: Object.freeze(scores),
      overallScore
    }));
  }

  return {
    createFinaleSession,
    scorePerformance,
    advanceSession
  };
}));
