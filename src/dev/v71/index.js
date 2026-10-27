// Version 7.1: the dev scenes, run through window.__thebes.devScene(name, options) (src/dev/scenes.js joins them). Each track keeps its scenes in its own file here;
// names start with 'v71-'. Track F: ferries.
import { ferryLayingScene, ferryWorkingScene, ferryShownScene } from './ferries.js';

export const V71_SCENES = {
  'v71-ferry-laying': ferryLayingScene,     // Track F: the Ferry tool's line across a wide river, with its preview and bar
  'v71-ferry-working': ferryWorkingScene,   // Track F: a crossing laid and staffed, its dashed line and boat (sheet: true opens a landing's sheet)
  'v71-ferry-shown': ferryShownScene,       // Version 8.2.1: a real city's crossings shown by the Ferry tool (pick: true, built: true)
};
export const VERSION71_SCENES = Object.keys(V71_SCENES);
