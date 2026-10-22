// Version 6.0 Track B1 (rulings 681-683): what a raid does once the grace is over. Raiders who get through wreck some buildings to rubble (kept as
// was, so they can be cleared and rebuilt), take goods from storehouses as they take a granary's food, and a band of eight or more has a
// chieftain whose fall turns it back; bands grow with the years. Before the grace ends a strike is today's: a blaze, a granary's food.
import { describe, it, expect } from '../../harness.js';
import { raidDay, raidSize } from '../../../src/sim/raids.js';
import { STRIKES, wreckFate, rebuild, rebuildQuote } from '../../../src/sim/strikes.js';
import { dangerDraws, hazardDraw, bandGrowth } from '../../../src/sim/draws.js';
import { burnBuilding } from '../../../src/sim/fire.js';
import { clearRubble } from '../../../src/sim/commands.js';
import { RAIDS } from '../../../src/data/raids.js';
import { WRECK, LOOT, CHIEFTAIN, BAND_GROWTH, GRACE_DAYS, HAZARD_LEVELS } from '../../../src/data/hazards.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { raiderHp } from '../../../src/sim/combat.js';
import { footMix } from '../../../src/data/armies.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

const EAST = { x: 31, y: 16 };
const OPEN = GRACE_DAYS + 100;

// A 32x32 Market town raided from the east, a road along y = 13, a storehouse at (6, 15) holding goods; the grace over by `day`.
function city({ gold = 5000, day = OPEN, difficulty = 'normal' } = {}) {
  const w = makeTestWorld({ gold, raiderEntries: [EAST] });
  w.difficulty = difficulty;
  setRoad(w, 0, 13, 31, 13);
  w.milestone = 'market_town';
  w.day = day;
  const store = addRaw(w, 'storehouse', 6, 15, { store: { pottery: 40, grain: 11 } });
  return { w, store };
}

function arriveNow(w, size, { chiefs = null } = {}) {
  w.raid.index = 2;
  w.raid.warning = { index: 1, entry: { ...EAST }, dir: 'east', size, tribute: 240, target: 'storehouse', day: w.day - RAIDS.warningDays, arrives: w.day, first: false, mix: footMix(size), ...(chiefs ? { chiefs } : {}) };
  const events = [];
  raidDay(w, events);
  return events;
}

// The first building id and day on which a strike would wreck (fate true) or not, for a fixed building shape: searches days from `from`.
function dayWhere(w, b, want, from) {
  for (let day = from; day < from + 400; day++) {
    w.day = day;
    if (wreckFate(w, b) === want) return day;
  }
  throw new Error('no such day');
}

describe('v60 b1 strikes wreck', () => {
  it('wrecks a struck building to rubble that remembers what stood there, and does not also burn it', () => {
    const { w, store } = city();
    const active = { fires: [] }, events = [];
    w.day = dayWhere(w, store, true, OPEN);
    expect(STRIKES.burn(w, active, store, events)).toBe(false);
    expect([store.fire, active.fires, events]).toEqual([null, [], []]);
    const to = STRIKES.wreck(w, active, store, events);
    expect(to.length).toBe(BUILDINGS.storehouse.w * BUILDINGS.storehouse.d);
    expect(store.id in w.buildings).toBe(false);
    const was = { type: 'storehouse', x: 6, y: 15, w: BUILDINGS.storehouse.w, d: BUILDINGS.storehouse.d, rot: 0, day: w.day, cause: 'wreck' };
    for (const id of to) expect([w.buildings[id].type, w.buildings[id].was]).toEqual(['rubble', was]);
    expect([active.wrecked, active.wreckedKinds, w.tally.wrecked]).toEqual([1, ['storehouse'], 1]);
    expect(events).toEqual([{ type: 'raid_wreck', id: store.id, kind: 'storehouse', to }]);
  });

  it('burns as before when the day\'s draw does not wreck, and wrecks nothing at all while the grace lasts', () => {
    const { w, store } = city();
    const active = { fires: [] };
    w.day = dayWhere(w, store, false, OPEN);
    expect(STRIKES.wreck(w, active, store, [])).toEqual([]);
    expect(STRIKES.burn(w, active, store, [])).toBe(true);
    expect(active.fires).toEqual([{ id: store.id, type: 'storehouse' }]);
    const shut = city({ day: GRACE_DAYS - 1 });
    for (let day = GRACE_DAYS - 400; day < GRACE_DAYS; day += 7) { shut.w.day = day; expect([day, wreckFate(shut.w, shut.store)]).toEqual([day, false]); }
    expect([dangerDraws(shut.w).strikes.wreck, shut.w.day < GRACE_DAYS]).toEqual([false, true]);
  });

  it('wrecks a share of strikes that Relaxed halves and Hard raises, never a home, rubble, a monument or the palace', () => {
    const rate = (difficulty) => {
      const { w, store } = city({ difficulty });
      let n = 0;
      for (let id = 1; id <= 600; id++) { store.id = id; w.day = OPEN + (id % 50); if (wreckFate(w, store)) n++; }
      return n / 600;
    };
    const normal = rate('normal'), relaxed = rate('relaxed'), hard = rate('hard');
    expect(Math.abs(normal - WRECK.chance)).toBeLessThan(0.07);
    expect(relaxed).toBeLessThan(normal);
    expect(hard).toBeGreaterThan(normal);
    expect(Math.abs(relaxed - WRECK.chance * HAZARD_LEVELS.relaxed.severity)).toBeLessThan(0.07);
    const { w } = city();
    const home = addRaw(w, 'house', 20, 14, { tier: 3, residents: 8 });
    const rub = addRaw(w, 'rubble', 22, 14);
    const mon = addRaw(w, 'obelisk_small', 24, 18);
    for (let day = OPEN; day < OPEN + 200; day++) { w.day = day; for (const b of [home, rub, mon]) expect([b.type, day, wreckFate(w, b)]).toEqual([b.type, day, false]); }
  });

  it('keeps a fire\'s rubble the same way, and a burned home as the plot it always was', () => {
    const { w, store } = city();
    const plain = addRaw(w, 'house', 20, 14, { tier: 3, residents: 8 });
    const to = burnBuilding(w, store.id);
    for (const id of to) expect(w.buildings[id].was).toEqual({ type: 'storehouse', x: 6, y: 15, w: 2, d: 2, rot: 0, day: w.day, cause: 'fire' });
    const plots = burnBuilding(w, plain.id);
    for (const id of plots) expect([w.buildings[id].type, 'was' in w.buildings[id]]).toEqual(['house', false]);
  });
});

describe('v60 b1 strikes loot', () => {
  it('takes LOOT.storeShare of each good a storehouse holds once the grace is over, and keeps it in the raid\'s record and the tally', () => {
    const { w, store } = city();
    const active = { fires: [] }, events = [];
    const n = STRIKES.loot(w, active, store, events);
    const take = (v) => Math.min(v, Math.ceil(v * LOOT.storeShare));
    expect(n).toBe(take(40) + take(11));
    expect(store.store).toEqual({ pottery: 40 - take(40), grain: 11 - take(11) });
    expect(active.taken).toEqual({ pottery: take(40), grain: take(11) });
    expect([w.tally.looted, events]).toEqual([n, [{ type: 'raid_loot', id: store.id, goods: { pottery: take(40), grain: take(11) } }]]);
    const relaxed = city({ difficulty: 'relaxed' });
    const r = STRIKES.loot(relaxed.w, { fires: [] }, relaxed.store, []);
    expect(r).toBeLessThan(n);
  });

  it('leaves a storehouse alone while the grace lasts, as before, and still takes a granary\'s food', () => {
    const { w, store } = city({ day: GRACE_DAYS - 1 });
    expect(STRIKES.loot(w, { fires: [] }, store, [])).toBe(0);
    expect(store.store).toEqual({ pottery: 40, grain: 11 });
    const granary = addRaw(w, 'granary', 10, 10, { store: { grain: 100 } });
    const active = { fires: [] }, events = [];
    expect(STRIKES.loot(w, active, granary, events)).toBe(Math.ceil(100 * RAIDS.foodShare));
    expect([active.taken, events, w.tally.looted]).toEqual([undefined, [], 0]);          // taken and counted as it always was: no new record, no new event
    const open = city({ day: OPEN });                                                   // after the grace the granary's food is in the record too
    const g2 = addRaw(open.w, 'granary', 10, 10, { store: { grain: 100 } });
    const a2 = { fires: [] }, e2 = [];
    STRIKES.loot(open.w, a2, g2, e2);
    expect([a2.taken, e2, open.w.tally.looted]).toEqual([{ grain: 50 }, [{ type: 'raid_loot', id: g2.id, goods: { grain: 50 } }], 50]);
  });
});

describe('v60 b1 strikes the raid report', () => {
  it('lists what a raid burned, wrecked and took in its report, and has none of it before the grace is over', () => {
    const shut = city({ day: GRACE_DAYS - 600 });
    arriveNow(shut.w, 3);
    for (let k = 0; k < 200 && shut.w.raid.active; k++) { shut.w.day += 1; raidDay(shut.w, []); }
    const old = shut.w.raid.last;
    expect(['wrecked', 'wreckedKinds', 'taken', 'chiefs'].filter((k) => k in old)).toEqual([]);
    // A raid in the open years: it strikes the storehouse; find a day on which it wrecks it.
    const { w, store } = city();
    w.day = dayWhere(w, store, true, OPEN);
    // the strike happens on the day the band reaches it, some days after arriving; make that day certain by putting it a step away
    addRaw(w, 'storehouse', 29, 15, { store: { pottery: 30 } });
    arriveNow(w, 3);
    const events = [];
    for (let k = 0; k < 250 && w.raid.active; k++) { w.day += 1; raidDay(w, events); }
    const report = events.find((e) => e.type === 'raid_end').report;
    const wrecks = events.filter((e) => e.type === 'raid_wreck');
    const loots = events.filter((e) => e.type === 'raid_loot');
    expect(report.wrecked || 0).toBe(wrecks.length);
    if (wrecks.length) expect(report.wreckedKinds).toEqual(wrecks.map((e) => e.kind));
    const taken = {};
    for (const e of loots) for (const [g, v] of Object.entries(e.goods)) taken[g] = (taken[g] || 0) + v;
    expect(report.taken || {}).toEqual(taken);
    expect(loots.length).toBeGreaterThan(0);
  });
});

describe('v60 b1 strikes rebuild', () => {
  it('quotes the clearing and the building, and puts it back on its own place at that price', () => {
    const { w, store } = city();
    w.day = dayWhere(w, store, true, OPEN);
    const tiles = STRIKES.wreck(w, { fires: [] }, store, []);
    const gold = w.gold;
    const q = rebuildQuote(w, tiles[0]);
    expect(q.ok).toBe(true);
    expect([q.type, q.x, q.y, q.tiles.length, q.clear, q.build, q.cost]).toEqual(['storehouse', 6, 15, 4, 4 * 5, BUILDINGS.storehouse.cost, 4 * 5 + BUILDINGS.storehouse.cost]);
    const r = rebuild(w, tiles[2]);
    expect(r.ok).toBe(true);
    expect(w.gold).toBe(gold - q.cost);
    const b = w.buildings[r.id];
    expect([b.type, b.x, b.y, b.w, b.d]).toEqual(['storehouse', 6, 15, 2, 2]);
    expect(tiles.some((id) => id in w.buildings)).toBe(false);
    expect([w.tally.rebuilt, w.tally.rubbleCleared, w.undo.length]).toEqual([1, 4, 0]);
  });

  it('refuses for gold or for ground now used, leaving the rubble as it was, and for rubble that remembers nothing', () => {
    const { w, store } = city({ gold: -450 });                       // the debt floor is -500: 20 to clear and the storehouse's price would pass it
    w.day = dayWhere(w, store, true, OPEN);
    const tiles = STRIKES.wreck(w, { fires: [] }, store, []);
    const q = rebuildQuote(w, tiles[0]);
    expect([q.ok, q.reason, q.cost]).toEqual([false, 'no_gold', 20 + BUILDINGS.storehouse.cost]);
    expect(rebuild(w, tiles[0]).reason).toBe('no_gold');
    w.gold = 5000;
    w.road[15 * w.size + 6] = 1;                                    // a road laid over one tile: it is not free any more
    const refused = rebuild(w, tiles[0]);
    expect(refused.ok).toBe(false);
    for (const id of tiles) expect(w.buildings[id].type).toBe('rubble');
    expect(w.tally.rebuilt).toBe(0);
    const plain = addRaw(w, 'rubble', 20, 20);
    expect([rebuildQuote(w, plain.id).reason, rebuildQuote(w, 999999).reason]).toEqual(['no_rubble', 'no_rubble']);
    // an old clear still works on it
    expect(clearRubble(w, 20, 20).ok).toBe(true);
  });
});

describe('v60 b1 strikes the chieftain', () => {
  it('leads every band of CHIEFTAIN.fromSize or more once the grace is over: the first raider on foot, with more hit points', () => {
    const { w } = city();
    arriveNow(w, CHIEFTAIN.fromSize, { chiefs: [0] });
    const a = w.raid.active;
    const chief = a.raiders.find((r) => r.chief);
    expect([a.chiefs, chief.id, chief.hp, a.raiders.filter((r) => r.chief).length]).toEqual([[{ id: chief.id, band: 0 }], a.raiders[0].id, raiderHp('foot') * CHIEFTAIN.hpFactor, 1]);
  });

  it('is named in the warning of a big raid after the grace and in none before it, on Peaceful or for a small band', () => {
    // A big city (40 homes of 30 people: the people term alone is 9 raiders) at its fourth raid's warning, in the open years and in the grace.
    const warnedIn = (opts) => {
      const { w } = city(opts);
      w.raid.index = 3; w.raid.clockDay = 0; w.raid.nextWarnDay = w.day; w.raid.adaptation = 1;
      for (let k = 0; k < 40; k++) addRaw(w, 'house', 8 + (k % 20), 20 + Math.floor(k / 20) * 2, { tier: 4, residents: 30 });
      const events = [];
      raidDay(w, events);
      return { warning: w.raid.warning, event: events.find((e) => e.type === 'raid_warning') };
    };
    const { warning: big, event } = warnedIn({});
    expect(big.size).toBeGreaterThanOrEqual(CHIEFTAIN.fromSize);
    const sizes = big.second ? [big.size - big.second.size, big.second.size] : [big.size];
    expect(big.chiefs).toEqual(sizes.map((s, k) => (s >= CHIEFTAIN.fromSize && !(big.second && big.second.boat && k === 1) ? k : -1)).filter((k) => k >= 0));
    expect(event.chiefs).toEqual(big.chiefs);
    const early = warnedIn({ day: GRACE_DAYS - 300 }).warning;
    expect(early.size).toBeGreaterThanOrEqual(CHIEFTAIN.fromSize);
    expect('chiefs' in early).toBe(false);
    expect(warnedIn({ difficulty: 'peaceful' }).warning).toBe(null);               // Peaceful has no raids to lead
  });

  it('turns its band back when he falls, counted in the report, and a chieftain who gets away has not fallen', () => {
    const { w } = city();
    arriveNow(w, CHIEFTAIN.fromSize + 2, { chiefs: [0] });
    const a = w.raid.active;
    const chief = a.raiders.find((r) => r.chief);
    chief.hp = 0;
    w.day += 1;
    raidDay(w, []);
    expect([a.chiefs[0].fell, a.phase, a.raiders.some((r) => r.id === chief.id)]).toEqual([true, 'retreat', false]);
    for (let k = 0; k < 200 && w.raid.active; k++) { w.day += 1; raidDay(w, []); }
    expect([w.raid.last.chiefs, w.raid.last.chiefsFell]).toEqual([1, 1]);
    // a band that leaves with its chieftain alive: not fallen
    const v = city().w;
    arriveNow(v, CHIEFTAIN.fromSize, { chiefs: [0] });
    for (let k = 0; k < 300 && v.raid.active; k++) { v.day += 1; raidDay(v, []); }
    expect([v.raid.last.chiefs, v.raid.last.chiefsFell, v.raid.last.won]).toEqual([1, 0, false]);
  });

  it('hits harder than a raider on foot: CHIEFTAIN.damageFactor of his blow', () => {
    expect(CHIEFTAIN.damageFactor).toBeGreaterThan(1);
    expect(CHIEFTAIN.hpFactor).toBeGreaterThan(1);
  });
});

describe('v60 b1 strikes band growth', () => {
  it('adds raiders each year after the grace ends, scaled by the level, and none before it or on Peaceful', () => {
    const at = (difficulty, day) => { const { w } = city({ difficulty, day }); return bandGrowth(w); };
    expect([at('normal', GRACE_DAYS - 1), at('normal', GRACE_DAYS), at('normal', GRACE_DAYS + 360), at('normal', GRACE_DAYS + 360 * 3), at('normal', GRACE_DAYS + 360 * 30)])
      .toEqual([0, 0, BAND_GROWTH.perYear, 3 * BAND_GROWTH.perYear, BAND_GROWTH.max]);
    expect(at('relaxed', GRACE_DAYS + 360 * 2)).toBeLessThan(at('normal', GRACE_DAYS + 360 * 2) + 1);
    expect(at('peaceful', GRACE_DAYS + 360 * 5)).toBe(0);
    const { w } = city({ day: GRACE_DAYS + 360 * 3 });
    w.raid.index = 2;                                               // not the first raid, whose size is fixed
    const before = raidSize(w);
    w.hazards.graceUntil = GRACE_DAYS + 360 * 10;
    expect(before - raidSize(w)).toBe(3 * BAND_GROWTH.perYear);
    expect(hazardDraw(w, 1, 2, 'wreck')).toBe(hazardDraw(w, 1, 2, 'wreck'));
  });
});
