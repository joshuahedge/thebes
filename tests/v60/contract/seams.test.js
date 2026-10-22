// Version 6.0 Track 0 (the contract, rulings 620-639): the seams the tracks fill, each a named function whose stub keeps today's game.
// costScale (Track A) is applied where every cost is paid and changes nothing yet; dangerDraws (B1) holds the grace and the difficulty's
// factors; the raid strike hooks (B1 fills, B2 draws) strike exactly as before; courtDemands (A) reads world.demands; the Large plot's
// rule (C) refuses until Track C fills it; the map size table (D1) has Huge 112, not offered; the lesson (D2) is two settings keys.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';
import { createWorld, allBuildings } from '../../../src/sim/world.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { costScale, costOf, workGoldPerUnit, extraGoldOf, styleGoldFactor } from '../../../src/sim/costs.js';
import { monthFigures, monthlyBill, balanceWith, biggestCost } from '../../../src/sim/economy.js';
import { tributeFor, towersNeeded } from '../../../src/sim/raids.js';
import { favourTributeFactor } from '../../../src/sim/court.js';
import { lacksRoad } from '../../../src/sim/reach.js';
import { ECONOMY } from '../../../src/data/economy.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../../../src/data/difficulty.js';
import { RAIDS } from '../../../src/data/raids.js';
import { MONUMENTS, MONUMENT } from '../../../src/data/monuments.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { COST_SCALE_NONE, REIGN_SALT } from '../../../src/data/reign.js';
import { HAZARD_LEVELS, HAZARD_SALT, STRIKE_KINDS, GRACE_DAYS } from '../../../src/data/hazards.js';
import { LARGE_PLOT, LARGE_SALT } from '../../../src/data/largePlots.js';
import { BATTLE_SALT } from '../../../src/data/battle.js';
import { dangerDraws } from '../../../src/sim/hazards.js';
import { STRIKES } from '../../../src/sim/strikes.js';
import { courtDemands, greatWorkOf, reignWon } from '../../../src/sim/demands.js';
import { isLargePlot, isMergedHome, largePlotUnlocked, canPlaceLargePlot, largePlotTiles } from '../../../src/sim/largePlots.js';
import { cityAdvice } from '../../../src/sim/advice.js';
import { ADVICE_KINDS } from '../../../src/data/advice.js';
import { adviceWords } from '../../../src/ui/adviceText.js';
import { V60_HELP, V60_ADVICE_WORDS } from '../../../src/ui/text.js';
import { MAP, MAP_SALT, MAP_SIZES, MAP_SIZE_TABLE, HUGE_MAP_SIZE, HUGE_SALT, isMapSize } from '../../../src/data/map.js';
import { DEFAULT_SETTINGS, createSettings } from '../../../src/ui/settings.js';
import { lessonDue } from '../../../src/ui/lesson.js';
import { TIPS } from '../../../src/data/tips.js';
import { FIRSTS } from '../../../src/data/firsts.js';
import { ACHIEVEMENTS } from '../../../src/data/achievements.js';
import { V60_TIPS, V60_FIRSTS, V60_ACHIEVEMENTS, V60_GOALS, V60_EVENT_GOALS } from '../../../src/data/v60.js';
import { GOALS, EVENT_GOALS } from '../../../src/data/goals.js';
import { FIRE_SALT } from '../../../src/data/fire.js';
import { HEALTH_SALT } from '../../../src/data/health.js';
import { CRIME_SALT } from '../../../src/data/crime.js';
import { RAID_SALT } from '../../../src/data/raids.js';
import { REMARK_SALT } from '../../../src/data/tips.js';
import { RIVER_SALT } from '../../../src/data/river.js';
import { COURT_SALT } from '../../../src/data/court.js';
import { WONDER_SALT } from '../../../src/data/wonders.js';
import { S47_SALT } from '../../../src/data/s47.js';

const OLD_KINDS = ['raid_towers', 'fire', 'treasury', 'illness', 'crime', 'home_need', 'stranded', 'running_out', 'workers_short', 'jobless'];

function sample(difficulty = 'normal') {
  const w = createWorld({ seed: 11, difficulty });
  buildSampleCity(w);
  return w;
}

describe('v60 contract cost scale', () => {
  it('is 1 for everything at every level and rank until Track A fills it, so every cost is today\'s', () => {
    expect(COST_SCALE_NONE).toEqual({ wages: 1, upkeep: 1, monuments: 1, court: 1 });
    expect(Object.isFrozen(COST_SCALE_NONE)).toBe(true);
    for (const d of DIFFICULTY_ORDER) {
      const w = createWorld({ seed: 2, difficulty: d });
      for (const m of MILESTONES) { w.milestone = m.id; expect([d, m.id, costScale(w)]).toEqual([d, m.id, COST_SCALE_NONE]); }
    }
  });

  it('leaves wages, upkeep, the bill, the balance, the biggest cost, monuments and tribute as the data and the old formulas give them', () => {
    for (const d of ['normal', 'hard']) {
      const w = sample(d);
      let wages = 0, upkeep = 0;
      for (const b of allBuildings(w)) if (!b.paused && !lacksRoad(w, b)) { upkeep += BUILDINGS[b.type].upkeep; wages += b.staff * ECONOMY.wagePerWorker; }
      const f = monthFigures(w);
      expect([d, f.wages, f.upkeep]).toEqual([d, wages, upkeep]);
      for (const t of ['farm_grain', 'well', 'potter', 'tower']) {
        const def = BUILDINGS[t];
        expect([t, monthlyBill(t, w)]).toEqual([t, monthlyBill(t)]);
        expect(monthlyBill(t)).toEqual({ upkeep: def.upkeep, workers: def.workers, wages: def.workers * ECONOMY.wagePerWorker, bill: def.upkeep + def.workers * ECONOMY.wagePerWorker });
      }
      const L = w.labour, def = BUILDINGS.potter;
      const more = Math.min(L.workforce, L.jobs + def.workers) - Math.min(L.workforce, L.jobs);
      expect(balanceWith(w, 'potter')).toBe(f.net - def.upkeep - more * ECONOMY.wagePerWorker);
      const big = biggestCost(w);
      expect(big.cost).toBe(BUILDINGS[big.type].upkeep + w.buildings[big.id].staff * ECONOMY.wagePerWorker);
      const k = DIFFICULTIES[d].cost;
      expect([costOf(w, 'colossus'), costOf(w, 'colossus', { style: 'gilded' })]).toEqual([Math.max(1, Math.round(MONUMENTS.colossus.founding * k)), Math.max(1, Math.round(MONUMENTS.colossus.founding * styleGoldFactor('gilded') * k))]);
      expect(workGoldPerUnit(w)).toBe(MONUMENT.goldPerUnit * k);
      expect(extraGoldOf(w, 'obelisk_large')).toBe(Math.max(1, Math.round(MONUMENTS.obelisk_large.extra.gold * k)));
      for (const size of [6, 18, 40]) expect(tributeFor(w, size)).toBe(Math.round(favourTributeFactor(w) * RAIDS.tributeShare * towersNeeded(size) * costOf(w, 'tower')));
    }
  });
});

describe('v60 contract danger draws', () => {
  it('opens at graceUntil, with each level\'s factors: Relaxed and Peaceful rarer and milder, Peaceful with no raids and no plague', () => {
    const at = (d, day) => { const w = createWorld({ seed: 5, difficulty: d }); w.day = day; return dangerDraws(w); };
    const shut = at('normal', GRACE_DAYS - 1), open = at('normal', GRACE_DAYS);
    expect([shut.open, shut.plague, shut.drought, shut.locusts, shut.strikes]).toEqual([false, false, false, false, { burn: true, wreck: false, loot: false }]);
    expect([open.open, open.plague, open.drought, open.locusts, open.strikes]).toEqual([true, true, true, true, { burn: true, wreck: true, loot: true }]);
    expect([open.graceUntil, open.daysLeft, shut.daysLeft]).toEqual([GRACE_DAYS, 0, 1]);
    for (const d of DIFFICULTY_ORDER) expect([d, at(d, GRACE_DAYS).chance, at(d, GRACE_DAYS).severity]).toEqual([d, HAZARD_LEVELS[d].chance, HAZARD_LEVELS[d].severity]);
    expect(HAZARD_LEVELS.relaxed.chance).toBeLessThan(HAZARD_LEVELS.normal.chance);
    expect(HAZARD_LEVELS.relaxed.severity).toBeLessThan(HAZARD_LEVELS.normal.severity);
    const p = at('peaceful', GRACE_DAYS);
    expect([p.raids, p.plague, p.drought, p.locusts, p.strikes.wreck, p.strikes.loot]).toEqual([false, false, true, true, false, false]);
    expect([at('relaxed', GRACE_DAYS).raids, at('relaxed', GRACE_DAYS).plague]).toEqual([true, true]);
  });
});

describe('v60 contract raid strike hooks', () => {
  it('burns through the fire rules, wrecks nothing and takes a granary\'s food as before, and nothing from a storehouse yet', () => {
    expect(STRIKE_KINDS).toEqual(['burn', 'wreck', 'loot']);
    for (const k of STRIKE_KINDS) expect(typeof STRIKES[k]).toBe('function');
    const w = makeTestWorld();
    w.milestone = 'town';
    const granary = addRaw(w, 'granary', 10, 10, { store: { grain: 101, figs: 7 } });
    const store = addRaw(w, 'storehouse', 14, 10, { store: { pottery: 40 } });
    const active = { fires: [] }, events = [];
    expect(STRIKES.burn(w, active, granary, events)).toBe(true);
    expect([granary.fire && granary.fire.stage, active.fires, events.map((e) => [e.type, e.cause])]).toEqual(['blaze', [{ id: granary.id, type: 'granary' }], [['fire', 'raid']]]);
    expect(STRIKES.burn(w, active, granary, events)).toBe(false);                   // already burning: no second blaze
    expect(STRIKES.wreck(w, active, store, events)).toEqual([]);
    expect(STRIKES.loot(w, active, granary, events)).toBe(Math.ceil(101 * RAIDS.foodShare) + Math.ceil(7 * RAIDS.foodShare));
    expect(granary.store).toEqual({ grain: 101 - Math.ceil(101 * RAIDS.foodShare), figs: 7 - Math.ceil(7 * RAIDS.foodShare) });
    expect([STRIKES.loot(w, active, store, events), store.store.pottery]).toEqual([0, 40]);
    expect(events.length).toBe(1);
    expect(Object.keys(w.buildings).length).toBe(2);
  });
});

describe('v60 contract demands and the reign', () => {
  it('reads the open demands with their months left, as a copy; no great work and the reign not won', () => {
    const w = createWorld({ seed: 6 });
    expect([courtDemands(w), greatWorkOf(w), reignWon(w)]).toEqual([[], null, false]);
    w.day = 100;
    w.demands.open.push({ id: 1, kind: 'goods', good: 'linen', amount: 400, day: 100, due: 100 + 12 * 30, accepted: false }, { id: 2, kind: 'gold', amount: 500, day: 90, due: 125, accepted: true });
    const list = courtDemands(w);
    expect(list.map((d) => [d.id, d.monthsLeft])).toEqual([[1, 12], [2, 1]]);
    list[0].accepted = true;
    expect(w.demands.open[0].accepted).toBe(false);
    w.day = 200;
    expect(courtDemands(w)[1].monthsLeft).toBe(0);
    const s = addRaw(w, 'obelisk_small', 20, 20);
    w.reign.greatWork = s.id;
    w.reign.won = 300;
    expect([greatWorkOf(w).id, reignWon(w)]).toEqual([s.id, true]);
    w.reign.greatWork = 9999;
    expect(greatWorkOf(w)).toBe(null);
  });
});

describe('v60 contract advice', () => {
  it('places the new kinds among the old, keeps the old order, and adds no item until a track pushes one', () => {
    expect(ADVICE_KINDS.filter((k) => OLD_KINDS.includes(k))).toEqual(OLD_KINDS);
    for (const k of ['plague', 'drought', 'locusts', 'demand']) expect(ADVICE_KINDS).toContain(k);
    expect(new Set(ADVICE_KINDS).size).toBe(ADVICE_KINDS.length);
    const w = sample();
    for (const a of cityAdvice(w)) expect([a.kind, OLD_KINDS.includes(a.kind)]).toEqual([a.kind, true]);
  });

  it('words a new kind from its track\'s V60_ADVICE_WORDS entry, and How to play\'s paragraphs come from V60_HELP in track order', () => {
    expect(Object.keys(V60_HELP)).toEqual(['a', 'b1', 'c', 'b2', 'd1', 'd2']);
    for (const list of Object.values(V60_HELP)) for (const p of list) expect([typeof p.head, typeof p.text]).toEqual(['string', 'string']);   // each track's paragraphs, from its own section
    const w = createWorld({ seed: 6 });
    const item = { key: 'demand:1', kind: 'demand', weight: 5, count: 1, id: null, data: {}, fix: null, cost: null, afford: null };
    expect(adviceWords(item, w).what).toBe('');
    V60_ADVICE_WORDS.demand = (a) => ({ what: `The court asks (${a.key})`, why: 'Its deadline nears', fix: '' });
    try {
      expect(adviceWords(item, w)).toEqual({ what: 'The court asks (demand:1)', why: 'Its deadline nears', fix: '', cost: '', short: false, action: null });
    } finally { delete V60_ADVICE_WORDS.demand; }
  });
});

describe('v60 contract large plots', () => {
  it('tells a Large plot from a home merged under the old rule, and refuses every spot as locked until the city has a home at Townhouse or above', () => {
    const w = makeTestWorld();
    const plot = addRaw(w, 'house', 2, 2);
    const merged = addRaw(w, 'house', 6, 6, { w: 2, d: 2, tier: 6 });
    const lot = addRaw(w, 'house', 10, 10, { w: 2, d: 2, large: true });
    const well = addRaw(w, 'well', 14, 14);
    expect([plot, merged, lot, well].map(isLargePlot)).toEqual([false, false, true, false]);
    expect([plot, merged, lot, well].map(isMergedHome)).toEqual([false, true, false, false]);
    expect([LARGE_PLOT.unlockTier, LARGE_PLOT.size]).toEqual([5, 2]);
    const bare = makeTestWorld();
    bare.milestone = 'capital';
    expect([largePlotUnlocked(bare), canPlaceLargePlot(bare, 20, 20)]).toEqual([false, { ok: false, reason: 'locked', warnings: [] }]);
    expect(largePlotUnlocked(w)).toBe(true);                  // a Manor (merged under the old rule) is a home above Townhouse: the card is there
    expect(largePlotTiles(3, 4)).toEqual([[3, 4], [4, 4], [3, 5], [4, 5]]);
  });
});

describe('v60 contract map sizes', () => {
  it('knows Huge (112) in the table but does not offer it: the picker, links and records see Small, Normal and Large as before', () => {
    expect(MAP_SIZE_TABLE.map((r) => [r.id, r.size, r.offered, r.bigScreen])).toEqual([
      ['small', 48, true, false], ['normal', 64, true, false], ['large', 80, true, false], ['huge', 112, false, true],
    ]);
    expect([HUGE_MAP_SIZE, MAP_SIZES, isMapSize(112), isMapSize(80)]).toEqual([112, { small: 48, normal: 64, large: 80 }, false, true]);
    const w = createWorld({ seed: 11, size: HUGE_MAP_SIZE });
    expect([w.size, w.mapSize, w.terrain.length]).toEqual([112, 112, 112 * 112]);
  });
});

describe('v60 contract lesson state', () => {
  it('keeps the lesson in two settings keys, checked like the others, and is due only with no lesson finished and no saved city', () => {
    expect([DEFAULT_SETTINGS.lessonDone, DEFAULT_SETTINGS.lessonStep]).toEqual([false, 0]);
    const kept = {};
    const storage = { getItem: (k) => kept[k] || null, setItem: (k, v) => { kept[k] = v; } };
    const s = createSettings({ storage, root: document.createElement('div'), systemReducedMotion: () => false, watchSystem: () => () => {} });
    s.set({ lessonStep: 4 });
    s.set({ lessonStep: -1 });
    s.set({ lessonStep: 2.5, lessonDone: 'yes' });
    expect([s.get().lessonStep, s.get().lessonDone]).toEqual([4, false]);
    s.set({ lessonDone: true });
    const again = createSettings({ storage, root: document.createElement('div'), systemReducedMotion: () => false, watchSystem: () => () => {} });
    expect([again.get().lessonStep, again.get().lessonDone]).toEqual([4, true]);
    expect([lessonDue({ lessonDone: false }, false), lessonDue({ lessonDone: false }, true), lessonDue({ lessonDone: true }, false), lessonDue(DEFAULT_SETTINGS, false)]).toEqual([true, false, false, true]);
    s.destroy(); again.destroy();
  });
});

describe('v60 contract lists and salts', () => {
  it('joins each track\'s tips, firsts and achievements into the shared lists', () => {
    for (const t of V60_TIPS) expect(TIPS).toContain(t);
    for (const f of V60_FIRSTS) expect(FIRSTS).toContain(f);
    for (const a of V60_ACHIEVEMENTS) expect(ACHIEVEMENTS).toContain(a);
    for (const g of V60_GOALS) expect(GOALS).toContain(g);
    for (const g of V60_EVENT_GOALS) expect(EVENT_GOALS).toContain(g);
  });

  it('registers each track its own salt range, unique across the game: A 6001-6019, B1 6021-6049, C 6051-6059, B2 6061-6069, D1 6071-6079', () => {
    const TABLE = {
      fire: FIRE_SALT, health: HEALTH_SALT, crime: CRIME_SALT, raid: RAID_SALT, remark: { remark: REMARK_SALT },
      map: { variant: MAP.variantSalt, clay: MAP.clay.salt, ...MAP_SALT }, river: RIVER_SALT, court: COURT_SALT, wonders: WONDER_SALT,
      s47: S47_SALT, reign: REIGN_SALT, hazard: HAZARD_SALT, large: LARGE_SALT, battle: BATTLE_SALT, huge: HUGE_SALT,
    };
    const all = Object.entries(TABLE).flatMap(([t, o]) => Object.entries(o).map(([k, v]) => [`${t}.${k}`, v]));
    const seen = new Map();
    for (const [name, v] of all) {
      expect([name, Number.isInteger(v)]).toEqual([name, true]);
      if (seen.has(v)) expect([name, v]).toEqual([seen.get(v), 'unique']);
      seen.set(v, name);
    }
    const within = (o, lo, hi) => Object.values(o).every((v) => v >= lo && v <= hi);
    expect([within(REIGN_SALT, 6001, 6019), within(HAZARD_SALT, 6021, 6049), within(LARGE_SALT, 6051, 6059), within(BATTLE_SALT, 6061, 6069), within(HUGE_SALT, 6071, 6079)])
      .toEqual([true, true, true, true, true]);
  });
});
