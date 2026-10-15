// Stage 4.7: one aggregator. Each task adds its own files here (tests/stage47/<task>/...); describe names start with 's47 <area>', so
// tests/run-tests.ps1 -Grep "s47 <area>" runs one area. tests/all.js imports this file once.
import './contract/contract.test.js';
import './resources/diagnostic.test.js';
import './resources/guarantee.test.js';
import './land/oases.test.js';
import './land/grass.test.js';
import './land/belts.test.js';
import './hills/hills.test.js';
import './hills/walk.test.js';
import './hills/art.test.js';
import './hills/review.test.js';
import './spots/spots.test.js';
import './carts/carts.test.js';
import './carts/tip.test.js';
import './carts/review.test.js';
import './carts/render.test.js';
import './carts/ui.test.js';
import './carts/uiReview.test.js';
