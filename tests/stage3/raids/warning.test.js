import { describe, it, expect } from '../../harness.js';
import { raidDay, raidAlerts, raidSize, tributeFor, tributeQuote, raidTargetKind, payTribute } from '../../../src/sim/raids.js';
import { tickDay } from '../../../src/sim/clock.js';
import { hash2 } from '../../../src/sim/rng.js';
import { costOf } from '../../../src/sim/costs.js';
import { RAIDS, RAID_SALT, DEFENCE, FESTIVAL } from '../../../src/data/raids.js';
import { alertText, reasonText, MOOD_NAMES, RAID_TEXT } from '../../../src/ui/text.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';

const ENTRIES = [{ x: 31, y: 16 }, { x: 16, y: 0 }];

// A 32x32 Market town with a road along y = 10, the two raider entries above, and `people` living in one home.
function city({ people = 0, gold = 1000, entries = ENTRIES } = {}) {
  const w = makeTestWorld({ gold, raiderEntries: entries });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = 'market_town';
  addRaw(w, 'house', 2, 11, { tier: 4, residents: people });
  return w;
}

// The day's raid step on a given day, as tickDay runs it (world.day is the day being simulated).
function dayAt(w, day, events = []) {
  w.day = day;
  raidDay(w, events);
  return events;
}

describe('s3 raids clock and warning', () => {
  it('starts the clock the first day the city has 250 people, keeps it running, and never on Peaceful', () => {
    const w = city({ people: RAIDS.clockPeople - 1 });
    dayAt(w, 50);
    expect([w.raid.clockDay, w.raid.nextWarnDay]).toEqual([null, null]);
    w.buildings[1].residents = RAIDS.clockPeople;
    dayAt(w, 100);
    expect([w.raid.clockDay, w.raid.nextWarnDay]).toEqual([100, 100 + RAIDS.firstWarnAfter]);
    w.buildings[1].residents = 10;                                                    // people fall: the clock keeps running
    dayAt(w, 200);
    expect([w.raid.clockDay, w.raid.nextWarnDay]).toEqual([100, 820]);
    const p = city({ people: 400 });
    p.difficulty = 'peaceful';
    dayAt(p, 5000);
    expect([p.raid.clockDay, p.raid.nextWarnDay, p.raid.warning]).toEqual([null, null, null]);
    const peak = city();
    peak.tally.peakPeople = RAIDS.clockPeople;                                        // a city that had 250 has its clock
    dayAt(peak, 30);
    expect(peak.raid.clockDay).toBe(30);
  });
  it('warns exactly two years later with the first raid: 3 raiders, no tribute, an entry by the seed, and a pause', () => {
    const w = city({ people: 300 });
    w.speed = 3;
    dayAt(w, 100);
    expect(dayAt(w, 819)).toEqual([]);
    expect(w.raid.warning).toBe(null);
    const events = dayAt(w, 820);
    const entry = ENTRIES[Math.floor(hash2(w.seed, 0, RAID_SALT.entry) * ENTRIES.length)];
    const dir = entry.x === 31 ? 'east' : 'north';
    expect(w.raid.warning).toEqual({ index: 0, entry, dir, size: RAIDS.firstSize, tribute: null, target: 'building', day: 820, arrives: 820 + RAIDS.warningDays, first: true });
    expect(events).toEqual([{ type: 'raid_warning', index: 0, entry, dir, size: 3, tribute: null, target: 'building', arrives: 910, first: true }]);
    expect([w.speed, w.raid.index]).toEqual([0, 1]);                                  // the first warning pauses the game
    expect(tributeQuote(w).hidden).toBe(true);
    expect(payTribute(w).reason).toBe('first_raid');
    expect(dayAt(w, 821)).toEqual([]);                                               // one warning at a time
  });
  it('fixes a later raid\'s size, tribute and target at the warning and drops 2x or 3x to 1x', () => {
    const w = city({ people: 600, gold: 2000 });
    addRaw(w, 'storehouse', 6, 11);
    Object.assign(w.raid, { clockDay: 0, nextWarnDay: 3000, index: 1 });
    w.speed = 3;
    const size = raidSize(w);
    expect(size).toBeGreaterThan(RAIDS.firstSize);
    dayAt(w, 3000);
    const warn = w.raid.warning;
    expect([warn.index, warn.size, warn.tribute, warn.target, warn.first, warn.arrives]).toEqual([1, size, tributeFor(w, size), 'storehouse', false, 3090]);
    expect([w.speed, w.raid.index]).toEqual([1, 2]);
    w.buildings[1].residents = 10;                                                    // the size and tribute are fixed now
    w.gold = 50000;
    expect([w.raid.warning.size, w.raid.warning.tribute]).toEqual([size, tributeFor(w, size)]);
    const p = city({ people: 600 });
    Object.assign(p.raid, { clockDay: 0, nextWarnDay: 3000, index: 1 });
    p.speed = 0;
    dayAt(p, 3000);
    expect(p.speed).toBe(0);                                                          // a paused game stays paused
    const one = city({ people: 600 });
    Object.assign(one.raid, { clockDay: 0, nextWarnDay: 3000, index: 1 });
    one.speed = 1;
    dayAt(one, 3000);
    expect(one.speed).toBe(1);
  });
  it('raises no warning on a map without raider entries, nor while a raid is under way', () => {
    const w = city({ people: 300, entries: [] });
    Object.assign(w.raid, { clockDay: 0, nextWarnDay: 720 });
    dayAt(w, 720);
    expect([w.raid.warning, w.raid.index]).toEqual([null, 0]);
    const busy = city({ people: 300 });
    Object.assign(busy.raid, { clockDay: 0, nextWarnDay: 720, index: 1 });
    busy.raid.active = { index: 0, entry: { x: 31, y: 16 }, dir: 'east', size: 3, target: 'building', day: 700, raiders: [], phase: 'leave', targetId: null, struck: [], wait: 0, byTowers: 0, bySoldiers: 0, burned: 0, stolen: 0, shots: [] };
    dayAt(busy, 720);
    expect(busy.raid.warning).toBe(null);
  });
  it('comes through tickDay with the same draws for the same seed', () => {
    const run = () => {
      const w = city({ people: 0 });
      w.tally.peakPeople = RAIDS.clockPeople;
      const events = [];
      for (let d = 0; d < RAIDS.firstWarnAfter + 1; d++) tickDay(w, events);
      return { w, events: events.filter((e) => e.type === 'raid_warning') };
    };
    const a = run(), b = run();
    expect([a.w.raid.clockDay, a.w.raid.warning.day]).toEqual([0, RAIDS.firstWarnAfter]);
    expect(a.events.length).toBe(1);
    expect(JSON.stringify(a.w.raid)).toBe(JSON.stringify(b.w.raid));
  });
});

describe('s3 raids alerts and words', () => {
  const warned = (opts = {}) => {
    const w = city({ people: 600, ...opts });
    addRaw(w, 'storehouse', 6, 11);
    w.raid.index = 2;
    w.raid.warning = { index: 1, entry: { x: 31, y: 16 }, dir: 'east', size: 8, tribute: 240, target: 'storehouse', day: 800, arrives: 890, first: false };
    return w;
  };
  it('pins the warning at its entry and the raid at the band\'s centre', () => {
    const w = warned();
    expect(raidAlerts(w)).toEqual([{ code: 'raid_warning', x: 31, y: 16, dir: 'east', arrives: 890 }]);
    w.raid.warning = null;
    w.raid.active = {
      index: 1, entry: { x: 31, y: 16 }, dir: 'east', size: 8, target: 'storehouse', day: 890, phase: 'attack', targetId: null, struck: [], wait: 0,
      byTowers: 0, bySoldiers: 0, burned: 0, stolen: 0, shots: [], raiders: [{ id: 1, x: 20.5, y: 16.5, hp: 10, hit: false }, { id: 2, x: 22.5, y: 14.5, hp: 4, hit: true }],
    };
    expect(raidAlerts(w)).toEqual([{ code: 'raid', x: 21, y: 15, left: 2 }]);
    w.raid.active = null;
    expect(raidAlerts(w)).toEqual([]);
  });
  it('names the direction and the target, and the towers that would beat it, from the sim\'s own quote', () => {
    const w = warned();
    const alert = raidAlerts(w)[0];
    const q = tributeQuote(w);
    expect([q.towersNeeded, q.towersHave, q.buildN]).toEqual([3, 0, 3]);
    expect(alertText(alert, w)).toEqual({ title: 'Raiders from the east are after your storehouses', fix: `Build 3 towers facing east (≈ ${3 * costOf(w, 'tower')} gold)` });
    w.difficulty = 'hard';
    expect(alertText(alert, w).fix).toBe(`Build 3 towers facing east (≈ ${tributeQuote(w).buildCost} gold)`);
    expect(tributeQuote(w).buildCost).toBe(3 * costOf(w, 'tower'));
    w.difficulty = 'normal';
    addRaw(w, 'tower', 12, 11); addRaw(w, 'tower', 14, 11);
    staffAll(w);
    expect(alertText(alert, w).fix).toBe(`Build 1 tower facing east (≈ ${costOf(w, 'tower')} gold)`);
    addRaw(w, 'tower', 16, 11);
    staffAll(w);
    expect(tributeQuote(w).buildN).toBe(0);
    expect(alertText(alert, w).fix).toBe('Your towers can beat this raid');
    w.buildings[w.nextId - 1].paused = true;                                          // a paused tower is not working
    expect(alertText(alert, w).fix).toBe(`Build 1 tower facing east (≈ ${costOf(w, 'tower')} gold)`);
    w.raid.warning.target = 'trading_post';
    expect(alertText(alert, w).title).toBe('Raiders from the east are after your trading posts');
    w.raid.warning.target = 'building';
    expect(alertText(alert, w).title).toBe('Raiders from the east are after your buildings');
    expect(RAID_TEXT.towers(city())).toBe('');
  });
  it('words the raid by its phase, with the towers\' range and the soldiers\' patrol from the data', () => {
    const w = city();
    w.raid.active = {
      index: 0, entry: { x: 16, y: 0 }, dir: 'north', size: 3, target: 'building', day: 900, phase: 'attack', targetId: null, struck: [], wait: 0,
      byTowers: 0, bySoldiers: 0, burned: 0, stolen: 0, shots: [], raiders: [{ id: 1, x: 16.5, y: 3.5, hp: 10, hit: false }, { id: 2, x: 16.5, y: 3.5, hp: 10, hit: false }],
    };
    const fix = `Towers hit raiders within ${DEFENCE.towerRange} tiles; soldiers fight within ${DEFENCE.patrol} tiles of their barracks`;
    expect(alertText(raidAlerts(w)[0], w)).toEqual({ title: 'Raid from the north: 2 raiders', fix });
    w.raid.active.phase = 'strike';
    expect(alertText(raidAlerts(w)[0], w).title).toBe('Raid from the north: 2 raiders');
    w.raid.active.phase = 'leave';
    expect(alertText(raidAlerts(w)[0], w)).toEqual({ title: 'Raid from the north: 2 raiders leaving', fix });
    w.raid.active.phase = 'retreat';
    w.raid.active.raiders.pop();
    expect(alertText(raidAlerts(w)[0], w)).toEqual({ title: 'Raid from the north: 1 raider falling back', fix: 'Towers keep shooting as they go' });
  });
  it('words tribute and festival refusals and the raid and festival mood rows', () => {
    expect(['no_warning', 'first_raid', 'below_zero', 'no_temple', 'too_soon'].map(reasonText)).toEqual([
      'No raid is on its way', "The first raid can't be paid off", "Tribute can't put the treasury below 0", 'Needs a working temple', 'One festival every 12 months',
    ]);
    expect(FESTIVAL.every).toBe(12 * 30);
    const w = city();
    expect(reasonText(payTribute(w).reason)).toBe('No raid is on its way');
    expect([MOOD_NAMES.raid, MOOD_NAMES.festival]).toEqual(['Recent raid', 'Festival']);
    expect(raidTargetKind(w)).toBe('building');
  });
});
