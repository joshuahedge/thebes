// Stage 4.6 (Track 0): the tracks' art joined for the registry (src/render/art/registry.js spreads S46_ART into ART and asks s46Slot
// first in slotFor). A track edits only its own art file (river.js, armies.js); the Wonders track draws its kinds and styles in
// monuments.js, which it owns.
import { RIVER_ART, riverSlot } from './river.js';
import { ARMY_ART, armySlot } from './armies.js';

export const S46_ART = { ...RIVER_ART, ...ARMY_ART };

// The slot a Stage 4.6 building shows, or null to let slotFor go on as before.
export const s46Slot = (b, world) => riverSlot(b, world) || armySlot(b, world);
