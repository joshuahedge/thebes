// Stage 4.6: one import per track (tests/stage46/<track>/<track>.test.js, which imports the track's other files) and Track 0's contract
// tests. Describe names start with 's46 <track>' (map, river, court, armies, wonders, ux) or 's46 contract', so tests/run-tests.ps1
// -Grep "s46 map" runs one track. tests/all.js imports this file once; no track edits it.
import './contract/mapSizes.test.js';
import './contract/worldV7.test.js';
import './contract/salts.test.js';
import './contract/hooks.test.js';
import './map/map.test.js';
import './river/river.test.js';
import './court/court.test.js';
import './armies/armies.test.js';
import './wonders/wonders.test.js';
import './ux/ux.test.js';
import './wave1/wave1.test.js';
import './wave2/wave2.test.js';
import './balance/balance.test.js';
import './final/court.test.js';
