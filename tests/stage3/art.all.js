// Stage 3, Track C: every test file of the track, one import each (tests/stage3/art/*.test.js). describe names start
// with "s3 art", so tests/run-tests.ps1 -Grep "s3 art" runs the track alone. Only Track C edits this file.
import './art/buildingArt.test.js';
import './art/wallsMap.test.js';
import './art/fireArt.test.js';
