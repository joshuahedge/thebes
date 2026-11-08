// Version 9.2 "A city you can read": one aggregator (tests/all.js imports this file once, after tests/v91/all.js). Each track adds its files to its own
// tests/v92/<track>/all.js, never here; describe names start with 'v92 <track>', so tests/run-tests.ps1 -Grep "v92" runs them all.
import './w0/all.js';        // Wave 0: the seams (the rigs, the roll-up's shape, the letters' gate, score v3's slot, the text sections)
import './l/all.js';         // Track L: the lesson and the first hours
import './q/all.js';         // Track Q: a quiet city (alerts, letters, the wide layout)
import './s/all.js';         // Track S: a fair score
import './d/all.js';         // Track D: the dynasty's moment
import './a/all.js';         // Track A: reachable for everyone
import './w/all.js';         // Track W: words
import './v/all.js';         // Track V: the look
import './balance/all.js';   // The balance check, against the design's targets
import './fix/all.js';       // The fix wave after the final review
import './docs/all.js';      // The docs step: What's new for 9.2
