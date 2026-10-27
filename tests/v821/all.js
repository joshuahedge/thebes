// Version 8.2.1 "Easier ferries": one aggregator (tests/all.js imports this file once, after tests/v82/all.js). Its one track is tests/v821/f/all.js; describe names
// start with 'v821 f', so tests/run-tests.ps1 -Grep "v821" runs them all.
import './f/all.js';   // Track F: the Ferry tool shows the crossings, lays the road a landing needs, and a drag snaps
