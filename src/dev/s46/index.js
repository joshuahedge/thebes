// Stage 4.6 (Track 0): every track's dev scenes, joined for src/dev/scenes.js (devScene). A track adds and fills scenes in its own file
// (map.js, river.js, court.js, armies.js, wonders.js, ux.js), never here or in scenes.js. Names start with 's46-'.
import { MAP_SCENES } from './map.js';
import { RIVER_SCENES } from './river.js';
import { COURT_SCENES } from './court.js';
import { ARMY_SCENES } from './armies.js';
import { WONDER_SCENES } from './wonders.js';
import { UX_SCENES } from './ux.js';

export const S46_SCENES = { ...MAP_SCENES, ...RIVER_SCENES, ...COURT_SCENES, ...ARMY_SCENES, ...WONDER_SCENES, ...UX_SCENES };
export const STAGE46_SCENES = Object.keys(S46_SCENES);
