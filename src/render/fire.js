// Flames and smoke (spec 5.4), drawn from the world's fire state (b.fire, src/sim/fire.js), so they survive a reload.
// Stage 3 contract: Track C implements the STUB. createUI passes it to renderFrame as opts.fire, which calls it once a
// frame in art px (the camera's origin set) after the depth-sorted sprites and before the effects and overlays.
//
// STUB. Draws every burning building in range: a blaze as one small flame on the roof, a fire as three larger flames and
// a column of soft smoke puffs; shape changes at 2 Hz or less, never a brightness flash or a saturated-red flash. Under
// reduced motion: a still flame icon and the word "Burning". now: the frame's time in ms (the real clock).
export function drawFires(g, world, range, now, { reducedMotion = false } = {}) {}
