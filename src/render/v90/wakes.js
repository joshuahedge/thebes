// Version 9.0, Track V (V8): a wake behind a boat under way: a V of two thin pale lines opening back from its stern over the water, with a faint
// darker line inside each, drawn in the ground layer under the boat (render/trade.js drawTradeGround, render/ferries.js ferryGround, and the rare
// felucca in render/ambient.js). (vx, vy) is the boat's heading in tiles; the wake trails the other way. Its lines shimmer a little (a slow sway of
// their ends), never a flash.
import { p } from '../iso.js';
import { TERRAIN } from '../art/palette.js';
import { spend, v90Off } from './dropper.js';

export const WAKE = { length: 11, spread: 0.42, stern: 4, alpha: 0.6, swayMs: 1600 };
const clock = () => (typeof performance !== 'undefined' ? performance.now() : 0);

export function drawWake(g, x, y, vx, vy, now = 0, scale = 1) {
  if (v90Off('wake')) return;                                                // the dev switch only: wakes are never shed
  const started = clock();
  const h = p(x + vx, y + vy), o = p(x, y), dx = h[0] - o[0], dy = h[1] - o[1], d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d, nx = -uy, ny = ux;                         // ahead, and across, on screen
  const s = [o[0] - ux * WAKE.stern * scale, o[1] - uy * WAKE.stern * scale + 0.6];
  const L = WAKE.length * scale, sway = 0.6 * Math.sin(now / WAKE.swayMs * Math.PI * 2);
  const end = (side) => [s[0] - ux * L + side * nx * L * WAKE.spread, s[1] - uy * L * 0.6 + side * ny * L * WAKE.spread * 0.5 + sway];
  const a = end(1), b = end(-1);
  g.stroke([['M', a], ['L', s], ['L', b]], TERRAIN.foam, 0.8, WAKE.alpha);
  g.stroke([['M', [a[0] * 0.8 + s[0] * 0.2, a[1] * 0.8 + s[1] * 0.2 + 0.5]], ['L', [s[0], s[1] + 0.6]], ['L', [b[0] * 0.8 + s[0] * 0.2, b[1] * 0.8 + s[1] * 0.2 + 0.5]]], TERRAIN.ripple, 0.5, WAKE.alpha * 0.6);
  spend(clock() - started);
}
