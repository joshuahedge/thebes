// Stage 3, Track E: every test file of the track, one import each (tests/stage3/score/*.test.js). describe names start
// with "s3 score", so tests/run-tests.ps1 -Grep "s3 score" runs the track alone. Only Track E edits this file.
import './score/score.test.js';
import './score/scoreUi.test.js';
import './score/records.test.js';
import './score/share.test.js';
import './score/sealShare.test.js';
