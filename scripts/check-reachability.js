'use strict';
// Which modules under MODULE_DIR does the page actually load?
// Starts from the local <script src> tags of the page(s) and follows static/dynamic ES imports
// (import ... from './x', import('./x')). require() is NOT followed: in these UMD files it only runs under
// Node (tests), so a module reached only through require() is never loaded by the browser. A module that is not reached and not in ALLOWLIST fails the check, so a new module
// has to be wired into the page (or consciously allowlisted) instead of silently shipping unused.
//   node <this file>   print the report, exit 1 on a new unreachable module
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PAGES = ['index.html'];
const MODULE_DIR = 'src';
// Modules that existed, tested but not loaded by the page, when this check was added.
const ALLOWLIST = [
  'src/adaptive_recommender.js',
  'src/assessment_producer.js',
  'src/audio_speed_pitch_calculator.js',
  'src/cloze_generator.js',
  'src/cognate_detector.js',
  'src/collocation_matcher.js',
  'src/contextual_clue_analyzer.js',
  'src/daily_summary_card.js',
  'src/distractor_generator.js',
  'src/error_analytics.js',
  'src/exam_generator.js',
  'src/export_summary_formatter.js',
  'src/flashcard_generator.js',
  'src/idiom_context_builder.js',
  'src/idiom_phrasal_matcher.js',
  'src/learning_coordinator.js',
  'src/learning_history.js',
  'src/learning_pipeline.js',
  'src/lyrics_analyzer.js',
  'src/lyrics_annotator.js',
  'src/mastery_certificate_engine.js',
  'src/phonetic_rhyme_matcher.js',
  'src/playlist_generator.js',
  'src/prefix_suffix_engine.js',
  'src/question_builder.js',
  'src/quiz_generator.js',
  'src/reading_speed_calculator.js',
  'src/restatement_generator.js',
  'src/review_calendar_grid.js',
  'src/review_session_builder.js',
  'src/simulation.js',
  'src/song_recommender.js',
  'src/song_segmenter.js',
  'src/spaced_batch_evaluator.js',
  'src/spaced_scheduler.js',
  'src/spelling_bee_validator.js',
  'src/streak_encouragement.js',
  'src/study_session_optimizer.js',
  'src/study_streak_badges.js',
  'src/synonym_cluster_engine.js',
  'src/universal_speech.js',
  'src/user_level_tracker.js',
  'src/vocab_matcher.js',
  'src/vocab_taxonomy.js',
  'src/word_family_builder.js',
  'src/xp_engine.js'
];

function localScripts(page) {
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const out = [];
  for (const m of html.matchAll(/<script\b[^>]*\ssrc\s*=\s*["']([^"']+)["']/gi)) {
    if (/^([a-z]+:|\/\/)/i.test(m[1])) continue;
    out.push(path.join(ROOT, path.dirname(page), m[1].split(/[?#]/)[0]));
  }
  return out;
}

function deps(file) {
  const src = fs.readFileSync(file, 'utf8');
  const out = [];
  const re = /(?:\bimport\s*\(\s*|\bfrom\s+|^\s*import\s+)["'](\.{1,2}\/[^"']+)["']/gm;
  for (const m of src.matchAll(re)) {
    let target = path.join(path.dirname(file), m[1]);
    if (!fs.existsSync(target) && fs.existsSync(target + '.js')) target += '.js';
    if (fs.existsSync(target) && fs.statSync(target).isFile()) out.push(target);
  }
  return out;
}

function reachable() {
  const seen = new Set();
  const queue = PAGES.flatMap(localScripts).filter((f) => fs.existsSync(f));
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    queue.push(...deps(file));
  }
  return seen;
}

function report() {
  const dir = path.join(ROOT, MODULE_DIR);
  const modules = fs.readdirSync(dir).filter((n) => n.endsWith('.js')).sort();
  const seen = reachable();
  const rel = (n) => MODULE_DIR + '/' + n;
  const unreachable = modules.filter((n) => !seen.has(path.join(dir, n))).map(rel);
  return {
    modules: modules.length,
    reachable: modules.length - unreachable.length,
    unreachable,
    notAllowed: unreachable.filter((m) => !ALLOWLIST.includes(m)),
    nowReachable: ALLOWLIST.filter((m) => !unreachable.includes(m)),
  };
}

module.exports = { report, ALLOWLIST };

if (require.main === module) {
  const r = report();
  console.log('reachability: ' + r.reachable + '/' + r.modules + ' modules under ' + MODULE_DIR + '/ are loaded by ' + PAGES.join(', ') + '; ' + r.unreachable.length + ' are not (' + (r.unreachable.length - r.notAllowed.length) + ' allowlisted)');
  for (const m of r.nowReachable) console.log('  note: ' + m + ' is loaded now - remove it from ALLOWLIST');
  for (const m of r.notAllowed) console.error('  NEW unreachable module: ' + m + ' (load it from the page, or add it to ALLOWLIST on purpose)');
  if (r.notAllowed.length) process.exitCode = 1;
}
