// Task 3a (ruling 312): clay ground lies along the banks (40-90 tiles a map); a clay pit must stand on it; the Ground overlay
// shows it; its card and its refusals say so in the sim's own numbers.
import { describe, it, expect } from '../harness.js';
import { generateMap } from '../../src/sim/mapgen.js';
import { T } from '../../src/sim/terrain.js';
import { idx, inBounds } from '../../src/sim/grid.js';
import { canPlace, checkTiles, conditionsFor, place } from '../../src/sim/commands.js';
import { createWorld } from '../../src/sim/world.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { AUTO_OVERLAY } from '../../src/data/ui.js';
import { groundTiles, roomTiles } from '../../src/render/overlays.js';
import { createPlacement, nearestFit } from '../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { cardInfo } from '../../src/ui/cards.js';
import { conditionText, CONDITION_TEXT, OVERLAY_LEGEND, reasonText } from '../../src/ui/text.js';
import { makeTestWorld, setRoad, layClay } from '../helpers/testWorld.js';
import { uiWorld } from '../helpers/uiWorld.js';

const SEEDS = Array.from({ length: 30 }, (_, k) => k + 1);

// The clay tiles of a map, grouped into 8-connected stretches.
function stretches(m) {
  const seen = new Set(), out = [];
  for (let i = 0; i < m.terrain.length; i++) {
    if (m.terrain[i] !== T.CLAY || seen.has(i)) continue;
    const comp = [i];
    seen.add(i);
    for (let k = 0; k < comp.length; k++) {
      const x = comp[k] % m.size, y = (comp[k] - x) / m.size;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!inBounds(m.size, x + dx, y + dy)) continue;
        const n = idx(m.size, x + dx, y + dy);
        if (m.terrain[n] === T.CLAY && !seen.has(n)) { seen.add(n); comp.push(n); }
      }
    }
    out.push(comp);
  }
  return out;
}
const nearWater = (m, i, r) => {
  const x = i % m.size, y = (i - x) / m.size;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (inBounds(m.size, x + dx, y + dy) && m.terrain[idx(m.size, x + dx, y + dy)] === T.WATER) return true;
  return false;
};

describe('s45 clay (map)', () => {
  it('lays 40-90 clay tiles along the banks of every map, in stretches of at least 4, none off the water', () => {
    for (const seed of SEEDS) {
      const m = generateMap(seed);
      const clay = m.terrain.filter((t) => t === T.CLAY).length;
      expect([seed, clay >= 40 && clay <= 90]).toEqual([seed, true]);
      for (const comp of stretches(m)) expect([seed, comp.length >= 4]).toEqual([seed, true]);
      for (let i = 0; i < m.terrain.length; i++) if (m.terrain[i] === T.CLAY) expect([seed, i, nearWater(m, i, 3)]).toEqual([seed, i, true]);
    }
  });
  it('is deterministic for a seed, and leaves the start road and the water alone', () => {
    expect(generateMap(9).terrain).toEqual(generateMap(9).terrain);
    for (const seed of SEEDS) {
      const m = generateMap(seed);
      for (const [x, y] of m.startRoad) expect(m.terrain[idx(m.size, x, y)] === T.WATER).toBe(false);
    }
  });
  it('keeps clay buildable dry ground: a house goes on it, and it is not fertile', () => {
    const w = makeTestWorld({ clay: [[4, 4, 4, 4]], gold: 1000 });
    setRoad(w, 0, 3, 10, 3);
    expect(canPlace(w, 'house', 5, 5).ok).toBe(true);
    expect(canPlace(w, 'farm_grain', 4, 4).reason).toBe('needs_fertile');
  });
});

describe('s45 clay (the clay pit)', () => {
  const pit = (w, x, y) => canPlace(w, 'clay_pit', x, y, { roadLater: true });
  it('stands on clay: refused elsewhere with the sim own reason, placed where 2 of its 4 tiles are clay (Stage 4.6, ruling 331; was all four)', () => {
    const w = makeTestWorld({ clay: [[10, 10, 3, 3]], gold: 1000 });
    w.milestone = 'town';
    expect(BUILDINGS.clay_pit.terrain).toBe('clay');
    expect(pit(w, 10, 10).ok).toBe(true);
    expect(pit(w, 11, 11).ok).toBe(true);
    expect(pit(w, 20, 20)).toEqual({ ok: false, reason: 'needs_clay', warnings: [] });
    expect(pit(w, 2, 2).reason).toBe('needs_clay');                          // fertile land is not clay
    expect(pit(w, 12, 10).ok).toBe(true);                                    // half on clay, half off: 2 of 4 is enough
    expect(pit(w, 12, 12).reason).toBe('needs_clay');                        // 1 of 4 is not
    expect(checkTiles(w, 'clay_pit', 12, 12)).toBe('needs_clay');
    expect(reasonText('needs_clay')).toBe('Needs clay ground');
    layClay(w, 20, 20);
    expect(pit(w, 20, 20).ok).toBe(true);                                   // lay the ground the other way: it goes
    expect(place(w, 'clay_pit', 10, 10, { roadLater: true }).ok).toBe(true);
    expect(pit(w, 11, 11).reason).toBe('occupied');
  });
  it('words its ground chip from the sim: "Clay ground" when met, "Clay ground: 2 of 4 tiles" when two of four are clay, and why not when fewer', () => {
    const w = makeTestWorld({ clay: [[10, 10, 3, 3]], gold: 1000 });
    w.milestone = 'town';
    const ground = (x, y) => conditionsFor(w, 'clay_pit', x, y, { roadLater: true }).conditions.find((c) => c.key === 'ground');
    const met = ground(10, 10);
    expect([met.state, met.terrain, met.fit, met.of]).toEqual(['met', 'clay', 4, 4]);
    expect(conditionText(met, 'clay_pit')).toBe(CONDITION_TEXT.terrain('clay'));
    expect(conditionText(met, 'clay_pit')).toBe('Clay ground');
    const half = ground(12, 10);
    expect([half.state, half.reason, half.terrain, half.fit, half.of, half.need]).toEqual(['met', null, 'clay', 2, 4, 2]);
    expect(conditionText(half, 'clay_pit')).toBe(`Clay ground: ${half.fit} of ${half.of} tiles`);
    const one = ground(12, 12);
    expect([one.state, one.reason, one.fit, conditionText(one, 'clay_pit')]).toEqual(['cant', 'needs_clay', 1, 'Needs 2 of 4 tiles on clay (this spot has 1)']);
    const none = ground(20, 20);
    expect([none.fit, conditionText(none, 'clay_pit')]).toEqual([0, 'Needs 2 of 4 tiles on clay (this spot has 0)']);
  });
  it('says "Clay ground" on its card, and nothing on a card with no terrain', () => {
    const w = makeTestWorld({ gold: 1000 });
    expect(cardInfo(w, 'clay_pit').terrainText).toBe('Clay ground, along the riverbanks');   // Stage 4.6 (ruling 331): where clay lies
    expect(CONDITION_TEXT.terrainLine('clay_pit')).toBe('On clay ground');
    expect(['potter', 'storehouse', 'well'].map((t) => cardInfo(w, t).terrainText)).toEqual(['', '', '']);
  });
});

describe('s45 clay (the Ground overlay and the pick)', () => {
  it('lists free clay tiles beside fertile and rocky, leaving out built tiles, and finds room for a whole pit', () => {
    const w = makeTestWorld({ size: 16, clay: [[4, 4, 3, 3], [10, 10, 1, 3]] });
    expect(groundTiles(w).clay.length).toBe(9 + 3);
    setRoad(w, 4, 4, 6, 4);
    w.wall[idx(w.size, 6, 6)] = 5;
    expect(groundTiles(w).clay.length).toBe(12 - 3 - 1);
    const room = roomTiles(w, 'clay_pit');
    expect([room.size, room.has(idx(w.size, 4, 5)), room.has(idx(w.size, 10, 10))]).toEqual([4, true, false]);   // the strip has no room for 2 x 2
    expect(groundTiles(w, { x0: 10, y0: 10, x1: 10, y1: 10 }).clay).toEqual([[10, 10]]);
  });
  it('has a clay key in the legend, turns Ground on when a clay pit is picked, and lands the ghost on the nearest free clay', () => {
    expect(OVERLAY_LEGEND.ground.length).toBe(3);
    expect(OVERLAY_LEGEND.ground[2]).toContain('Clay');
    expect(AUTO_OVERLAY.clay_pit).toBe('ground');
    const store = createStore(INITIAL_UI_STATE);
    const pl = createPlacement({ world: uiWorld(), store });
    pl.start({ kind: 'building', type: 'clay_pit' }, { x: 20, y: 9 });
    expect(store.get().overlay).toBe('ground');
    const w = makeTestWorld({ clay: [[20, 20, 3, 3]], gold: 1000 });
    w.milestone = 'town';
    expect(nearestFit(w, { kind: 'building', type: 'clay_pit' }, 14, 20)).toEqual({ x: 19, y: 20 });   // 2 of 4 tiles on clay is enough (Stage 4.6): one column in
    const bare = makeTestWorld({ gold: 1000 });
    bare.milestone = 'town';
    expect(nearestFit(bare, { kind: 'building', type: 'clay_pit' }, 14, 20)).toEqual({ x: 14, y: 20 });   // no clay at all: the snapped point, so the bar says why
  });
});

describe('s45 clay (a new city)', () => {
  it('starts a classic city with its map clay on the banks, and room for a pit', () => {
    const w = createWorld({ seed: 3 });
    const m = generateMap(3);
    expect(w.terrain.filter((t) => t === T.CLAY).length).toBe(m.terrain.filter((t) => t === T.CLAY).length);
    expect(roomTiles(w, 'clay_pit').size).toBeGreaterThan(0);
  });
});
