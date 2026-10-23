// Version 7.0, Track S: the interface of seasons, light and sound (rulings 930-959), the seam (src/ui/s46/seam.js shape) createV70Seams
// makes once a game. Track S fills what it needs here (sound cues from the sim's events: onEvents); the top bar's season (src/ui/hud.js) and
// the Settings rows "Day and night", Music and Effects volumes (src/ui/menu.js's Settings part; the keys dayNight and effectsVolume are in
// src/ui/settings.js) are Track S's parts of those files. Track S owns this file.
import { seamBase } from '../s46/seam.js';

export const createSeasonsUi = () => seamBase();
