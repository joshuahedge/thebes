// Version 9.0 Track V: every new effect live on a stress city, for the budget test and the frame-time table. On the world (a copy, never saved):
// a festival on (every working temple's procession out), a Victory (a beaten raid's 90 days), Shemu's hot months, night with the lamps lit, a dozen
// buildings alight beside staffed firehouses, a beaten raid's moment at the map's middle with a fallen chieftain, eight scaffolds (the cap), and a
// band of eighteen raiders marching in; the walkers are the frame's own (walkers, units, carts), as createUI joins them.
import { allBuildings } from '../../../src/sim/world.js';
import { SEASONS } from '../../../src/data/tips.js';
import { DAYS_PER_MONTH } from '../../../src/sim/time.js';
import { LIGHT } from '../../../src/data/seasons.js';
import { setLightClock, drawLight } from '../../../src/render/light.js';
import { canBurn } from '../../../src/sim/fire.js';
import { noteFrameTime } from '../../../src/render/v90/clock.js';
import { noteUpgrade } from '../../../src/render/v90/scaffold.js';
import { startMoment } from '../../../src/render/v90/moment.js';
import { walkersAt } from '../../../src/render/walkers.js';
import { unitsAt } from '../../../src/render/units.js';
import { cartsAt } from '../../../src/render/carts.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { DEFAULT_SETTINGS } from '../../../src/ui/settings.js';

export const NIGHT_MS = (LIGHT.day + LIGHT.dusk + LIGHT.night / 2) * LIGHT.cycleMs;

export function stageEffects(world) {
  const mid = world.size >> 1;
  world.day = SEASONS.indexOf('shemu') * DAYS_PER_MONTH + 6 + Math.floor(world.day / 360) * 360;
  world.danger.festivalDay = world.day;
  world.raid.last = { won: true, day: world.day, index: 1, dir: 'west' };
  world.raid.warning = null;
  const all = allBuildings(world);
  const near = (b) => Math.hypot(b.x - mid, b.y - mid);
  const byNear = all.filter((b) => b.type !== 'house' && b.type !== 'rubble').sort((p, q) => near(p) - near(q) || p.id - q.id);
  byNear.filter((b) => canBurn(b) && b.type !== 'firehouse').slice(0, 12).forEach((b, i) => { b.fire = i % 2 ? { stage: 'fire', days: 2, left: 9 } : { stage: 'blaze', days: 1, need: 2, fought: 0 }; });
  noteFrameTime(world, world.day + 0.3);
  for (const b of byNear.slice(0, 8)) noteUpgrade(world, b);
  startMoment(world, { day: world.day, x: mid + 0.5, y: mid + 0.5, dir: 'west', chiefsFell: 1, edge: { x: 0, y: mid + 0.5 }, chief: { x: mid + 1, y: mid + 1 } });
  const raiders = [];
  for (let i = 0; i < 18; i++) raiders.push({ id: world.nextUnitId++, kind: 'foot', x: mid - 8 + (i % 6) * 0.6, y: mid + Math.floor(i / 6) * 0.6, hp: 10 });
  world.raid.active = null;
  world.marching = raiders;                                                     // the test's own band, joined as walkers by walkersFor
  setLightClock(world, NIGHT_MS, 0);
  const c = makeCanvas(8, 8);
  drawLight(makeDraw(c.getContext('2d'), 1), world, { x0: 0, y0: 0, x1: 1, y1: 1 }, { ctx: c.getContext('2d'), W: 8, H: 8, ox: 0, oy: 0, dpr: 1 }, 0, 'full', DEFAULT_SETTINGS);   // the lamps lit
  return world;
}

// The frame's walkers, with the band walking west to east a little each frame (so it is not standing: its dust shows).
export function walkersFor(world, timeDays, range) {
  const band = (world.marching || []).map((u, i) => ({ id: 100000 + u.id, kind: 'raider', x: u.x + 0.5 + (timeDays % 1), y: u.y + 0.5, dir: 1 }));
  return [...walkersAt(world, timeDays, range), ...unitsAt(world, timeDays, range, { now: 0 }), ...band, ...cartsAt(world, timeDays, range)];
}
