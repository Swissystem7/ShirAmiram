// ShirAmiram — Offline Service Worker (network-first pages, stale-while-revalidate assets)
const CACHE_NAME = 'shiramiram-cache-v7';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './app.js',
  './src/ui_shell.js',
  './src/xp_engine.js',
  './src/study_streak_badges.js',
  './src/review_calendar_grid.js',
  './src/confidence_score_estimator.js',
  './src/export_summary_formatter.js',
  './src/song_recommender.js',
  './src/study_session_optimizer.js',
  './src/progress_tracker.js',
  './src/progress_ui.js',
  './css/volt.css',
  './src/amiram_vocab_data.js',
  './src/amiram_restatements_data.js',
  './src/amiram_reading_data.js',
  './src/vocab.js',
  './src/suno_generator.js',
  './src/audio_player.js',
  './src/exam_simulator.js',
  './src/srs_leitner.js',
  './src/analytics.js',
  './src/speech.js',
  './src/restatement_simulator.js',
  './src/pronunciation_hint.js',
  './src/difficulty_estimator.js',
  './src/song_karaoke.js',
  './src/reading_comprehension.js',
  './src/karaoke_scoring.js',
  './src/confidence_score_estimator.js',
  './src/daily_challenge_scheduler.js',
  './src/karaoke.js',
  './data/imports/amiram_vocab_full.json',
  './data/imports/amiram_restatements.json',
  './data/imports/amiram_reading_passages.json',
  './data/imports/content_v2.json',
  './data/suno_prompts/generated_songs.json',
  './shiramiram_vocab_full.json',
  './assets/icon-192.svg',
  './assets/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const store = (request, response) => {
    if (response && response.status === 200 && response.type === 'basic') {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    }
    return response;
  };

  // Pages: network first, revalidating past the browser HTTP cache (GitHub Pages sends
  // max-age=600), so a new release shows on the first visit after it ships. The cached
  // page is used when offline or when the network takes longer than 3 seconds.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      new Promise((resolve) => {
        let settled = false;
        const fromCache = () =>
          caches.match(event.request).then((hit) => hit || caches.match('./index.html'));
        const timer = setTimeout(() => {
          fromCache().then((hit) => {
            if (hit && !settled) { settled = true; resolve(hit); }
          });
        }, 3000);
        fetch(event.request, { cache: 'no-cache' }).then((response) => {
          clearTimeout(timer);
          store(event.request, response);
          if (!settled) { settled = true; resolve(response); }
        }).catch(() => {
          clearTimeout(timer);
          fromCache().then((hit) => {
            if (!settled) { settled = true; resolve(hit || Response.error()); }
          });
        });
      })
    );
    return;
  }

  // Other assets: answer from cache at once and refresh the cache in the background.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const refresh = fetch(event.request, { cache: 'no-cache' })
        .then((response) => store(event.request, response))
        .catch(() => cachedResponse || Response.error());
      if (cachedResponse) {
        event.waitUntil(refresh);
        return cachedResponse;
      }
      return refresh;
    })
  );
});
