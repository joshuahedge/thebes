// Stage 4.6, the UX track's tests. tests/stage46/all.js imports this one file for the track; the UX track adds its other test files
// in tests/stage46/ux/ and imports them from here (never from all.js), and names every describe 's46 ux ...', so
// tests/run-tests.ps1 -Grep "s46 ux" runs the track alone.
import './enter.test.js';
import './speed.test.js';
import './legibility.test.js';
import './releases.test.js';
