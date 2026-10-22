// Version 6.0: one aggregator (tests/all.js imports this file once). Track 0's contract tests, then one aggregator per track in wave order;
// each track adds its files to its own tests/v60/<track>/all.js, never here. Describe names start with 'v60 <track>'.
import './contract/all.js';
import './a/all.js';
import './b1/all.js';
import './c/all.js';
import './b2/all.js';
import './d1/all.js';
import './d2/all.js';
import './balance/all.js';
