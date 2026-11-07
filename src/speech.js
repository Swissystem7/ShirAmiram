// ShirAmiram — Universal Speech Pronunciation Service (Web Speech API)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShirAmiramSpeech = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SETTINGS_KEY = 'shiramiram:speech:settings:v1';
  let activeUtterance = null;

  function canSpeak() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  }

  function stopSpeaking() {
    if (canSpeak()) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    activeUtterance = null;
  }

  function getSettings(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    const defaults = { rate: 0.9, pitch: 1.0, lang: 'en-US', voiceName: '' };
    if (!storage) return defaults;
    try {
      const raw = storage.getItem(SETTINGS_KEY);
      return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch (e) {
      return defaults;
    }
  }

  function saveSettings(settings, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    if (!storage) return false;
    try {
      storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Speak English text using Web Speech API with fallback and cancellation.
   * @param {string} text
   * @param {Object} [options]
   * @returns {boolean} Whether speak was triggered
   */
  function speak(text, options = {}) {
    const value = String(text || '').trim();
    if (!value || !canSpeak()) return false;

    stopSpeaking();

    const settings = getSettings();
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = options.lang || settings.lang || 'en-US';
    utterance.rate = options.rate != null ? options.rate : settings.rate;
    utterance.pitch = options.pitch != null ? options.pitch : settings.pitch;

    if (window.speechSynthesis.getVoices) {
      const voices = window.speechSynthesis.getVoices() || [];
      const targetVoice = voices.find(v => (options.voiceName && v.name === options.voiceName) || (v.lang === utterance.lang && v.name.includes('English')));
      if (targetVoice) utterance.voice = targetVoice;
    }

    activeUtterance = utterance;
    utterance.onend = () => {
      if (activeUtterance === utterance) activeUtterance = null;
    };
    utterance.onerror = () => {
      if (activeUtterance === utterance) activeUtterance = null;
    };

    window.speechSynthesis.speak(utterance);
    return true;
  }

  return {
    canSpeak,
    stopSpeaking,
    getSettings,
    saveSettings,
    speak
  };
}));
