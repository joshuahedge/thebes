// Version 5.0 (Task 0): the dev scenes, run through window.__thebes.devScene(name) (src/dev/scenes.js joins them). Open
// /?skipTitle=1&nosw=1&seed=11&sample=1 first. Each starts as a stub (the open city as it is, said plainly so a shot is never mistaken
// for the real one); the task named beside it replaces its stub with an async (api, options) => description, using src/dev/s46/base.js
// (inGame, wait, sampleAt) or its own helpers in a file beside this one. Names start with 'v50-'.
import { stub } from '../s46/base.js';

export const V50_SCENES = {
  'v50-advice': stub('v50-advice'),             // Task 1: the advice sheet open over a city with several problems ranked
  'v50-house-step': stub('v50-house-step'),     // Task 2: a house sheet with its next step and cost at the top
  'v50-layers': stub('v50-layers'),             // Task 3: the home progress, goods supply and workers layers
  'v50-areas': stub('v50-areas'),               // Task 4: Build another, and a farm area with its total before confirm
  'v50-roads': stub('v50-roads'),               // Task 5: a routed road round a hill with a bridge, its cost before confirm
  'v50-grand': stub('v50-grand'),               // Task 7: a grand district with a Villa and an Estate
};
export const VERSION50_SCENES = Object.keys(V50_SCENES);
