// Version 7.0 (Track 0): the dev scenes, run through window.__thebes.devScene(name, options) (src/dev/scenes.js joins them). Open
// /?skipTitle=1&nosw=1&seed=11&sample=1 first. Each scene lives in its track's own file (trade.js: T; cityEvents.js: E; seasons.js: S;
// adviceFixes.js: A), which the track refines; this file only joins them (Track 0 owns it). Names start with 'v70-'.
import { tradeScene, quayScene, boatScene } from './trade.js';
import { eventScene, festivalScene } from './cityEvents.js';
import { seasonFloodScene, seasonGrowingScene, seasonHarvestScene, nightScene } from './seasons.js';
import { adviceTowerScene, strandedScene } from './adviceFixes.js';

export const V70_SCENES = {
  'v70-trade': tradeScene,                    // Track T: the Trade sheet, one card per route
  'v70-quay': quayScene,                      // Track T: a Quay on the river bank
  'v70-boat': boatScene,                      // Track T: a boat sailing in to the Quay
  'v70-event': eventScene,                    // Track E: an event's card with its choices
  'v70-festival': festivalScene,              // Track E: the Festival of Opet, with and without incense
  'v70-season-flood': seasonFloodScene,       // Track S: the land in the flood season
  'v70-season-growing': seasonGrowingScene,   // Track S: the land in the growing season
  'v70-season-harvest': seasonHarvestScene,   // Track S: the land at harvest
  'v70-night': nightScene,                    // Track S: night, the lamps lit
  'v70-advice-tower': adviceTowerScene,       // Track A: Advice's tower where it defends the first target
  'v70-stranded': strandedScene,              // Track A: Advice's storehouse near the bazaar
};
export const VERSION70_SCENES = Object.keys(V70_SCENES);
