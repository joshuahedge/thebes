// Stage 4, Track D (score v2 and gamification): every test file of the track, one import each (tests/stage4/score/*.test.js). describe names start
// with "s4 score", so tests/run-tests.ps1 -Grep "s4 score" runs the track alone. Only Track D edits this file.
import './score/scoreV2.test.js';
import './score/recordsV2.test.js';
import './score/scoreV2Ui.test.js';
import './score/goals.test.js';
import './score/goalsUi.test.js';
import './score/rewards.test.js';
