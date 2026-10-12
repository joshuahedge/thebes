// Stage 4, Track F (balance and integration): every test file of the track, one import each (tests/stage4/balance/*.test.js). describe names start
// with "s4 balance", so tests/run-tests.ps1 -Grep "s4 balance" runs the track alone. Only Track F edits this file.
import './balance/capital.test.js';
import './balance/cities.test.js';
import './balance/scenes.test.js';
import './balance/budget.test.js';
