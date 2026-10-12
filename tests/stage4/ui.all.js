// Stage 4, Track C (interface): every test file of the track, one import each (tests/stage4/ui/*.test.js). describe names start
// with "s4 ui", so tests/run-tests.ps1 -Grep "s4 ui" runs the track alone. Only Track C edits this file.
import './ui/monumentsTab.test.js';
import './ui/placing.test.js';
import './ui/siteSheet.test.js';
import './ui/otherSheets.test.js';
