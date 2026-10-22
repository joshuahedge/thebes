// Version 6.0 Track B2: what a battle costs to draw. A stress city (src/dev/sampleCity.js buildStressCity: every lot built, 60 days run) on a map of the
// given size, drawn as it is and, in step with it frame for frame, the same city with a battle on it: a band of eighteen with its chieftain among
// soldiers, tower shots, a dozen buildings alight, shells and smouldering rubble, fresh strikes, wrecks and loot, and blows landing. The cost is
// renderFrame's own time (renderer.stats.ms: the whole frame, every layer, with the walkers, fire, scorch, unit marks and effects wired as createUI wires
// them); the two cities' frames alternate, so a machine that drifts slower or faster moves both alike. measureBattle is shared by the budget test and
// by hand (import it in a page and read the numbers).
import { createWorld, allBuildings } from '../../../src/sim/world.js';
import { buildStressCity } from '../../../src/dev/sampleCity.js';
import { createRenderer } from '../../../src/render/renderer.js';
import { createCamera, visibleTileRange } from '../../../src/render/camera.js';
import { createSpriteCache } from '../../../src/render/spriteCache.js';
import { walkersAt } from '../../../src/render/walkers.js';
import { unitsAt, drawUnitMarks } from '../../../src/render/units.js';
import { drawFires, drawScorch } from '../../../src/render/fire.js';
import { createEffects } from '../../../src/render/effects.js';
import { burnBuilding, canBurn } from '../../../src/sim/fire.js';
import { makeCanvas } from '../../helpers/canvas.js';

export function stressWorld(size) {
  const world = createWorld({ seed: 3, size });
  return buildStressCity(world);
}

// The battle, on the world: a dozen buildings alight (half blazes, half fires), ten burned or wrecked down to shells, eighteen raiders (a chieftain, archers,
// chariots), twelve soldiers out, four shots, and fresh effects. Returns { hit() }: land a blow on some units (so sparks show).
export function stageBattle(world, fx, now) {
  const mid = world.size >> 1;
  const all = allBuildings(world).filter((b) => b.type !== 'house' && b.type !== 'rubble');
  const near = (b) => Math.hypot(b.x - mid, b.y - mid);
  const sorted = all.sort((p, q) => near(p) - near(q) || p.id - q.id);
  const barracks = sorted[0];
  const burning = sorted.filter((b) => canBurn(b)).slice(0, 12);
  burning.forEach((b, i) => { b.fire = i % 2 ? { stage: 'fire', days: 2, left: 9 } : { stage: 'blaze', days: 1, need: 2, fought: 0 }; });
  const burnt = sorted.filter((b) => canBurn(b) && !b.fire).slice(0, 10);
  burnt.forEach((b, i) => {
    const ids = burnBuilding(world, b.id);
    for (const id of ids) { world.buildings[id].was.day = world.day - 3; if (i % 2) world.buildings[id].was.cause = 'wreck'; }
  });
  const raiders = [];
  for (let i = 0; i < 18; i++) raiders.push({ id: world.nextUnitId++, kind: i < 13 ? 'foot' : i < 17 ? 'archer' : 'chariot', x: mid + (i % 6) * 0.6, y: mid + Math.floor(i / 6) * 0.6, hp: 10, hit: i % 3 === 0, ...(i === 0 ? { chief: true, hp: 20 } : {}) });
  world.raid.active = {
    index: 3, entry: { x: 0, y: mid }, dir: 'west', size: 18, target: 'storehouse', day: world.day, phase: 'attack', targetId: null, struck: [], wait: 0, byTowers: 0, bySoldiers: 0, burned: 0, stolen: 0,
    raiders, x: mid, y: mid, blocked: null, towerIds: [], fires: [], burnedKinds: [], chiefs: [{ id: raiders[0].id, band: 0 }],
    shots: [0, 1, 2, 3].map((k) => ({ from: { x: mid - 3 + k, y: mid - 2 }, to: { x: raiders[k + 1].x, y: raiders[k + 1].y }, by: k % 2 ? 'tower' : 'archer' })),
  };
  world.soldiers = [];
  for (let i = 0; i < 12; i++) world.soldiers.push({ id: world.nextUnitId++, kind: 'soldier', barracks: barracks.id, x: mid + (i % 6) * 0.5 - 1, y: mid + Math.floor(i / 6) * 0.5 + 0.8, hp: 12, hit: i % 4 === 0, task: 'out' });
  fx.strike(mid, mid, now); fx.strike(mid + 2, mid + 1, now); fx.wreck(mid - 2, mid - 1, 2, 2, now); fx.loot(mid + 1, mid - 2, { grain: 20, pottery: 7 }, now); fx.loot(mid - 3, mid + 2, { clay: 12 }, now);
  return { hit() { for (const u of raiders.slice(0, 4)) u.hp = Math.max(1, u.hp - 1); for (const s of world.soldiers.slice(0, 2)) s.hp -= 1; } };
}

const median = (a) => { const s = [...a].sort((p, q) => p - q); return s[s.length >> 1]; };
const mean = (a) => a.reduce((n, v) => n + v, 0) / a.length;

// One city drawn through createUI's own opts: a renderer of its own (so each has its own caches), a camera on the middle of the map.
function rigFor(world, { zoom, view, dpr, motion }) {
  const canvas = makeCanvas(view[0] * dpr, view[1] * dpr);
  const renderer = createRenderer({ canvas, dpr, maxBakesPerFrame: Infinity, spriteCache: createSpriteCache() });
  const cam = createCamera({ x: world.size / 2, y: world.size / 2, zoom });
  const fx = createEffects({ motionLevel: motion });
  const v = { width: view[0], height: view[1] };
  const frame = (i, t0) => {
    const now = t0 + i * 17, timeDays = world.day + (i % 60) / 60, range = visibleTileRange(cam, v, world.size);
    return renderer.renderFrame(world, cam, {
      view: v, now, effects: fx, rising: fx.risingIds(now, world),
      walkers: [...walkersAt(world, timeDays, range), ...unitsAt(world, timeDays, range, { motion, now })],
      scorch: (g, r) => drawScorch(g, world, r),
      fire: (g, r) => drawFires(g, world, r, now, { motion }),
      units: (g, r) => drawUnitMarks(g, world, r, timeDays, now, { motion }),
    });
  };
  return { world, fx, frame };
}

// measureBattle(size, { zoom, view: [w, h], dpr, motion, frames, world }) ->
//   { size, zoom, motion, dpr, view, frames, base: { median, mean }, battle: { median, mean }, delta (median), deltaMean, objects, sprites }
// `world` is a stress city already built (it is copied, so one build serves several measures).
export function measureBattle(size, { zoom = 1, view = [1280, 800], dpr = 1, motion = 'full', frames = 60, world = null } = {}) {
  const built = world || stressWorld(size);
  const a = rigFor(structuredClone(built), { zoom, view, dpr, motion }), b = rigFor(structuredClone(built), { zoom, view, dpr, motion });
  const battle = stageBattle(b.world, b.fx, 5000);
  for (let i = 0; i < 14; i++) { a.frame(i * 8, 100); b.frame(i * 8, 5000); }   // warm the chunks and every sprite (both poses, the shells, each flame shape)
  battle.hit();
  const base = [], after = [];
  let last = null;
  for (let i = 0; i < frames; i++) {                                              // alternate, so drift moves both alike
    base.push(a.frame(i, 1000).ms);
    last = b.frame(i, 5000);
    after.push(last.ms);
  }
  return {
    size, zoom, motion, dpr, view, frames,
    base: { median: median(base), mean: mean(base) }, battle: { median: median(after), mean: mean(after) },
    delta: median(after) - median(base), deltaMean: mean(after) - mean(base), objects: last.objects, sprites: last.sprites,
  };
}
