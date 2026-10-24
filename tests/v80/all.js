// Version 8.0 "Clear and calm": one aggregator (tests/all.js imports this file once, after tests/v711c.js). Each track adds its own tests/v80/<track>/all.js and its one line here; describe names
// start with 'v80 <track>', so tests/run-tests.ps1 -Grep "v80" runs them all.
import './v/all.js';   // Track V: the look
import './u/all.js';   // Track U: menus, words and settings
import './n/all.js';   // Track N: messages, placing and the lesson fixes
import './g/all.js';   // Integration: where the three tracks meet
