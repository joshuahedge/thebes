// Task 5a (ruling 317): tougher raids. Size grows 10% a year up to 1.5x and the cap is 18; from the 4th raid a seeded 35% of
// raids come as two bands from two entries (total = size + 1, split rounding up, one warning naming both directions); after
// the wealth targets a band strikes a granary (food stolen) and a home (a quarter of its people flee); tribute prices the
// total; the first raid stays 3 and cannot be paid off; Peaceful has none. Every sentence is computed from the sim's own
// numbers, and each is tested for a single band and for two.
import { describe, it, expect } from '../harness.js';
import { raidDay, raidAlerts, raidDirs, raidSize, baseRaidSize, wealthDraw, wealthCap, raidWealth, sizeGrowth, tributeFor, tributeQuote, towersNeeded, warningBands, warningDirs } from '../../src/sim/raids.js';
import { hash2 } from '../../src/sim/rng.js';
import { serialize, deserialize } from '../../src/save/serialize.js';
import { RAIDS, RAID_SALT, UNITS } from '../../src/data/raids.js';
import { population } from '../../src/sim/world.js';
import { alertText, DANGER_UI_TEXT as D, RAID_TEXT, TIP_TEXT, raiderTargetsTip, S46_ARMY_TEXT } from '../../src/ui/text.js';
import { openGoals, triggerEventGoals } from '../../src/sim/goals.js';
import { minimapPins } from '../../src/ui/minimap.js';
import { triage, bannerModel } from '../../src/ui/alerts.js';
import { boot } from '../../src/boot.js';
import { createSaveStore } from '../../src/save/store.js';
import { devScene, measureRows } from '../../src/dev/scenes.js';
import { fakeIndexedDB } from '../helpers/fakeStorage.js';
import { mountShell, fakeHistory, rigUI } from '../helpers/uiWorld.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

const EAST = { x: 31, y: 16 }, NORTH = { x: 16, y: 0 }, WEST = { x: 0, y: 20 };
const YEAR = 360;

// A 32x32 Market town with a road along y = 13, `people` in one home, and the given raider entries.
function city({ people = 600, gold = 2000, entries = [EAST, NORTH, WEST] } = {}) {
  const w = makeTestWorld({ gold, raiderEntries: entries });
  setRoad(w, 0, 13, 31, 13);
  w.milestone = 'market_town';
  addRaw(w, 'house', 2, 14, { tier: 4, residents: people });
  return w;
}

// The day's raid step on a given day, as tickDay runs it.
function dayAt(w, day, events = []) {
  w.day = day;
  raidDay(w, events);
  return events;
}

// A raid that is due to be warned today, as the clock would have it at raid index `index`.
function due(w, { index = 3, day = 3000 } = {}) {
  Object.assign(w.raid, { clockDay: 0, nextWarnDay: day, index });
  w.day = day;
  return w;
}

// A seed whose draw at this raid index makes it two-sided (or not), by the data's own chance.
const twoSided = (seed, index) => hash2(seed, index, RAID_SALT.two) < RAIDS.twoSidedChance;
function seedWhere(index, wanted) {
  for (let seed = 1; seed < 500; seed++) if (twoSided(seed, index) === wanted) return seed;
  throw new Error('no seed');
}

describe('s45 raids grow with the years', () => {
  it('multiplies the size by 1 + 0.1 a year since the raid clock started, at most 1.5, and the cap is 18', () => {
    const w = city({ people: 600, gold: 2000 });
    w.raid.index = 1;
    w.raid.clockDay = 0;
    const at = (day) => { w.day = day; return [sizeGrowth(w), raidSize(w)]; };
    expect(at(0)[0]).toBe(1);
    expect(Math.round(at(YEAR)[0] * 1000)).toBe(1100);
    expect(Math.round(at(YEAR * 3)[0] * 1000)).toBe(1300);
    expect(Math.round(at(YEAR * 5)[0] * 1000)).toBe(1500);
    expect(at(YEAR * 9)[0]).toBe(RAIDS.growthMax);                                    // at most 1.5
    // The size is the unchanged formula times the growth: people / 125 and the wealth term, rounded after. From year 10 (day YEAR * 9) Stage
    // 4.7's late wealth term (ruling 470, wealthDraw) comes on top; before it, it is 0.
    const wealth = Math.min(RAIDS.wealthMax, Math.max(0, (raidWealth(w) - RAIDS.wealthBase) / RAIDS.wealthStep));
    const raw = 1 + population(w) / RAIDS.peoplePerRaider + wealth;
    for (const day of [0, YEAR, YEAR * 2.5, YEAR * 5, YEAR * 9]) {
      const [growth, size] = at(day);
      expect([day, size - wealthDraw(w)]).toEqual([day, Math.max(RAIDS.minSize, Math.min(RAIDS.maxSize, Math.round(raw * growth)))]);
      expect([day, wealthDraw(w) > 0]).toEqual([day, day >= YEAR * 9]);
    }
    expect(at(YEAR * 9)[1]).toBeGreaterThan(at(0)[1]);
    // The clock has not started: nothing grows.
    w.raid.clockDay = null;
    expect(sizeGrowth(w)).toBe(1);
  });
  it('caps a raid at 18 raiders however big and old the city, and keeps the first at 3', () => {
    const w = city({ people: 3000, gold: 90000 });
    w.raid.clockDay = 0;
    w.raid.index = 1;
    w.day = YEAR * 10;
    expect(RAIDS.maxSize).toBe(18);
    expect(baseRaidSize(w)).toBe(18);
    // Stage 4.7 (ruling 470): from year 10 the wealth term comes on top of the capped size, itself capped by difficulty (6 on Normal).
    expect(raidSize(w)).toBe(18 + wealthCap(w));
    w.day = YEAR * 8;
    expect(raidSize(w)).toBe(18);
    w.raid.index = 0;
    expect(raidSize(w)).toBe(RAIDS.firstSize);                                        // the first raid stays 3 at every age
  });
  it('grows a raid fixed at the warning: the same city warns a bigger raid ten years in than at the start', () => {
    const young = city(), old = city();
    due(young, { index: 1, day: 800 });
    due(old, { index: 1, day: 3600 });
    old.raid.clockDay = 0;
    young.raid.clockDay = 700;                                                        // 100 days on: no growth yet worth a raider
    dayAt(young, 800);
    dayAt(old, 3600);
    expect(old.raid.warning.size).toBeGreaterThan(young.raid.warning.size);
    expect(old.raid.warning.size).toBe(raidSize(old));
  });
});

describe('s45 two-sided raids', () => {
  it('never comes two-sided before the 4th raid, whatever the draw, and never on the first', () => {
    for (const index of [0, 1, 2]) {
      const w = city();
      due(w, { index });
      const seed = seedWhere(3, true);                                                // a seed whose draw would say yes
      w.seed = seed;
      dayAt(w, 3000);
      expect([index, w.raid.warning.second]).toEqual([index, undefined]);
    }
  });
  it('draws 35% of raids from the 4th on by hash2(seed, raid index, salt), and splits the total (size + 1) rounding up', () => {
    let two = 0, n = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const w = city();
      w.seed = seed;
      due(w, { index: 3 });
      const single = raidSize(w);
      dayAt(w, 3000);
      const warn = w.raid.warning;
      n++;
      expect([seed, Boolean(warn.second)]).toEqual([seed, twoSided(seed, 3)]);
      if (!warn.second) { expect(warn.size).toBe(single); continue; }
      two++;
      const total = single + 1;
      const [a, b] = warningBands(warn);
      expect([warn.size, a.size + b.size, a.size, b.size]).toEqual([total, total, Math.ceil(total / 2), Math.floor(total / 2)]);
    }
    expect(two / n).toBeGreaterThan(0.28);
    expect(two / n).toBeLessThan(0.42);
  });
  it('uses two different entries, on different edges when the map has them, one warning, and tribute prices the total', () => {
    const w = city();
    w.seed = seedWhere(3, true);
    due(w, { index: 3 });
    w.speed = 3;
    const events = dayAt(w, 3000);
    const warn = w.raid.warning;
    expect(events.filter((e) => e.type === 'raid_warning').length).toBe(1);
    expect(JSON.stringify(warn.entry) === JSON.stringify(warn.second.entry)).toBe(false);
    expect(warn.dir === warn.second.dir).toBe(false);
    const total = warn.size;
    expect(warn.tribute).toBe(tributeFor(w, total));
    const q = tributeQuote(w);
    expect([q.size, q.towersNeeded, q.dirs]).toEqual([total, towersNeeded(total), [warn.dir, warn.second.dir]]);
    expect([events[0].type, events[0].size, events[0].dirs]).toEqual(['raid_warning', total, [warn.dir, warn.second.dir]]);
    expect(w.speed).toBe(1);                                                          // later warnings drop 2x or 3x to 1x
    // Only two entries, both on the east edge: the second band still comes from the other entry.
    const one = city({ entries: [{ x: 31, y: 10 }, { x: 31, y: 20 }] });
    one.seed = w.seed;
    due(one, { index: 3 });
    dayAt(one, 3000);
    expect(one.raid.warning.entry.y === one.raid.warning.second.entry.y).toBe(false);
    // A single entry cannot make two bands.
    const lone = city({ entries: [EAST] });
    lone.seed = w.seed;
    due(lone, { index: 3 });
    dayAt(lone, 3000);
    expect(lone.raid.warning.second).toBe(undefined);
  });
  it('is the same warning for the same seed, and a one-band warning keeps its old shape', () => {
    const run = (seed, index) => { const w = city(); w.seed = seed; due(w, { index }); dayAt(w, 3000); return JSON.stringify(w.raid.warning); };
    const seed = seedWhere(3, true);
    expect(run(seed, 3)).toBe(run(seed, 3));
    const w = city(); w.seed = seedWhere(3, false); due(w, { index: 3 }); dayAt(w, 3000);
    expect(Object.keys(w.raid.warning).sort()).toEqual(['arrives', 'day', 'dir', 'entry', 'first', 'index', 'mix', 'size', 'target', 'tribute']);   // mix: Stage 4.6 (src/data/armies.js)
    expect(Object.keys(raidAlerts(w)[0]).sort()).toEqual(['arrives', 'code', 'dir', 'x', 'y']);
  });
  it('has no raids on Peaceful', () => {
    const w = city();
    w.difficulty = 'peaceful';
    due(w, { index: 3 });
    dayAt(w, 3000);
    expect([w.raid.warning, w.raid.index]).toEqual([null, 3]);
  });
  it('cannot pay off the first raid, hidden or not, and quotes the second\'s tribute for its total', () => {
    const w = city();
    due(w, { index: 0 });
    dayAt(w, 3000);
    expect([w.raid.warning.size, w.raid.warning.second, tributeQuote(w).hidden, tributeQuote(w).payable, tributeQuote(w).reason]).toEqual([3, undefined, true, false, 'first_raid']);
  });
});

// A warning of a two-sided raid in the contract's shape: 7 raiders, 4 from the east and 3 from the north.
function warnTwo(w, { day = 1000, size = 7 } = {}) {
  w.raid.index = 4;
  w.raid.clockDay = 0;
  w.raid.warning = {
    index: 3, entry: { ...EAST }, dir: 'east', size, tribute: tributeFor(w, size), target: 'storehouse', day: day - RAIDS.warningDays, arrives: day, first: false,
    second: { entry: { ...NORTH }, dir: 'north', size: Math.floor(size / 2) },
  };
  w.day = day;
}

describe('s45 two bands on the map', () => {
  it('arrives as two bands at their own entries, in one raid, with the total in the raid and one start event', () => {
    const w = city();
    warnTwo(w);
    const events = [];
    raidDay(w, events);
    const a = w.raid.active;
    expect([a.raiders.length, a.raiders.filter((u) => u.band).length, a.size]).toEqual([7, 3, 7]);
    expect([a.dir, a.second.dir, a.x, a.y, a.second.x, a.second.y]).toEqual(['east', 'north', EAST.x, EAST.y, NORTH.x, NORTH.y]);
    expect(events.filter((e) => e.type === 'raid_start')).toEqual([{ type: 'raid_start', index: 3, dir: 'east', size: 7, dirs: ['east', 'north'] }]);
    expect(w.tally.raids).toBe(1);
    const near = (u, e) => Math.abs(u.x - e.x - 0.5) < 1 && Math.abs(u.y - e.y - 0.5) < 1;
    expect(a.raiders.filter((u) => !u.band).every((u) => near(u, EAST))).toBe(true);
    expect(a.raiders.filter((u) => u.band).every((u) => near(u, NORTH))).toBe(true);
  });
  it('stands every raider of a full band on its own spot: 18 in one band, and the biggest two-sided raid (19) in both', () => {
    const spots = (list) => new Set(list.map((u) => `${u.x.toFixed(3)},${u.y.toFixed(3)}`)).size;
    const one = city();
    warnTwo(one, { size: RAIDS.maxSize });
    delete one.raid.warning.second;
    raidDay(one);
    expect([one.raid.active.raiders.length, spots(one.raid.active.raiders)]).toEqual([18, 18]);
    const two = city();
    warnTwo(two, { size: RAIDS.maxSize + 1 });
    raidDay(two);
    const a = two.raid.active.raiders;
    expect([a.length, spots(a.filter((u) => !u.band)), spots(a.filter((u) => u.band))]).toEqual([19, 10, 9]);
  });
  it('moves each band on its own, and the raid is over only when both have left: lost, with both directions in the report', () => {
    const w = city();
    addRaw(w, 'storehouse', 6, 15);
    addRaw(w, 'storehouse', 22, 16);
    warnTwo(w);
    const events = [];
    raidDay(w, events);
    const moved = [];
    for (let k = 0; k < 400 && w.raid.active; k++) {
      w.day += 1;
      raidDay(w, events);
      const a = w.raid.active;
      if (a) moved.push([a.x, a.y, a.second.x, a.second.y].join());
    }
    expect(new Set(moved.map((m) => m.split(',').slice(0, 2).join())).size).toBeGreaterThan(1);
    expect(new Set(moved.map((m) => m.split(',').slice(2).join())).size).toBeGreaterThan(1);
    const end = events.find((e) => e.type === 'raid_end');
    expect(w.raid.active).toBe(null);
    expect([end.won, end.report.size, end.report.dirs, end.report.dir]).toEqual([false, 7, ['east', 'north'], 'east']);
    const struck = events.filter((e) => e.type === 'raid_strike');
    expect(struck.length).toBeGreaterThanOrEqual(2);
    expect(end.report.stolen).toBe(struck.reduce((n, e) => n + e.stolen, 0));
    expect(w.tally.raidsLost).toBe(1);
  });
  it('falls back both bands once half the whole raid has fallen, and beats the raid when they have left', () => {
    const w = city();
    addRaw(w, 'storehouse', 6, 15);
    warnTwo(w);
    raidDay(w, []);
    for (let k = 0; k < 3; k++) { w.day += 1; raidDay(w, []); }                      // both bands are away from their entries
    const a = w.raid.active;
    expect([a.phase, a.second.phase]).toEqual(['attack', 'attack']);
    const fall = [...a.raiders.filter((u) => !u.band).slice(0, 2), ...a.raiders.filter((u) => u.band).slice(0, 2)];   // 4 of 7: half, rounded up
    a.raiders = a.raiders.filter((u) => !fall.includes(u));
    w.day += 1;
    raidDay(w, []);
    expect([w.raid.active.phase, w.raid.active.second.phase]).toEqual(['retreat', 'retreat']);
    const events = [];
    for (let k = 0; k < 300 && w.raid.active; k++) { w.day += 1; raidDay(w, events); }
    const end = events.find((e) => e.type === 'raid_end');
    expect([end.won, w.raid.last.dirs, w.tally.raidsBeaten]).toEqual([true, ['east', 'north'], 1]);
  });
  it('is lost when one band got away after its strikes even though the other fell back', () => {
    const w = city();
    addRaw(w, 'storehouse', 6, 15);
    warnTwo(w);
    raidDay(w, []);
    const a = w.raid.active;
    a.phase = 'leave';                                                                 // the east band has had its strikes and heads home
    a.struck = [1, 2, 3];
    a.second.phase = 'retreat';
    const events = [];
    for (let k = 0; k < 300 && w.raid.active; k++) { w.day += 1; raidDay(w, events); }
    expect(events.find((e) => e.type === 'raid_end').won).toBe(false);
  });
  it('keeps the second band through a save and a load', () => {
    const w = city();
    addRaw(w, 'storehouse', 6, 15);
    warnTwo(w);
    raidDay(w, []);
    w.day += 5;
    raidDay(w, []);
    const back = deserialize(serialize(w));
    expect(back.raid.active.second).toEqual(w.raid.active.second);
    expect(back.raid.active.raiders.filter((u) => u.band).length).toBe(3);
    w.day += 1; back.day += 1;
    raidDay(w, []); raidDay(back, []);
    expect(back.raid.active).toEqual(w.raid.active);
  });
  it('still runs a v6 raid saved without any of the new fields (one band, no second, no gone)', () => {
    const w = city({ people: 100 });
    addRaw(w, 'storehouse', 6, 15);
    w.raid.index = 1;
    w.raid.warning = { index: 0, entry: { ...EAST }, dir: 'east', size: 3, tribute: null, target: 'storehouse', day: 900, arrives: 1000, first: true };
    w.day = 1000;
    raidDay(w, []);
    const events = [];
    for (let k = 0; k < 300 && w.raid.active; k++) { w.day += 1; raidDay(w, events); }
    expect(w.raid.active).toBe(null);
    expect(events.find((e) => e.type === 'raid_end').report.dirs).toBe(undefined);
  });
});

describe('s45 granaries and homes', () => {
  // One band, one storehouse, a granary holding food and a home with people: the strikes go wealth, granary, home.
  function raided({ residents = 10, grain = 100, figs = 41, gold = 1000 } = {}) {
    const w = makeTestWorld({ gold, raiderEntries: [EAST] });
    setRoad(w, 0, 13, 31, 13);
    w.milestone = 'market_town';
    const store = addRaw(w, 'storehouse', 6, 15);
    const granary = addRaw(w, 'granary', 14, 15, { store: { grain, figs } });
    const home = addRaw(w, 'house', 22, 14, { tier: 3, residents });
    w.raid.index = 2;
    w.raid.clockDay = 0;
    w.raid.warning = { index: 1, entry: { ...EAST }, dir: 'east', size: 3, tribute: 240, target: 'storehouse', day: 900, arrives: 1000, first: false };
    w.day = 1000;
    const events = [];
    raidDay(w, events);
    for (let k = 0; k < 300 && w.raid.active; k++) { w.day += 1; raidDay(w, events); }
    return { w, store, granary, home, events, strikes: events.filter((e) => e.type === 'raid_strike'), end: events.find((e) => e.type === 'raid_end') };
  }
  it('strikes a storehouse, then a granary (food stolen, no gold), then a home (a quarter of its people flee, no gold)', () => {
    const { w, store, granary, home, strikes, end } = raided();
    expect(strikes.map((e) => e.id)).toEqual([store.id, granary.id, home.id]);
    expect(strikes[0].stolen).toBeGreaterThan(0);
    expect([strikes[1].stolen, strikes[1].food, strikes[1].fled]).toEqual([0, 50 + 21, undefined]);   // half of 100 grain, half of 41 figs rounded up
    expect([granary.store.grain, granary.store.figs]).toEqual([50, 20]);
    expect([strikes[2].stolen, strikes[2].food, strikes[2].fled]).toEqual([0, undefined, 2]);          // 10 residents x 25% = 2.5, rounded down
    expect(home.residents).toBe(8);
    expect([end.report.foodStolen, end.report.fled, end.report.stolen]).toEqual([71, 2, strikes[0].stolen]);
    expect(w.tally.goldStolen).toBe(strikes[0].stolen);
  });
  it('drives out at least one resident, and the whole of a home of one', () => {
    expect(raided({ residents: 3 }).home.residents).toBe(2);
    const one = raided({ residents: 1 });
    expect(one.strikes[2].fled).toBe(1);
    expect(one.home.residents).toBe(0);
  });
  it('goes for the usual targets when there is no granary or no home with people in it', () => {
    const w = makeTestWorld({ gold: 1000, raiderEntries: [EAST] });
    setRoad(w, 0, 13, 31, 13);
    w.milestone = 'market_town';
    const a = addRaw(w, 'storehouse', 6, 15), b = addRaw(w, 'storehouse', 14, 15), c = addRaw(w, 'temple', 22, 15);
    addRaw(w, 'house', 26, 14, { tier: 0, residents: 0 });
    w.raid.index = 2; w.raid.clockDay = 0;
    w.raid.warning = { index: 1, entry: { ...EAST }, dir: 'east', size: 3, tribute: 240, target: 'storehouse', day: 900, arrives: 1000, first: false };
    w.day = 1000;
    const events = [];
    raidDay(w, events);
    for (let k = 0; k < 300 && w.raid.active; k++) { w.day += 1; raidDay(w, events); }
    const ids = events.filter((e) => e.type === 'raid_strike').map((e) => e.id);
    expect(new Set(ids)).toEqual(new Set([a.id, b.id, c.id]));                          // three wealth strikes: an empty plot is no target
  });
  it('words what was lost from the report: food and residents, both ways', () => {
    const { end } = raided();
    const said = D.raidReport(end.report);
    expect(said).toContain(`took ${end.report.stolen} gold`);
    expect(said).toContain('took 71 food');
    expect(said).toContain('drove out 2 residents');
    const calm = raided({ gold: 0 }).end.report;                                       // nothing to steal in gold: the strikes at the granary and the home still say what they took
    expect(D.raidReport(calm).includes('gold')).toBe(false);
    expect(/food|resident/.test(D.raidReport({ ...end.report, foodStolen: undefined, fled: undefined }))).toBe(false);
  });
});

describe('s45 raid words', () => {
  function warned(two) {
    const w = city();
    if (two) warnTwo(w); else {
      w.raid.index = 4; w.raid.clockDay = 0; w.day = 1000;
      w.raid.warning = { index: 3, entry: { ...EAST }, dir: 'east', size: 6, tribute: tributeFor(w, 6), target: 'storehouse', day: 910, arrives: 1000, first: false };
    }
    w.day = 940;
    return w;
  }
  it('names both directions in the alert title, the banner, the chip and the defence line, from the sim\'s directions', () => {
    for (const two of [false, true]) {
      const w = warned(two), warn = w.raid.warning, q = tributeQuote(w);
      const dirs = warningDirs(warn), from = `the ${dirs.join(' and ')}`;
      const alert = raidAlerts(w).find((x) => x.code === 'raid_warning');
      expect([alert.dir, alert.dirs]).toEqual([warn.dir, two ? dirs : undefined]);
      expect(alertText(alert, w).title).toBe(`Raiders from ${from} are after your storehouses`);
      const m = bannerModel(w, triage(w, [alert]).critical);
      expect(m.title).toBe(`Raiders from ${from} are after your storehouses. They arrive in 2 months.`);
      expect(m.chip).toBe(`Raid from ${from} · 2 months`);
      expect(m.defence).toBe(`or build ${q.buildN} towers facing ${dirs.join(' and ')} (≈ ${q.buildCost} gold)`);
      expect(RAID_TEXT.towers(w)).toBe(`Build ${q.buildN} towers facing ${dirs.join(' and ')} (≈ ${q.buildCost} gold)`);
      expect(q.size).toBe(warn.size);                                                // the total, never a band
    }
  });
  it('says a band-less alert of the old shape as before (a direction only)', () => {
    const w = warned(false);
    expect(alertText({ code: 'raid_warning', dir: 'east' }, w).title).toBe('Raiders from the east are after your storehouses');
    expect(D.chip('east', 12)).toBe('Raid from the east · 12 d');
    expect(D.chip(['east', 'north'], 12)).toBe('Raid from the east and north · 12 d');
    expect(D.chip(['east', 'east'], 12)).toBe('Raid from the east · 12 d');
  });
  it('words the raid under way by the bands still on the map, and the report by both directions', () => {
    const w = city();
    addRaw(w, 'storehouse', 6, 15);
    warnTwo(w);
    raidDay(w, []);
    let alert = raidAlerts(w).find((x) => x.code === 'raid');
    expect([alert.left, alert.dirs]).toEqual([7, ['east', 'north']]);
    expect(alertText(alert, w).title).toBe('Raid from the east and north: 7 raiders');
    w.raid.active.raiders = w.raid.active.raiders.filter((u) => u.band);               // the east band is gone
    alert = raidAlerts(w).find((x) => x.code === 'raid');
    expect([alert.left, alert.dirs]).toEqual([3, ['north']]);
    expect(alertText(alert, w).title).toBe('Raid from the north: 3 raiders');
    const base = { index: 3, dir: 'east', size: 7, won: true, byTowers: 4, bySoldiers: 0, towers: 2, burned: 0, stolen: 0, day: 5, burnedKinds: [], fires: [] };
    expect(D.raidReport({ ...base, dirs: ['east', 'north'] })).toBe('Raid from the east and north beaten: 2 towers stopped 4 of 7; nothing lost.');
    expect(D.raidReport({ ...base, foodStolen: 30, fled: 3 })).toBe('Raid from the east beaten: 2 towers stopped 4 of 7; 30 food stolen, 3 residents fled.');
    expect(D.raidReport({ ...base, won: false, byTowers: 0, towers: 0, stolen: 40, foodStolen: 30, fled: 1 })).toBe('Raid from the east: raiders took 40 gold, took 30 food and drove out 1 resident.');
  });
  it('words the raid sheet and the tribute for the total, with both directions', async () => {
    for (const two of [false, true]) {
      const r = await rigUI({ width: 390, height: 844 });
      try {
        const w = r.world;
        w.raid.index = 4; w.raid.clockDay = 0;
        const size = 7;
        w.raid.warning = { index: 3, entry: { ...EAST }, dir: 'east', size, tribute: tributeFor(w, size), target: 'storehouse', day: w.day, arrives: w.day + 90, first: false, ...(two ? { second: { entry: { ...NORTH }, dir: 'north', size: 3 } } : {}) };
        const dirs = warningDirs(w.raid.warning), from = `the ${dirs.join(' and ')}`;
        r.ui.alerts.action({ code: 'raid_warning' }, 'tribute');
        const sheet = r.root.querySelector('#sheet');
        const q = tributeQuote(w);
        expect(sheet.querySelector('.arrives').textContent).toBe(`Raiders from ${from} are after your storehouses. They arrive in 3 months.`);
        expect(sheet.querySelector('.cancels').textContent).toBe(`Cancels the raid from ${from} (7 raiders${two ? ' in two bands' : ''}). The next raid still comes.`);
        expect(sheet.querySelector('.tribute-cost').textContent).toBe(`Pay ${tributeFor(w, size)} gold of tribute`);
        expect(sheet.querySelector('.small').textContent).toBe(D.capital(D.defenceLine(q, dirs)));
      } finally { r.cleanup(); }
    }
  });
});

describe('s45 two-band warning fits a phone', () => {
  const noStorage = { getItem: () => null, setItem: () => {} };
  const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
  async function bootScene(width, height) {
    const shell = await mountShell(width, height);
    const history = fakeHistory();
    const api = await boot(document, window, {
      root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams('skipTitle=1&seed=11&sample=1'),
      now: () => performance.now(), clock: () => 1760000000000, storage: noStorage,
      envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
      uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
    });
    return { api, root: shell.root, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
  }
  it('keeps the rows under the top bar inside the phone budget at 100% and 150% text, with both directions named', async () => {
    const wrong = [];
    for (const [width, height] of [[375, 667], [390, 844]]) {
      for (const textSize of [100, 150]) {
        const r = await bootScene(width, height);
        try {
          const g = r.api.game();
          g.ui.settings.set({ textSize, reducedMotion: 'on' });
          await frame();
          await devScene(r.api, 'raid2', { quick: true });
          await frame(); await frame();
          const w = g.world.raid.warning;
          expect(Boolean(w && w.second)).toBe(true);
          const m = measureRows(r.root);
          const limit = textSize >= 125 ? 0.4 : 0.3;
          if (m.rowsEnd / m.height > limit + 0.005) wrong.push(`${width}x${height} ${textSize}%: rows end at ${Math.round((m.rowsEnd / m.height) * 100)}% (limit ${limit * 100}%)`);
          if (m.rows > 2) wrong.push(`${width}x${height} ${textSize}%: ${m.rows} rows`);
          const chip = r.root.querySelector('#banner').textContent;
          const dirs = warningDirs(w);
          if (!chip.includes(`the ${dirs.join(' and ')}`)) wrong.push(`${width}x${height} ${textSize}%: the banner does not name both directions: ${chip}`);
          for (const n of r.root.querySelectorAll('#banner *')) if (n.scrollWidth > n.clientWidth + 1 && getComputedStyle(n).overflow !== 'visible') wrong.push(`${width}x${height} ${textSize}%: ${n.className} overflows`);
        } finally { r.cleanup(); }
      }
    }
    expect(wrong).toEqual([]);
  });
});

// Ruling 317's words, checked against the sim (Task 5 fixer): what a band strikes in what order, which edges a two-sided raid names
// (one when both bands come from one edge), and where its pins sit on the minimap.
describe('s45 raid words follow the sim', () => {
  function strikeTypes() {
    const w = makeTestWorld({ gold: 1000, raiderEntries: [EAST] });
    setRoad(w, 0, 13, 31, 13);
    w.milestone = 'market_town';
    addRaw(w, 'storehouse', 6, 15);
    addRaw(w, 'granary', 14, 15, { store: { grain: 100 } });
    addRaw(w, 'house', 22, 14, { tier: 3, residents: 10 });
    w.raid.index = 2; w.raid.clockDay = 0;
    w.raid.warning = { index: 1, entry: { ...EAST }, dir: 'east', size: 3, tribute: 240, target: 'storehouse', day: 900, arrives: 1000, first: false };
    w.day = 1000;
    const events = [];
    raidDay(w, events);
    for (let k = 0; k < 300 && w.raid.active; k++) { w.day += 1; raidDay(w, events); }
    return events.filter((e) => e.type === 'raid_strike').map((e) => (e.id in w.buildings ? w.buildings[e.id].type : '?'));
  }
  it('says the raider_targets tip in the order a band strikes: the usual targets, then a granary, then a home', () => {
    expect(strikeTypes()).toEqual(['storehouse', 'granary', 'house']);
    expect(TIP_TEXT.raider_targets).toBe('Raiders hit trading posts, storehouses, bazaars and temples first, then a granary, then a home: guard those.');
    expect(raiderTargetsTip()).toBe(TIP_TEXT.raider_targets);
    expect(TIP_TEXT.raider_targets.split(/\s+/).length).toBeLessThanOrEqual(20);
  });
  it('rewords the tip when the data changes, and the sim strikes in that new order', () => {
    const was = RAIDS.pillage.slice();
    try {
      RAIDS.pillage.splice(0, RAIDS.pillage.length, null, 'house', 'granary');
      expect(strikeTypes()).toEqual(['storehouse', 'house', 'granary']);
      expect(raiderTargetsTip()).toBe('Raiders hit trading posts, storehouses, bazaars and temples first, then a home, then a granary: guard those.');
    } finally { RAIDS.pillage.splice(0, RAIDS.pillage.length, ...was); }
    expect(raiderTargetsTip({ ...RAIDS, strikes: 2, targets: ['temple'] })).toBe('Raiders hit temples first, then a granary: guard those.');
  });

  // A warned raid on a map whose entries are all on the east edge (the second band falls back to the same edge), or on two edges.
  function twoBands(entries) {
    const w = city({ entries });
    const seed = seedWhere(3, true);
    w.seed = seed;
    due(w, { index: 3 });
    dayAt(w, 3000);
    return w;
  }
  it('names both edges in the tower goal, the title, the tribute sheet and the pins when the bands come from two edges', () => {
    const w = twoBands([EAST, NORTH]);
    const warn = w.raid.warning;
    expect(warn.second).toBeTruthy();
    expect(raidDirs(w)).toEqual(warningDirs(warn));
    expect(new Set(raidDirs(w)).size).toBe(2);
    const alert = raidAlerts(w).find((x) => x.code === 'raid_warning');
    const words = warningDirs(warn).join(' and ');
    expect(triggerEventGoals(w, [alert])).toEqual(['raid_tower']);
    expect(openGoals(w)[0].text).toBe(`Build towers facing ${words}`);
    expect(openGoals(w)[0].text.length).toBeLessThanOrEqual(36);
    expect(D.cancels(tributeQuote(w).dirs, warn.size)).toContain(' in two bands');
    expect(alert.points).toEqual(warningBands(warn).map((b) => ({ x: b.entry.x, y: b.entry.y, dir: b.dir })));
    const pins = minimapPins(w, [alert]);
    expect(pins.map((q) => [q.x, q.y, q.point])).toEqual(warningBands(warn).map((b) => [b.entry.x + 0.5, b.entry.y + 0.5, true]));
    expect(pins[0].dx !== pins[1].dx || pins[0].dy !== pins[1].dy).toBe(true);        // each pin's arrow points in from its own edge
    // One band on one edge: one goal direction, one pin, as before.
    const single = warned1();
    const one = raidAlerts(single).find((x) => x.code === 'raid_warning');
    expect([one.points, minimapPins(single, [one]).length]).toEqual([undefined, 1]);
    expect(raidDirs(single)).toEqual(['east']);
    function warned1() { const c = city(); c.raid.warning = { index: 3, entry: { ...EAST }, dir: 'east', size: 6, tribute: tributeFor(c, 6), target: 'storehouse', day: 910, arrives: 1000, first: false }; return c; }
  });
  it('says one direction, and no "two bands", when both bands come from one edge, with the size still the total', () => {
    const w = twoBands([{ x: 31, y: 10 }, { x: 31, y: 20 }]);
    const warn = w.raid.warning, q = tributeQuote(w);
    expect(warn.second).toBeTruthy();
    expect([warn.dir, warn.second.dir]).toEqual(['east', 'east']);
    const alert = raidAlerts(w).find((x) => x.code === 'raid_warning');
    expect(triggerEventGoals(w, [alert])).toEqual(['raid_tower']);
    expect(openGoals(w)[0].text).toBe('Build a tower facing the east');
    // Stage 4.6 (ruling 388): a mixed raid's title says how many come (the 4th raid may bring archers); the direction is said once either way.
    const who = S46_ARMY_TEXT.isMixedMix(warn.mix) ? `${warn.size} raiders from the east` : 'Raiders from the east';
    expect(alertText(alert, w).title).toBe(`${who} are after your ${RAID_TEXT.targets(warn.target)}`);
    const said = D.cancels(q.dirs, q.size);
    expect(said).toBe(`Cancels the raid from the east (${q.size} raiders). The next raid still comes.`);
    expect(said.includes('two bands')).toBe(false);
    expect(q.size).toBe(warn.size);                                                   // the total
    expect(minimapPins(w, [alert]).length).toBe(2);                                   // two bands, two entries on the map
    expect(RAID_TEXT.towers(w).includes(' and ')).toBe(false);
  });
  it('names the live bands of a raid under way on the map, one pin each', () => {
    const w = city();
    addRaw(w, 'storehouse', 6, 15);
    warnTwo(w);
    raidDay(w, []);
    let alert = raidAlerts(w).find((x) => x.code === 'raid');
    expect(alert.points.map((q) => q.dir)).toEqual(['east', 'north']);
    expect(minimapPins(w, [alert]).length).toBe(2);
    expect(raidDirs(w)).toEqual(['east', 'north']);
    w.raid.active.raiders = w.raid.active.raiders.filter((u) => u.band);                // the east band is gone
    alert = raidAlerts(w).find((x) => x.code === 'raid');
    expect(alert.points.map((q) => q.dir)).toEqual(['north']);
    expect(minimapPins(w, [alert]).length).toBe(1);
    expect(raidDirs(w)).toEqual(['north']);
  });
});
