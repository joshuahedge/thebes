// Version 6.0 (Track 0): the dev scenes, run through window.__thebes.devScene(name, options) (src/dev/scenes.js joins them). Open
// /?skipTitle=1&nosw=1&seed=11&sample=1 first (v60-title: /?nosw=1). Each scene lives in its track's own file (reign.js: A; hazards.js:
// B1; battle.js: B2; largePlot.js: C; title.js: D1; lesson.js: D2), which the track refines; this file only joins them (Track 0 owns it).
// Names start with 'v60-'.
import { demandScene, greatWorkScene } from './reign.js';
import { plagueScene, droughtScene, locustsScene, raidBurnScene } from './hazards.js';
import { battleScene } from './battle.js';
import { largePlotScene } from './largePlot.js';
import { titleScene, hugeScene } from './title.js';
import { lessonScene } from './lesson.js';

export const V60_SCENES = {
  'v60-demand': demandScene,          // Track A: a court demand offered, its reward and failure cost before it is accepted
  'v60-greatwork': greatWorkScene,    // Track A: the final great work under way
  'v60-plague': plagueScene,          // Track B1: plague in a crowded home, on the Health layer
  'v60-drought': droughtScene,        // Track B1: a low Nile warned months ahead
  'v60-locusts': locustsScene,        // Track B1: locusts warned over a band of farms
  'v60-raid-burn': raidBurnScene,     // Track B1: raiders through: burned, wrecked, looted
  'v60-battle': battleScene,          // Track B2: soldiers and raiders clashing, arrows, smoke, the chieftain's banner
  'v60-largeplot': largePlotScene,    // Track C: a Large plot, empty with its checklist, then lived in
  'v60-title': titleScene,            // Track D1: the tidier title card
  'v60-huge': hugeScene,              // Track D1: a Huge (112) map
  'v60-lesson': lessonScene,          // Track D2: the guided first city at a step
};
export const VERSION60_SCENES = Object.keys(V60_SCENES);
