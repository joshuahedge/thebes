// Version 9.3 ("A city that grows" and the weekly decree): one aggregator (tests/all.js imports this file once, after tests/v92/all.js). Each track adds
// its files to its own tests/v93/<track>/all.js and one line here; describe names start with 'v93 <track>', so tests/run-tests.ps1 -Grep "v93" runs them all.
import './w0/all.js';        // Wave 0: the seams (looks, the building's day, slot keys, materials and primitives)
import './d0/all.js';        // D0: the decree's seams (the table, the week, rules.js, world.decree, the golden fingerprint)
import './r/all.js';         // R: the decree's rules in the sim (the levers, the end, the tallies, decreeScore)
import './s/all.js';         // S: the decree's save slot, records version 3 and links
import './b/all.js';         // B: services, workshops and landmarks in four looks and three states
import './n/all.js';         // N: the rest of the art (palace, monuments, nature, figures, armies, river, boats)
import './m/all.js';         // Track M: the rebuild's scaffolds, the level-up sweep, the notice's line
import './h/all.js';         // Track H: homes in four looks and three variants, and the far drawing
import './g/all.js';         // G: ground, yards and streets
import './u/all.js';         // U: the decree's interface (the card, the chip, the end card, the wall, the ruler list)
import './k/all.js';         // K: the decree's balance (bars and medals; the six-year runs load only for -Grep "v93 k balance")
import './p/all.js';         // P: the caches by device, measured on the scenes, and the bar's contract (wave 2)
import './x/all.js';         // X: the fix wave
