// Version 8.4 "Gold and war": one aggregator (tests/all.js imports this file once, after tests/v83/all.js). Each track adds its files to its
// own tests/v84/<track>/all.js, never here; describe names start with 'v84 <track>', so tests/run-tests.ps1 -Grep "v84" runs them all.
import './w0/all.js';        // Wave 0: the new goods, the partners' rows, world version 11, the seams
import './g/all.js';         // Track G: the tax rate, Rush a course, luxury imports
import './r/all.js';         // Track R: the raid clock, the scouts, the low-Nile lean, captured weapons, the celebration
import './e/all.js';         // Track E: war elephants and ivory
import './balance/all.js';   // Wave 2: the balance check against the design's targets
import './fix/all.js';       // The fix wave: the final review's findings
import './docs/all.js';      // The docs step: What's new for 8.4
