// Stage 3, Track A: every test file of the track, one import each (tests/stage3/fire/*.test.js). describe names start
// with "s3 fire", so tests/run-tests.ps1 -Grep "s3 fire" runs the track alone. Only Track A edits this file.
import './fire/ignition.test.js';
import './fire/stages.test.js';
