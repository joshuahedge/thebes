// Stage 4, Track A (monuments sim, supply chain and palace sim): every test file of the track, one import each (tests/stage4/sim/*.test.js). describe names start
// with "s4 sim", so tests/run-tests.ps1 -Grep "s4 sim" runs the track alone. Only Track A edits this file.
import './sim/crews.test.js';
import './sim/supply.test.js';
