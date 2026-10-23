// Version 7.0: one aggregator (tests/all.js imports this file once). Track 0's contract tests, then one aggregator per track in wave order;
// each track adds its files to its own tests/v70/<track>/all.js, never here. Describe names start with 'v70 <track>'.
import './contract/all.js';
import './t/all.js';
import './e/all.js';
import './s/all.js';
import './a/all.js';
import './balance/all.js';
import './docs/all.js';
