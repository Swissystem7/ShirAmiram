// ShirAmiram — Audio Player Module (Local Suno Audio & LRC Synchronization)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShirAmiramAudio = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Check if a local audio track is available or pending.
   * @param {string} audioPath - Path to local audio (e.g. assets/audio/suno_1.mp3)
   * @param {Function} fsCheckFn - Optional synchronous file exists check
   * @returns {{available: boolean, status: string, message: string}}
   */
  function checkAudioAvailability(audioPath, fsCheckFn) {
    if (!audioPath) {
      return {
        available: false,
        status: 'pending_manual',
        message: 'לא צוין נתיב לקובץ שמע'
      };
    }

    let exists = false;
    if (typeof fsCheckFn === 'function') {
      try {
        exists = Boolean(fsCheckFn(audioPath));
      } catch (e) {
        exists = false;
      }
    }

    if (exists) {
      return {
        available: true,
        status: 'ready',
        message: 'קובץ שמע מקומי זמין לניגון'
      };
    } else {
      return {
        available: false,
        status: 'pending_manual',
        message: 'ממתין להפקת אודיו ב-Suno (העתיקו את המילים והפרומפט מ-Suno Studio)'
      };
    }
  }

  /**
   * Parse simple LRC or JSON timing lines for synchronization
   * @param {string} raw
   * @returns {Array<{time: number, text: string}>}
   */
  function parseLrc(raw) {
    if (!raw || typeof raw !== 'string') return [];
    const lines = raw.split(/\r?\n/);
    const result = [];
    const timeRegex = /\[(\d{1,2}):(\d{2}(?:\.\d+)?)\](.*)/;

    lines.forEach(line => {
      const match = line.match(timeRegex);
      if (match) {
        const min = parseInt(match[1], 10);
        const sec = parseFloat(match[2]);
        const text = match[3].trim();
        result.push({
          time: min * 60 + sec,
          text
        });
      }
    });

    return result.sort((a, b) => a.time - b.time);
  }

  /**
   * Find current active line by playback time in seconds
   * @param {Array} lines
   * @param {number} currentTime
   * @returns {number} Index of active line (-1 if before first line)
   */
  function getActiveLineIndex(lines, currentTime) {
    if (!Array.isArray(lines) || lines.length === 0 || currentTime < lines[0].time) {
      return -1;
    }
    for (let i = lines.length - 1; i >= 0; i--) {
      if (currentTime >= lines[i].time) {
        return i;
      }
    }
    return -1;
  }

  return {
    checkAudioAvailability,
    parseLrc,
    getActiveLineIndex
  };
}));
