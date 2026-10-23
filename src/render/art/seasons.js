// Version 7.0, Track S: the seasons' art states (rulings 930-959): fields, palms and the river by season, if they need slots of their own
// (looks only). Track 0 (contract, docs/superpowers/notes/2026-10-23-version-7-0-contract.md) left it empty; Track S owns this file
// (src/render/art/v70.js joins it into the registry).
//   SEASON_ART              slot -> art entry (src/render/art/registry.js's shape)
//   seasonSlot(b, world)    the season's slot for a building, or null to let slotFor go on as before (asked after Track T's)
export const SEASON_ART = {};
export const seasonSlot = () => null;
