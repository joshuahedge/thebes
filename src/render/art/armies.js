// Stage 4.6, the Armies track's art (Track 0 made it empty; the Armies track owns this file): the archery range, the stables, and
// the unit kinds' figure slots (fig.archer, fig.chariot, fig.enemy_archer, ...), as registry entries (src/render/art/registry.js
// describes the shape). Joined into ART by src/render/art/s46.js.
export const ARMY_ART = {};

// The slot an Armies building shows when it is not just its type, else null.
export const armySlot = (b, world) => null;
