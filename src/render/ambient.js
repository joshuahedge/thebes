// Ambient life (spec 5.6): water glints, bank ripples, reed and tree sway, crop ripple, smoke, and rare birds, feluccas
// and ducks, on the real clock, out of step by tile hash, over the baked terrain for visible tiles only. Numbers in
// src/data/ambient.js. Stage 3 contract: Track C implements the STUBs. createUI makes one per game and passes its draw to
// renderFrame as opts.ambient, which calls it once a frame in art px right after the terrain chunks.
import { AMBIENT } from '../data/ambient.js';

// The idle frame rate (spec 5.6): paused, with no input for idleAfterMs, frames are capped at fpsCap. createUI notes every
// pointer, key and wheel input and the game loop asks allow(now, paused) before drawing a frame (it still runs the sim).
// STUB: every frame is allowed.
export function createFrameGate({ idleAfterMs = AMBIENT.idleAfterMs, fpsCap = AMBIENT.idleFpsCap } = {}) {
  return {
    noteInput(now) {},
    allow(now, paused) { return true; },
  };
}
//
// enabled() says whether to draw at all: the Ambient motion setting and not reduced motion (createUI decides).
export function createAmbient({ enabled = () => true } = {}) {
  return {
    // STUB. Draws the ambient layer for the tiles in range at time now (ms), within the frame budget, dropping rare life,
    // then smoke, then sway when over it (the water stays). Draws nothing while enabled() is false.
    draw(g, world, range, now) {},
    // What the last frame drew and cost: { ms, dropped } (dropped: the kinds left out to keep the budget).
    stats: { ms: 0, dropped: [] },
    // STUB. Track C returns a lean slot palm.l-4..palm.l4 / acacia.l-4..acacia.l4 for the tree at (x, y) with base slot slot at
    // time now (ms); renderFrame asks for it for every decor tree through opts.treeSlot. The stub returns slot unchanged.
    treeSlot(world, x, y, slot, now) { return slot; },
  };
}
