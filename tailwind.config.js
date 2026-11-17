// Tailwind 3.4.17 build of css/tailwind.css (npm run build:css). The theme is the one index.html used
// to hand to the Play CDN (tailwind.config = {...}); content lists every file whose class names reach
// the page, the page itself and the scripts that write markup. The committed file is what the site
// and CI serve, so the deploy does not need a Tailwind step in GitHub Actions.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './app.js', './src/**/*.js', './sw.js'],
  theme: {
    extend: {
      colors: {
        brand: { primary: '#6366f1', hover: '#4f46e5', success: '#10b981', error: '#ef4444' },
        neon: { purple: '#6366f1', pink: '#f472b6', cyan: '#22d3ee' },
        stage: { 950: '#07060f', 900: '#0f172a', 800: '#1e293b' }
      },
      boxShadow: {
        glow: '0 0 40px rgba(99,102,241,0.35)',
        'glow-pink': '0 0 28px rgba(244,114,182,0.4)'
      }
    }
  },
  plugins: []
};
