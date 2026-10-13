// Stage 4.6, the Court track's tests. tests/stage46/all.js imports this one file for the track; the Court track adds its other test files
// in tests/stage46/court/ and imports them from here (never from all.js), and names every describe 's46 court ...', so
// tests/run-tests.ps1 -Grep "s46 court" runs the track alone.
import './courtSim.test.js';
import './courtCards.test.js';
import './courtGoals.test.js';
