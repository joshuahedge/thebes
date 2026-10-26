// Version 8.1 "The vizier": one aggregator (tests/all.js imports this file once, after tests/v80/all.js). Each track adds its own tests/v81/<track>/all.js and its one line here; describe names
// start with 'v81 <track>', so tests/run-tests.ps1 -Grep "v81" runs them all.
import './t/all.js';   // Track T: the story, Ipi and the tutorial
