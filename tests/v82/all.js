// Version 8.2 "Song of the Nile": one aggregator (tests/all.js imports this file once, after tests/v81/all.js). Each track adds its own tests/v82/<track>/all.js and its one line here; describe names
// start with 'v82 <track>', so tests/run-tests.ps1 -Grep "v82" runs them all.
import './m/all.js';   // Track M: the music
import './l/all.js';   // Track L: the lesson's words and camera, the bubble's type, the wide panel's tray
