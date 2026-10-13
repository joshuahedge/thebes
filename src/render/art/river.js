// Stage 4.6, the River track's art (Track 0 made it empty; the River track owns this file): the nilometer, the hunting lodge, the
// fishing wharf and its boat, and the animals' figure slots (fig.gazelle, fig.ostrich, fig.ibis, ...), as registry entries
// (src/render/art/registry.js describes the shape). Joined into ART by src/render/art/s46.js.
export const RIVER_ART = {};

// The slot a River building shows when it is not just its type (a wharf facing its water, a lodge with game hung), else null.
export const riverSlot = (b, world) => null;
