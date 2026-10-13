// Stage 4.5: one import per test file (tests/stage45/*.test.js). Describe names start with "s45 ", so
// tests/run-tests.ps1 -Grep "s45 " runs the stage alone. tests/all.js imports this file once.
import './trees.test.js';
import './gates.test.js';
import './fire.test.js';
import './clock.test.js';
import './clay.test.js';
import './worldV6.test.js';
import './variants.test.js';
import './bridges.test.js';
import './stamps.test.js';
import './economy.test.js';   // Task 4b: the forecast, the cost lines, the gold chip, the warning tip, the Gold card and goal, the unemployment phase-in
import './newcomers.test.js';   // Task 4c: newcomers walking in from the entry to a home on arrival day
import './raids.test.js';   // Task 5a: tougher raids (growth, two-sided raids, granaries and homes, the words)
import './health.test.js';   // Task 5b: disease (risk, physician cover, illness, spread, alerts, mood, words)
import './crime.test.js';   // Task 5c: crime (risk, police post cover, thefts, alerts, mood, words, save)
import './threatsUi.test.js';   // Task 5d: overlays, the cloth, sheet rows, Show me, the caption, goals, tips, firsts
import './variantLinks.test.js';   // review fixes: the map variant in share links, Start this seed and personal bests
