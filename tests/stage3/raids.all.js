// Stage 3, Track B: every test file of the track, one import each (tests/stage3/raids/*.test.js). describe names start
// with "s3 raids", so tests/run-tests.ps1 -Grep "s3 raids" runs the track alone. Only Track B edits this file.
import './raids/warning.test.js';
import './raids/walls.test.js';
