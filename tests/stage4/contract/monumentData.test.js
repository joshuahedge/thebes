import { describe, it, expect } from '../../harness.js';
import { BUILDINGS, BUILDABLE, dimsOf } from '../../../src/data/buildings.js';
import { GOODS, MATERIAL_GOODS } from '../../../src/data/goods.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { DESIRABILITY } from '../../../src/data/desirability.js';
import { FIRE_RISK } from '../../../src/data/fire.js';
import { PARTNERS } from '../../../src/data/trade.js';
import { CATEGORIES } from '../../../src/data/ui.js';
import { MONUMENTS, MONUMENT_KINDS, MONUMENT, MATERIALS, SITE_DESIRABILITY, PRESTIGE, PRESTIGE_UNLOCKS, MONUMENT_PLACING } from '../../../src/data/monuments.js';
import { PALACE_STYLES } from '../../../src/data/palace.js';
import { SCORE_VERSION, SCORE_PARTS, SCORE_PARTS_V1, SCORE_WEIGHTS, MEDALS, SPLITS, SPLIT_MILESTONES, SHARE } from '../../../src/data/scoring.js';
import { ART } from '../../../src/render/art/registry.js';
import { costOf, workGoldPerUnit, extraGoldOf, palacePriceOf, canPayNoDebt } from '../../../src/sim/costs.js';
import { makeTestWorld } from '../../helpers/testWorld.js';

const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]));
const units = (m) => m.courses.reduce((s, c) => s + c.stone + c.bricks, 0);
const total = (m, good) => m.courses.reduce((s, c) => s + c[good], 0);
const byLevel = (fn) => ['peaceful', 'relaxed', 'normal', 'hard'].map((d) => { const w = makeTestWorld(); w.difficulty = d; return fn(w); });

describe('s4 contract monument data', () => {
  it('has the seven kinds of spec 4.16 with their footprints, courses, crews, work and times', () => {
    expect(MONUMENT_KINDS).toEqual(['obelisk_small', 'obelisk_large', 'colossus', 'mastaba_small', 'mastaba_large', 'pyramid_small', 'pyramid_great']);
    const rows = MONUMENT_KINDS.map((k) => { const m = MONUMENTS[k]; return [k, m.w, m.d, m.rotates, m.courses.length, m.crews, m.crewMonths]; });
    expect(rows).toEqual([
      ['obelisk_small', 1, 1, false, 3, 1, 3], ['obelisk_large', 1, 1, false, 4, 2, 18], ['colossus', 2, 2, false, 6, 2, 48],
      ['mastaba_small', 3, 2, true, 4, 3, 108], ['mastaba_large', 4, 3, true, 5, 4, 240], ['pyramid_small', 4, 4, false, 8, 4, 384],
      ['pyramid_great', 7, 7, false, 12, 4, 720],
    ]);
    // Months with the kind's most crews and full supply: 3 months, 9 months, 2, 3, 5, 8 and 15 years (ruling 179).
    expect(MONUMENT_KINDS.map((k) => MONUMENTS[k].crewMonths / MONUMENTS[k].crews)).toEqual([3, 9, 24, 36, 60, 96, 180]);
    for (const k of MONUMENT_KINDS) expect([k, units(MONUMENTS[k])]).toEqual([k, MONUMENTS[k].crewMonths * MONUMENT.unitsPerCrewMonth]);
  });
  it('gives each course a recipe of stone and bricks: stone for obelisks and the colossus, brick cores for mastabas, ramp bricks for pyramids', () => {
    const mat = (k) => [total(MONUMENTS[k], 'stone'), total(MONUMENTS[k], 'bricks')];
    expect(MONUMENT_KINDS.map(mat)).toEqual([[60, 0], [360, 0], [960, 0], [540, 1620], [960, 3840], [6528, 1152], [12240, 2160]]);
    expect(MONUMENTS.mastaba_small.courses.map((c) => (c.stone ? 'stone' : 'bricks'))).toEqual(['bricks', 'bricks', 'bricks', 'stone']);
    for (const c of MONUMENTS.pyramid_great.courses) expect(c.bricks / (c.stone + c.bricks)).toBe(0.15);
    expect(MATERIALS).toEqual(MATERIAL_GOODS);
    expect(MATERIAL_GOODS).toEqual(['stone', 'bricks']);
    for (const g of MATERIAL_GOODS) expect([g, GOODS[g].kind, 'perResidentPerMonth' in GOODS[g]]).toEqual([g, 'material', false]);
  });
  it('sets founding, gilding and capstone gold, the prestige split and the unlocks', () => {
    expect(MONUMENT_KINDS.map((k) => MONUMENTS[k].founding)).toEqual([150, 400, 600, 1000, 2000, 3000, 6000]);
    expect(MONUMENT_KINDS.map((k) => MONUMENTS[k].extra)).toEqual([null, { kind: 'gilding', gold: 1000 }, null, null, null, null, { kind: 'capstone', gold: 5000 }]);
    expect(MONUMENT_KINDS.map((k) => MONUMENTS[k].prestige.courses + MONUMENTS[k].prestige.done)).toEqual([10, 30, 50, 70, 110, 160, 270]);
    for (const k of MONUMENT_KINDS) expect([k, MONUMENTS[k].prestige.courses]).toEqual([k, MONUMENTS[k].prestige.done]);
    expect(MONUMENT_KINDS.reduce((s, k) => s + MONUMENTS[k].prestige.courses + MONUMENTS[k].prestige.done, 0)).toBe(PRESTIGE.scoreFull);
    expect(MONUMENT_KINDS.map((k) => MONUMENTS[k].unlock)).toEqual([
      { milestone: 'city' }, { milestone: 'city' }, { milestone: 'great_city' }, { milestone: 'great_city' }, { milestone: 'capital' },
      { milestone: 'capital', prestige: 100 }, { milestone: 'capital', prestige: 300 },
    ]);
    expect(PRESTIGE_UNLOCKS).toEqual(['pyramid_small', 'pyramid_great']);
    expect(PRESTIGE).toEqual({ moodPer: 70, moodMax: 10, scoreFull: 700 });
  });
  it('keeps the shared rules: 20 units a crew-month, 6.5 gold a unit as Track F tuned it, the reaches, the stockpile, the stall, the big-footprint fit', () => {
    expect(MONUMENT).toEqual({ unitsPerCrewMonth: 20, goldPerUnit: 6.5, crewReach: 12, producerReach: 12, supplyReach: 16, stockPerCrew: 40, stallDays: 3, demolishRefund: 0.25 });
    expect(MONUMENT_PLACING).toEqual({ fitRadius: 16, bigArea: 9, silhouetteAlpha: 0.35, fadeBehind: 0.4 });
    expect(SITE_DESIRABILITY).toEqual([-3, -2, -1]);
  });
});

describe('s4 contract building data', () => {
  it('adds the builders\' guild, quarry and brickworks at the monuments priority, in the Monuments tab, from City', () => {
    const KEYS = ['name', 'w', 'd', 'cost', 'upkeep', 'workers', 'priority', 'category', 'needsRoad'];
    expect(pick(BUILDINGS.builders_guild, [...KEYS, 'reach'])).toEqual({ name: "Builders' guild", w: 2, d: 2, cost: 150, upkeep: 10, workers: 16, priority: 'monuments', category: 'monuments', needsRoad: true, reach: 12 });
    expect(pick(BUILDINGS.quarry, [...KEYS, 'terrain', 'produces', 'producerReach'])).toEqual({ name: 'Quarry', w: 2, d: 2, cost: 100, upkeep: 6, workers: 10, priority: 'monuments', category: 'monuments', needsRoad: true, terrain: 'rocky', produces: { good: 'stone', perMonth: 30 }, producerReach: 12 });
    expect(pick(BUILDINGS.brickworks, [...KEYS, 'produces', 'consumes'])).toEqual({ name: 'Brickworks', w: 2, d: 2, cost: 90, upkeep: 6, workers: 8, priority: 'monuments', category: 'monuments', needsRoad: true, produces: { good: 'bricks', perMonth: 30 }, consumes: 'clay' });
    expect(BUILDINGS.storehouse.stores.slice(-2)).toEqual(['stone', 'bricks']);
  });
  it('makes each monument a building: its founding as its cost, no workers or upkeep, a road, monument: true, rotating mastabas', () => {
    for (const k of MONUMENT_KINDS) {
      expect([k, pick(BUILDINGS[k], ['name', 'w', 'd', 'cost', 'upkeep', 'workers', 'category', 'needsRoad', 'monument', 'rotates'])]).toEqual([k,
        { name: MONUMENTS[k].name, w: MONUMENTS[k].w, d: MONUMENTS[k].d, cost: MONUMENTS[k].founding, upkeep: 0, workers: 0, category: 'monuments', needsRoad: true, monument: true, rotates: MONUMENTS[k].rotates }]);
      expect(BUILDABLE).toContain(k);
    }
    expect([dimsOf('mastaba_large', 0), dimsOf('mastaba_large', 1), dimsOf('pyramid_small', 1), dimsOf('well', 1)]).toEqual([
      { w: 4, d: 3, rot: 0 }, { w: 3, d: 4, rot: 1 }, { w: 4, d: 4, rot: 0 }, { w: 1, d: 1, rot: 0 }]);
  });
  it('adds the plaza and sphinx to Homes and the palace last in Services, with spec 4.7 and 4.20 numbers', () => {
    expect(pick(BUILDINGS.plaza, ['w', 'd', 'cost', 'upkeep', 'workers', 'category', 'needsRoad'])).toEqual({ w: 1, d: 1, cost: 8, upkeep: 0, workers: 0, category: 'homes', needsRoad: false });
    expect(pick(BUILDINGS.sphinx, ['w', 'd', 'cost', 'upkeep', 'workers', 'category', 'needsRoad'])).toEqual({ w: 1, d: 1, cost: 150, upkeep: 0, workers: 0, category: 'homes', needsRoad: false });
    expect(pick(BUILDINGS.palace, ['w', 'd', 'cost', 'upkeep', 'workers', 'category', 'needsRoad', 'palace', 'oneOnly'])).toEqual({ w: 3, d: 3, cost: 300, upkeep: 0, workers: 0, category: 'services', needsRoad: true, palace: true, oneOnly: true });
    expect(PALACE_STYLES.map((s) => [s.id, s.milestone, s.price, s.days, s.mood])).toEqual([
      ['courtyard', 'town', 0, 0, 0], ['columned', 'market_town', 600, 30, 1], ['pylons', 'city', 1500, 60, 2], ['gilded', 'great_city', 4000, 90, 3], ['lapis', 'capital', 10000, 120, 4],
    ]);
    expect(PALACE_STYLES.reduce((s, x) => s + x.price, 0)).toBe(16100);
    expect(PALACE_STYLES.map((s) => s.desirability)).toEqual([[4, 3, 2, 1], [6, 5, 4, 3, 2], [8, 7, 6, 5, 4, 3], [10, 9, 8, 6, 4, 2], [14, 12, 10, 8, 6, 4]]);
  });
  it('unlocks the Stage 4 cards with their milestones, lists them in their tabs and gives each an art slot', () => {
    const at = (type) => (MILESTONES.find((m) => m.unlocks.includes(type)) || { id: null }).id;
    expect(['palace', 'builders_guild', 'quarry', 'brickworks', 'obelisk_small', 'obelisk_large', 'plaza', 'colossus', 'mastaba_small', 'sphinx', 'mastaba_large', 'pyramid_small', 'pyramid_great'].map(at))
      .toEqual(['town', 'city', 'city', 'city', 'city', 'city', 'city', 'great_city', 'great_city', 'great_city', 'capital', null, null]);
    expect(CATEGORIES.find((c) => c.id === 'monuments').items).toEqual(['builders_guild', 'quarry', 'brickworks', ...MONUMENT_KINDS]);
    expect(CATEGORIES.find((c) => c.id === 'homes').items.slice(-2)).toEqual(['plaza', 'sphinx']);
    for (const slot of ['builders_guild', 'quarry', 'brickworks', 'plaza', 'sphinx', 'palace', 'palace.s0', 'palace.s4', ...MONUMENT_KINDS]) expect([slot, typeof (ART[slot] && ART[slot].draw)]).toEqual([slot, 'function']);
    for (const k of MONUMENT_KINDS) expect([k, ART[k].live]).toEqual([k, true]);   // drawn live, never cached (spec 5.7)
  });
  it('gives desirability, fire risk and Memphis\'s stone their spec values', () => {
    expect(pick(DESIRABILITY, ['builders_guild', 'quarry', 'brickworks', 'plaza', 'sphinx', 'palace'])).toEqual({
      builders_guild: [-4, -3, -2, -1], quarry: [-6, -5, -4, -3, -2, -1], brickworks: [-4, -3, -2, -1], plaza: [2, 1], sphinx: [10, 8, 6, 4, 2], palace: [4, 3, 2, 1] });
    for (const k of MONUMENT_KINDS) expect([k, DESIRABILITY[k]]).toEqual([k, MONUMENTS[k].desirability]);
    expect(pick(FIRE_RISK, ['quarry', 'brickworks', 'builders_guild'])).toEqual({ quarry: 0.15, brickworks: 1.0, builders_guild: 0.3 });
    for (const t of ['plaza', 'sphinx', 'palace', ...MONUMENT_KINDS]) expect([t, FIRE_RISK[t]]).toEqual([t, undefined]);
    expect(PARTNERS.memphis.sells.stone).toEqual({ price: 6, quota: 200, from: 'city' });
    for (const p of Object.values(PARTNERS)) for (const g of MATERIAL_GOODS) expect([g, p.buys[g]]).toEqual([g, undefined]);
  });
});

describe('s4 contract score v2 data and costs', () => {
  it('sets score v2: five parts, Monuments from prestige, medals at 200, 300 and 400, seven splits and the t2 link', () => {
    expect(SCORE_VERSION).toBe(2);
    expect(SCORE_PARTS).toEqual([...SCORE_PARTS_V1, 'monuments']);
    expect(SCORE_WEIGHTS.monuments).toEqual({ prestige: 100 });
    expect(MEDALS.map((m) => m.at)).toEqual([200, 300, 400]);
    expect(SPLITS).toEqual([...SPLIT_MILESTONES, 'pyramids', 'great_pyramid']);
    expect(SHARE.format).toBe('t2');
    expect(SHARE.formats).toEqual({ t1: { version: 1, parts: SCORE_PARTS_V1, splits: SPLIT_MILESTONES }, t2: { version: 2, parts: SCORE_PARTS, splits: SPLITS } });
  });
  it('scales founding, work gold, gilding, the capstone and the palace by the difficulty\'s cost, never below 0', () => {
    expect(byLevel((w) => costOf(w, 'pyramid_great'))).toEqual([4800, 4800, 6000, 7500]);
    expect(byLevel(workGoldPerUnit)).toEqual([5.2, 5.2, 6.5, 8.125]);             // not rounded: the site carries the fraction
    expect(byLevel((w) => extraGoldOf(w, 'pyramid_great'))).toEqual([4000, 4000, 5000, 6250]);
    expect(byLevel((w) => extraGoldOf(w, 'obelisk_large'))).toEqual([800, 800, 1000, 1250]);
    expect(byLevel((w) => extraGoldOf(w, 'colossus'))).toEqual([0, 0, 0, 0]);
    expect(byLevel((w) => palacePriceOf(w, 4))).toEqual([8000, 8000, 10000, 12500]);
    expect(byLevel((w) => palacePriceOf(w, 0))).toEqual([0, 0, 0, 0]);
    const w = makeTestWorld({ gold: 100 });
    expect([canPayNoDebt(w, 100), canPayNoDebt(w, 101)]).toEqual([true, false]);
  });
});
