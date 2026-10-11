// Raiders and soldiers (spec 5.4). Stage 3 contract: Track C implements the STUBs. Units are depth-sorted with the
// walkers: createUI appends unitsAt's entries to the walkers list it hands renderFrame, which draws each as the figure
// slot fig.<kind> (src/render/art/figures.js gains 'raider' and 'soldier'). Health bars and arrows are drawn on top by
// drawUnitMarks, which renderFrame calls as opts.units after the sprites (art px).

// Unit ids in the walkers list are UNIT_ID_BASE + the unit's id, so they never meet a walker's (a building id).
export const UNIT_ID_BASE = 100000;

// STUB. The units in range as walker entries: { id: UNIT_ID_BASE + unit id, kind: 'raider' | 'soldier', x, y, dir },
// moving smoothly between days (timeDays is the day plus the frame's fraction). Raiders come from world.raid.active,
// soldiers from world.soldiers.
export function unitsAt(world, timeDays, range = null) {
  return [];
}

// STUB. Health bars over units that have been hit, and the day's tower arrows (world.raid.active.shots) as thin strokes
// that fly for 0.3 s, or a still line for a moment under reduced motion.
export function drawUnitMarks(g, world, range, timeDays, now, { reducedMotion = false } = {}) {}
