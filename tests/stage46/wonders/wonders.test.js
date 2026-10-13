// Stage 4.6, the Wonders track's tests. tests/stage46/all.js imports this one file for the track; the track's other test files are imported from here
// (never from all.js), and every describe is named 's46 wonders ...', so tests/run-tests.ps1 -Grep "s46 wonders" runs the track alone.
import './wondersData.test.js';
import './wondersSim.test.js';
import './wondersArt.test.js';
import './wondersUi.test.js';
import './wondersScenes.test.js';
