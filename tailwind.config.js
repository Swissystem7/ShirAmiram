/* Prebuilt stylesheet source. `npm run build:css` regenerates css/tailwind.css.
   The committed file is what the site and CI serve, so the deploy does not
   need a Tailwind step in GitHub Actions. */
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
