// Stage 4.7 (Task 0): the dev scenes, run through window.__thebes.devScene(name) (src/dev/scenes.js joins them). Open
// /?skipTitle=1&nosw=1&seed=11&sample=1 first. Each starts as a stub (the open city as it is, said plainly so a shot is never mistaken
// for the real one); the task named beside it replaces its stub with an async (api, options) => description, using src/dev/s46/base.js
// (inGame, wait, sampleAt) or its own helpers in a file beside this one. Names start with 's47-'.
import { grassScene, oasisScene, hillsScene } from './land.js';
import { houseSpotsScene } from './spots.js';
import { cartsScene } from './carts.js';
import { quotaScene, raidWealthScene, estateScene } from './pressure.js';

export const S47_SCENES = {
  's47-grass': grassScene,                      // Task 2: the green river band on a new map
  's47-oasis': oasisScene,                      // Task 2: an oasis in the desert
  's47-hills': hillsScene,                      // Task 3: hills with their rocky skirt
  's47-house-spots': houseSpotsScene,         // Task 4: Good / Fair plots while the house tool is on
  's47-carts': cartsScene,                      // Tasks 5-6: a far district holding pottery, homes that wait on it, a near storehouse to set to Fetch it
  's47-quota': quotaScene,                      // Task 7: the court sheet with the yearly tribute
  's47-raid-wealth': raidWealthScene,           // Task 7: a year-11 raid whose size carries the wealth term
  's47-estate': estateScene,                    // Task 7: an Estate's sheet: what keeps it, the third food, Show me to a far store
};
export const STAGE47_SCENES = Object.keys(S47_SCENES);
