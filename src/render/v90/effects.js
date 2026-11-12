// Version 9.0 "Dynasty" (wave 0 seam, ruling 1563; Track V owns src/render/v90/): the new animations and visual effects. renderFrame
// (src/render/renderer.js) calls effectsV90 once a frame, right after the effects pass and before the overlays, in art px with the art origin
// set: g is the frame's draw helper (makeDraw), view the canvas's CSS size, and opts renderFrame's own options with the frame's tile range and
// camera added ({ ...opts, range, cam }). Drawing only: it never writes the world (ruling 1603).
//
// Track V's layers here, above the sprites and under the overlays (so a lesson's ring, a ghost and the markers stay on top; the lesson's card and
// pointer are the page's, above the canvas): the beaten raid's moment (V5), dust on the move (V6), a fire fought (V7), the festival's lamps and
// petals and the Victory's pennants (V9), and the weather (V10). The wakes (V8) and the river's flow (V11) are ground layers (render/trade.js,
// ferries.js, ambient.js), drawn under the sprites; the workshops' smoke (V4) is ambient's late layer; and a building's scaffold (V3) is drawn by
// the renderer in the building's own depth slot (ruling 1612). Every layer is timed into V's own dropper (src/render/v90/dropper.js, ruling 1602).
import { drawRaidMoment } from './raidMoment.js';
import { drawDust, drawFireFought, drawFestive, drawWeather } from './layers.js';
import { v90Dropper, v90Off, takeSpent } from './dropper.js';
import { drawSweep } from '../v93/sweep.js';

const clock = () => (typeof performance !== 'undefined' ? performance.now() : 0);

// The layers, with `off(kind)` saying what the dropper has shed (a kind in AMBIENT.v90DropOrder). The budget test calls this with nothing shed.
// A bare frame (no clock given: a test's or a preview's renderFrame) draws only what the world holds, the same every time: no weather, and the rest at
// time 0. The game's frame always gives its clock (createUI's render).
export function drawV90(g, world, opts = {}, off = () => false) {
  const range = opts.range || null, clocked = opts.now !== undefined, now = clocked ? opts.now : 0;
  const walkers = opts.walkers || [];
  if (clocked && !off('weather')) drawWeather(g, world, range, now, opts.motion || 'full');   // V10 first, so the rest lie over the clouds' shade (Version 10.0, Track L: the motion, for the shimmer)
  if (!off('dust')) drawDust(g, world, walkers, range, now);
  if (!off('fire')) drawFireFought(g, world, range, now);
  if (!off('festival')) drawFestive(g, world, walkers, range, now);
  if (!off('moment')) drawRaidMoment(g, world, range, now);
  if (clocked) drawSweep(g, world, now);                                    // Version 9.3 (Track M): the level-up ring, shed before any of the above
}

export function effectsV90(g, view, world, opts = {}) {
  const started = clock();
  drawV90(g, world, opts, v90Off);
  v90Dropper.account(takeSpent() + clock() - started, opts.now === undefined ? started : opts.now);
}
