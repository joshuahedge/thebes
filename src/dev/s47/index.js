// Stage 4.7 (Task 0): the dev scenes, run through window.__thebes.devScene(name) (src/dev/scenes.js joins them). Open
// /?skipTitle=1&nosw=1&seed=11&sample=1 first. Each starts as a stub (the open city as it is, said plainly so a shot is never mistaken
// for the real one); the task named beside it replaces its stub with an async (api, options) => description, using src/dev/s46/base.js
// (inGame, wait, sampleAt) or its own helpers in a file beside this one. Names start with 's47-'.
import { stub } from '../s46/base.js';
import { grassScene, oasisScene, hillsScene } from './land.js';

export const S47_SCENES = {
  's47-grass': grassScene,                      // Task 2: the green river band on a new map
  's47-oasis': oasisScene,                      // Task 2: an oasis in the desert
  's47-hills': hillsScene,                      // Task 3: hills with their rocky skirt
  's47-house-spots': stub('s47-house-spots'),   // Task 4: Good / Fair plots while the house tool is on
  's47-carts': stub('s47-carts'),               // Tasks 5-6: a fetch order with its cart on the road
};
export const STAGE47_SCENES = Object.keys(S47_SCENES);
