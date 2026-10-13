// Stage 4.6, the Map track's tests. tests/stage46/all.js imports this one file for the track; the Map track adds its other test files
// in tests/stage46/map/ and imports them from here (never from all.js), and names every describe 's46 map ...', so
// tests/run-tests.ps1 -Grep "s46 map" runs the track alone.
import './coverage.test.js';
