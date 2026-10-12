// Stage 4, Track G (picture cards, the tutorial tool and music): every test file of the track, one import each (tests/stage4/cards/*.test.js). describe names start
// with "s4 cards", so tests/run-tests.ps1 -Grep "s4 cards" runs the track alone. Only Track G edits this file.
import './cards/music.test.js';
import './cards/pictureCards.test.js';
import './cards/howToPlay.test.js';
import './cards/cardRules.test.js';
import './cards/pictures.test.js';
