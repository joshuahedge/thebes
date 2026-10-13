// The Stage 4.6 hooks (Track 0): the shared lists' joins, the terrain-fit rule every terrain-bound building follows, the style option
// on placing, the army's interface for the court, favour's raid hooks, the alert rank, the interface seams and the dev scenes. Every
// hook does nothing yet; these tests hold the shapes the tracks build on.
import { describe, it, expect } from '../../harness.js';
import { createWorld, makeBuilding, insertBuilding } from '../../../src/sim/world.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { FIRSTS } from '../../../src/data/firsts.js';
import { ACHIEVEMENTS } from '../../../src/data/achievements.js';
import { TIPS } from '../../../src/data/tips.js';
import { FOOD_GOODS, FOOD_SLOTS } from '../../../src/data/goods.js';
import { S46_GOODS, S46_BUILDINGS, S46_UNLOCKS, S46_DOCK, S46_FIRSTS, S46_ACHIEVEMENTS, S46_TIPS } from '../../../src/data/s46.js';
import { UNIT_KINDS, ENEMY_KINDS, MATCHUPS, SITUATIONS, matchup } from '../../../src/data/armies.js';
import { MONUMENT_KINDS } from '../../../src/data/monuments.js';
import { NEW_MONUMENT_KINDS, MONUMENT_STYLES } from '../../../src/data/wonders.js';
import { fitOf, fitReason, tileBound } from '../../../src/sim/fit.js';
import { canPlace, conditionsFor, place } from '../../../src/sim/commands.js';
import { unitsAtHome, unitsAway, sendUnits } from '../../../src/sim/armies.js';
import { favourRaidSize, favourTributeFactor } from '../../../src/sim/court.js';
import { raidSize, tributeFor } from '../../../src/sim/raids.js';
import { tickDay } from '../../../src/sim/clock.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { CRITICAL_RANK } from '../../../src/ui/alerts.js';
import { createS46Seams } from '../../../src/ui/s46/index.js';
import { STAGE46_SCENES } from '../../../src/dev/scenes.js';
import { s46Walkers } from '../../../src/render/s46.js';
import { ART } from '../../../src/render/art/registry.js';
import { makeTestWorld, layClay, setRoad } from '../../helpers/testWorld.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';

// A test-only BUILDINGS row, unlocked from the Village, removed after: the fit rule reads the row, so a track's row behaves as this one does.
function withRow(type, row, fn) {
  BUILDINGS[type] = row;
  MILESTONES[0].unlocks.push(type);
  try { return fn(); } finally { delete BUILDINGS[type]; MILESTONES[0].unlocks.splice(MILESTONES[0].unlocks.indexOf(type), 1); }
}

describe('s46 contract hooks', () => {
  it('joins the tracks\' rows into the shared lists (records and lists: each track adds its own rows, so the shapes are held, not the rows)', () => {
    expect([S46_GOODS, S46_BUILDINGS, S46_UNLOCKS, S46_DOCK].map((v) => Object.prototype.toString.call(v))).toEqual(Array(4).fill('[object Object]'));
    expect([S46_FIRSTS, S46_ACHIEVEMENTS, S46_TIPS].every(Array.isArray)).toBe(true);
    for (const t of Object.keys(S46_BUILDINGS)) expect(BUILDINGS[t]).toBe(S46_BUILDINGS[t]);
    for (const [m, types] of Object.entries(S46_UNLOCKS)) for (const t of types) expect(MILESTONES.find((x) => x.id === m).unlocks).toContain(t);
    for (const f of S46_FIRSTS) expect(FIRSTS).toContain(f);
    for (const a of S46_ACHIEVEMENTS) expect(ACHIEVEMENTS).toContain(a);
    for (const t of S46_TIPS) expect(TIPS).toContain(t);
    expect(FOOD_SLOTS).toEqual(['grain', 'figs', 'game', 'fish']);
    expect(FOOD_GOODS.every((g) => FOOD_SLOTS.includes(g))).toBe(true);
  });
  it('names the units, the enemies and the matchup table\'s shape (1 for anything not listed)', () => {
    expect(UNIT_KINDS).toEqual(['soldier', 'archer', 'chariot']);
    expect(ENEMY_KINDS).toEqual(['foot', 'archer', 'chariot', 'boat']);
    for (const [u, row] of Object.entries(MATCHUPS)) {
      expect(UNIT_KINDS).toContain(u);
      for (const [e, cell] of Object.entries(row)) { expect(ENEMY_KINDS).toContain(e); for (const s of Object.keys(cell)) expect(SITUATIONS).toContain(s); }
    }
    expect([matchup('archer', 'foot', 'wall'), matchup('archer', 'foot', 'melee'), matchup('chariot', 'archer', 'open'), matchup('soldier', 'boat', 'gate'), matchup('archer', 'chariot', 'open')]).toEqual([2, 0.5, 2, 1.5, 1]);
  });
  it('keeps the new monument ids clear of the old sphinx', () => {
    expect(NEW_MONUMENT_KINDS).toEqual(['great_sphinx', 'sun_temple', 'step_pyramid']);
    for (const k of NEW_MONUMENT_KINDS) expect(Object.hasOwn(BUILDINGS, k) && !BUILDINGS[k].monument).toBe(false);
    expect(BUILDINGS.sphinx.monument).toBe(undefined);
    expect(MONUMENT_KINDS.length).toBeGreaterThanOrEqual(7);
    expect(MONUMENT_STYLES.gilded).toEqual({ pick: true, goldFactor: 1.1, desirability: 1 });
  });

  it('judges a ground rule tile by tile while every tile must be on it (as before), and on the whole footprint with terrainMin', () => {
    const w = makeTestWorld({ size: 24, fertile: [] });
    w.milestone = 'capital';
    setRoad(w, 0, 6, 23, 6);
    layClay(w, 4, 4, 1, 2);                                                          // 2 of the pit's 4 tiles at (4, 4)
    expect(tileBound('clay_pit')).toBe(false);                                       // Stage 4.6 (ruling 331): the clay pit needs 2 of its 4 tiles
    expect(canPlace(w, 'clay_pit', 4, 4).ok).toBe(true);
    withRow('test_tilepit', { ...BUILDINGS.clay_pit, terrainMin: undefined }, () => {   // a pit that needs every tile on clay, as before Stage 4.6
      expect(tileBound('test_tilepit')).toBe(true);
      expect(canPlace(w, 'test_tilepit', 4, 4).reason).toBe('needs_clay');
      expect(fitOf(w, 'test_tilepit', 4, 4)).toEqual({ terrain: 'clay', fit: 2, of: 4, need: 4, water: null, wet: 0, ok: false, reason: 'needs_clay' });
      expect(fitReason(w, 'test_tilepit', 4, 4)).toBe(null);                          // tile-bound: commands.js refuses it tile by tile
    });
    withRow('test_pit',{ ...BUILDINGS.clay_pit, terrainMin: 2 }, () => {
      expect(tileBound('test_pit')).toBe(false);
      expect(fitOf(w, 'test_pit', 4, 4)).toEqual({ terrain: 'clay', fit: 2, of: 4, need: 2, water: null, wet: 0, ok: true, reason: null });
      expect(canPlace(w, 'test_pit', 4, 4).ok).toBe(true);
      expect(canPlace(w, 'test_pit', 3, 4).ok).toBe(true);                            // 2 of 4 again, the other half
      expect(canPlace(w, 'test_pit', 5, 4).reason).toBe('needs_clay');                // 0 of 4
      expect(canPlace(w, 'test_pit', 5, 3).reason).toBe('needs_clay');
      const c = conditionsFor(w, 'test_pit', 5, 4);
      expect([c.state, c.conditions[0].reason, c.conditions[0].fit, c.conditions[0].need, c.tiles.every((t) => t.state === 'met')]).toEqual(['cant', 'needs_clay', 0, 2, true]);
      expect(conditionsFor(w, 'test_pit', 4, 4).conditions[0]).toEqual({ key: 'ground', state: 'met', reason: null, terrain: 'clay', fit: 2, of: 4, need: 2 });
    });
    expect(conditionsFor(w, 'clay_pit', 20, 4).conditions[0]).toEqual({ key: 'ground', state: 'cant', reason: 'needs_clay', terrain: 'clay', fit: 0, of: 4, need: 2 });
  });
  it('makes a water building touch water, a long-side one along its long side', () => {
    const w = makeTestWorld({ size: 24, fertile: [] });
    for (let y = 0; y < 24; y++) w.terrain[idx(24, 10, y)] = T.WATER;                // a channel down x = 10
    setRoad(w, 0, 12, 9, 12); setRoad(w, 11, 12, 23, 12);
    withRow('test_wharf', { name: 'Wharf', w: 2, d: 1, cost: 10, upkeep: 0, workers: 0, category: 'food', needsRoad: true, water: 'longSide' }, () => {
      withRow('test_meter', { name: 'Meter', w: 1, d: 1, cost: 10, upkeep: 0, workers: 0, category: 'services', needsRoad: true, water: 'touch' }, () => {
        expect(canPlace(w, 'test_meter', 9, 11).ok).toBe(true);                         // beside the channel
        expect(canPlace(w, 'test_meter', 7, 11).reason).toBe('needs_water');
        expect(fitOf(w, 'test_meter', 9, 11).wet).toBe(1);
        expect(canPlace(w, 'test_wharf', 8, 11).reason).toBe('needs_water');            // 2x1: its long sides are north and south; water is east
        const turned = { ...BUILDINGS.test_wharf, w: 1, d: 2 };
        BUILDINGS.test_wharf = turned;                                                   // 1x2: long sides west and east
        expect(canPlace(w, 'test_wharf', 9, 10).ok).toBe(true);
        expect(fitOf(w, 'test_wharf', 9, 10).wet).toBe(2);
        expect(conditionsFor(w, 'test_wharf', 9, 10).conditions[0]).toEqual({ key: 'ground', state: 'met', reason: null, water: 'longSide', wet: 2 });
        expect(canPlace(w, 'test_wharf', 10, 10).reason).toBe('water');                 // never on the water itself
      });
    });
  });
  it('passes a monument\'s style from placing to the building (its price is the Wonders track\'s)', () => {
    const w = createWorld({ seed: 11 });
    w.milestone = 'capital'; w.gold = 1e6;
    const spot = (() => {
      for (let y = 30; y < 60; y++) for (let x = 20; x < 60; x++) { setRoad(w, x, y + 1, x, y + 1); if (canPlace(w, 'obelisk_small', x, y, { style: 'painted' }).ok) return { x, y }; }
      return null;
    })();
    expect(spot !== null).toBe(true);
    const r = place(w, 'obelisk_small', spot.x, spot.y, { style: 'painted' });
    expect([r.ok, w.buildings[r.id].style]).toEqual([true, 'painted']);
  });

  it('lends units to the court and brings them back (the Armies track\'s interface, src/sim/armies.js)', () => {
    const w = makeTestWorld({ size: 24 });
    const bar = insertBuilding(w, makeBuilding(w, 'barracks', 4, 4));
    for (let i = 0; i < 3; i++) w.soldiers.push({ id: w.nextUnitId++, kind: 'soldier', barracks: bar.id, x: 5, y: 5, hp: 12, hit: false, task: 'wait' });
    expect(unitsAtHome(w)).toEqual({ soldier: 3, archer: 0, chariot: 0 });
    expect(sendUnits(w, 4, 180)).toEqual({ ok: false, reason: 'not_enough', sent: {} });
    const events = [];
    expect(sendUnits(w, 2, 180, events)).toEqual({ ok: true, reason: null, sent: { soldier: 2 } });
    expect([unitsAtHome(w).soldier, unitsAway(w)]).toEqual([1, [{ kind: 'soldier', n: 2, back: w.day + 180 }]]);
    expect(events[0].type).toBe('units_sent');
    for (let d = 0; d < 181; d++) tickDay(w);
    expect([unitsAtHome(w).soldier, w.army.away.length]).toEqual([3, 0]);
    expect(w.soldiers.every((u) => u.kind === 'soldier' && u.task === 'wait')).toBe(true);
  });
  it('wires favour into raid size and tribute with no effect yet', () => {
    const w = createWorld({ seed: 3 });
    w.raid.index = 3;
    expect([favourRaidSize(w, 7), favourTributeFactor(w)]).toEqual([7, 1]);
    expect(tributeFor(w, 9)).toBe(Math.round(0.8 * 3 * 150));
    expect(Number.isInteger(raidSize(w))).toBe(true);
  });
  it('ranks a court letter below a raid, a fire and a warning, above debt; no track alert or figure yet', () => {
    expect(CRITICAL_RANK.indexOf('court_letter')).toBe(CRITICAL_RANK.indexOf('raid_warning') + 1);
    expect(CRITICAL_RANK.indexOf('court_letter')).toBe(CRITICAL_RANK.indexOf('debt') - 1);
    const w = createWorld({ seed: 3 });
    expect(alertsFor(w).some((a) => a.code === 'court_letter')).toBe(false);
    expect(s46Walkers(w, 0, { x0: 0, y0: 0, x1: 63, y1: 63 }, 'full')).toEqual([]);
    for (const t of Object.keys(S46_BUILDINGS)) expect(Boolean(ART[t])).toBe(true);
  });
  it('makes one empty seam per track, in track order, each with the seam shape', () => {
    const seams = createS46Seams({});
    expect(seams.length).toBe(6);
    for (const s of seams) {
      expect(Object.keys(s).sort()).toEqual(['destroy', 'onAlertAction', 'onCommand', 'onEvents', 'refresh', 'sheetParts', 'sheets']);
      expect([s.sheets, s.sheetParts.building(null), s.sheetParts.house(null), s.sheetParts.actions(null), s.sheetParts.summary()]).toEqual([{}, [], [], [], []]);
    }
  });
  it('lists the tracks\' dev scenes', () => {
    for (const name of ['s46-sizes-small', 's46-sizes-normal', 's46-sizes-large', 's46-clay', 's46-bridge', 's46-flood', 's46-wildlife', 's46-court-letter', 's46-mixed-raid', 's46-wonders', 's46-speed', 's46-hud']) {
      expect(STAGE46_SCENES).toContain(name);
    }
  });
});
