// Version 8.3 "Lines": one aggregator (tests/all.js imports this file once, after tests/v821/all.js). Each track adds its
// files to its own tests/v83/<track>/all.js, never here; describe names start with 'v83 <track>', so
// tests/run-tests.ps1 -Grep "v83" runs them all.
import './x/all.js';      // Track X: the road tool lays a bridge or a ferry; the Crossing card
import './k/all.js';      // Track K: Keep stocked, a chosen source, the Supply lines layer
import './c/all.js';      // Track C: crews at any distance, the workers' camp
import './docs/all.js';   // The docs step: What's new for 8.3
import './lesson.test.js';   // After 8.3: the lesson never lets a building that needs a road stand off one
