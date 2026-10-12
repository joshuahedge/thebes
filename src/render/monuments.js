// Monuments drawn live (spec 5.7, rulings 182, 183, 209, 221, 246): sites course by course (blocks fading in, the ramp,
// sleds and gangs on game time, the stockpile, stakes and cords), finished monuments (casing, the gilded tip, the gold
// capstone and its one slow shine under Full), the course-done dust or still outline, and the see-through fade. Stage 4
// contract: Track 0 fixed the name and the renderer hook; Track B implements it and owns this file.
//
// The renderer (src/render/renderer.js) never caches a slot whose art entry has live: true (the seven monument kinds,
// src/render/art/stage4.js). In its depth-sorted pass it calls opts.live(g, o) for such an object, in art px with the art
// origin set (as opts.fire is), where o is { key, id, slot, def, x, y, b } and b the building. createUI passes
//   live: (g, o) => drawMonument(g, world, o.b, { now, timeDays, motion, ghost, selectedId })
// now: the frame's real-clock ms; timeDays: the sim's day plus the fraction since the last tick (gangs move on game time);
// motion: settings.motionLevel(); ghost: the placing ghost { type, x, y, w, d } or null; selectedId: the selected
// building's id or null (the monument fades to MONUMENT_PLACING.fadeBehind when either lies behind it).
// Budget: three sites within 1 ms a frame on the stress city (spec 5.7).
//
// STUB: draws the kind's placeholder (its art slot's draw at the building's place), whole and still.
import { ART } from './art/registry.js';

export function drawMonument(g, world, b, { now = 0, timeDays = 0, motion = 'full', ghost = null, selectedId = null } = {}) {
  const def = ART[b.type];
  if (def && def.draw) def.draw(g, b.x, b.y);
}
