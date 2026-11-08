// Version 9.1 "First hours": one aggregator (tests/all.js imports this file once, after tests/v90/all.js). Each track adds its files to its own
// tests/v91/<track>/all.js, never here; describe names start with 'v91 <track>', so tests/run-tests.ps1 -Grep "v91" runs them all.
import './w0/all.js';        // Wave 0: the seams for F, R and P, index.html's three blocks, css/v91.css, the text sections
import './f/all.js';         // Track F: first hours (the lesson, the hand-over, the first own city)
import './r/all.js';         // Track R: never stuck (the error card, the loading screen, the debt sheet)
import './a/all.js';         // Track A: clear and trusted (About)
import './p/all.js';         // Track P: runs well (the caches, the preload; the profile runs outside the suite)
import './h/all.js';         // Track H: the heirs retuned
import './balance/all.js';   // Wave 2: the balance check, against the design's targets
import './docs/all.js';      // The docs step: What's new for 9.1
