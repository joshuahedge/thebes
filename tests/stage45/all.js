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
