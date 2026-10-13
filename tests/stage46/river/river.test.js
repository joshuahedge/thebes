// Stage 4.6, the River track's tests (rulings 334-335, 360-369). tests/stage46/all.js imports this one file for the track; it imports the
// track's other files, and every describe is named 's46 river ...', so tests/run-tests.ps1 -Grep "s46 river" runs the track alone.
import './floodSim.test.js';
import './wildlifeSim.test.js';
import './riverUi.test.js';
