// Version 9.0 "Dynasty": one aggregator (tests/all.js imports this file once, after tests/v84/all.js). Each track adds its files to its own
// tests/v90/<track>/all.js, never here; describe names start with 'v90 <track>', so tests/run-tests.ps1 -Grep "v90" runs them all.
import './w0/all.js';        // Wave 0: world version 12 and the heir, the records' rulers, rivals and dynasty, the seams
import './d/all.js';         // Track D: Pass the throne, the title, the heir's trait
import './l/all.js';         // Track L: the ruler list, the backup and the install ask, rivals
import './v/all.js';         // Track V: animations and visual effects
import './balance/all.js';   // Wave 2: the balance check, traits and frames, against the design's targets
import './docs/all.js';      // The docs step: What's new for 9.0
