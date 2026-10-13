// Task 5c (ruling 319): crime and unrest. Homes build crime risk daily when their tier is low, the city's mood is below 45 and
// unemployment is above 10%; a police post covers them by road reach; at the threshold a seeded draw causes a theft that skims 2%
// of the treasury (5-100) or takes 5-20 goods from the nearest storehouse or bazaar, and the home's risk resets. The mood row, the
// caption, the warning alert per district and the words come from the sim's own functions, each tested with the world set up
// both ways.
import { describe, it, expect } from '../harness.js';
import { CRIME, CRIME_SALT, CRIME_MOOD, CRIME_BANDS } from '../../src/data/crime.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { MILESTONES } from '../../src/data/progression.js';
import { CATEGORIES } from '../../src/data/ui.js';
import {
  crimeDay, crimeAlerts, crimeMood, crimeBand, crimeFactors, dailyCrimeRiskOf, crimeCoverage, crimeCovered, crimeCause, steal, goldLoot,
  unemployment, canCommitCrime,
} from '../../src/sim/crime.js';
import { hash2 } from '../../src/sim/rng.js';
import { riskOf } from '../../src/sim/costs.js';
import { isUnlocked } from '../../src/sim/progression.js';
import { updateMood } from '../../src/sim/mood.js';
import { computeAlerts } from '../../src/sim/alerts.js';
import { advanceDays } from '../../src/sim/clock.js';
import { serialize, deserialize, validateWorld } from '../../src/save/serialize.js';
import { migrate } from '../../src/save/migrate.js';
import { alertText, MOOD_NAMES, CRIME_TEXT } from '../../src/ui/text.js';
import { triage, CRITICAL } from '../../src/ui/alerts.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

const near = (a, b) => Math.abs(a - b) < 1e-9;
const FULL = { workforce: 100, employed: 100, jobs: 100, shortLevels: [] };

// A 32x32 Market town (mood 60, full employment) with a road along y = 13 and homes of the given tier beside it.
function town({ homes = [[2, 14], [10, 14]], tier = 3, residents = 8, gold = 5000 } = {}) {
  const w = makeTestWorld({ gold });
  w.milestone = 'market_town';
  w.mood = 60;
  w.labour = { ...FULL };
  setRoad(w, 0, 13, 31, 13);
  const ids = homes.map(([x, y]) => addRaw(w, 'house', x, y, { tier, residents }).id);
  staffAll(w);
  return { w, ids };
}
const post = (w, x = 6, y = 14) => { const b = addRaw(w, 'police_post', x, y); staffAll(w); return b; };
const day = (w, d) => { w.day = d; return w; };
function dayWhere(w, id, kind, ok, from = 1000) {
  for (let d = from; d < from + 5000; d++) if ((hash2(id, d, (w.seed + CRIME_SALT[kind]) | 0) < CRIME.theftChance) === ok) return d;
  throw new Error('no day');
}
const unhappy = (w) => { w.mood = 30; };
const jobless = (w) => { w.labour = { workforce: 100, employed: 80, jobs: 80, shortLevels: [] }; };

describe('s45 crime data', () => {
  it('prices the police post at 50 gold, 4 upkeep, 1 worker, reach 8, in Services, and keeps its reach equal to the data', () => {
    const b = BUILDINGS.police_post;
    expect([b.cost, b.upkeep, b.workers, b.reach, b.w, b.d, b.category, b.needsRoad]).toEqual([50, 4, 1, 8, 1, 1, 'services', true]);   // 1 worker, not the plan's 4: the village's wage bill
    expect(CRIME.reach).toBe(b.reach);
    expect(CATEGORIES.find((c) => c.id === 'services').items).toContain('police_post');
  });
  it('unlocks the police post with Market town and not before', () => {
    const w = makeTestWorld();
    expect(MILESTONES.find((m) => m.id === 'market_town').unlocks).toContain('police_post');
    w.milestone = 'town';
    expect(isUnlocked(w, 'police_post')).toBe(false);
    w.milestone = 'market_town';
    expect(isUnlocked(w, 'police_post')).toBe(true);
  });
  it('gives the numbers the plan names', () => {
    expect([CRIME.moodBelow, CRIME.unemployedAbove, CRIME.goldShare, CRIME.goldRange, CRIME.goodsRange, CRIME.lowTierMax]).toEqual([45, 0.1, 0.02, [5, 100], [5, 20], 4]);
    expect([CRIME_MOOD.each, CRIME_MOOD.max, CRIME_MOOD.days]).toEqual([-1, -5, 90]);
  });
});

describe('s45 crime risk', () => {
  it('builds nothing when the tier is high, the mood good and the jobs plentiful', () => {
    const { w, ids } = town({ tier: 5 });
    expect(crimeFactors(w, w.buildings[ids[0]])).toEqual({ tier: false, mood: false, jobs: false });
    expect(dailyCrimeRiskOf(w, w.buildings[ids[0]])).toBe(0);
  });
  it('adds a rate for each thing that is true: a low tier, a mood below 45, unemployment above 10%', () => {
    const { w, ids } = town({ tier: 4 });
    const h = w.buildings[ids[0]];
    expect(near(dailyCrimeRiskOf(w, h), CRIME.lowTier)).toBe(true);                       // tier 4 (a House) is low
    h.tier = 5;
    expect(dailyCrimeRiskOf(w, h)).toBe(0);                                                  // tier 5 (a Townhouse) is not
    w.mood = 45;
    expect(crimeFactors(w, h).mood).toBe(false);                                             // exactly 45 is not below it
    w.mood = 44;
    expect(near(dailyCrimeRiskOf(w, h), CRIME.lowMood)).toBe(true);
    jobless(w);
    expect(unemployment(w)).toBe(0.2);
    expect(near(dailyCrimeRiskOf(w, h), CRIME.lowMood + CRIME.jobless)).toBe(true);
    w.labour = { workforce: 100, employed: 90, jobs: 90, shortLevels: [] };
    expect(crimeFactors(w, h).jobs).toBe(false);                                             // exactly 10% is not above it
    h.tier = 1;
    jobless(w);
    expect(near(dailyCrimeRiskOf(w, h), CRIME.lowTier + CRIME.lowMood + CRIME.jobless)).toBe(true);
    w.labour = { workforce: 0, employed: 0, jobs: 0, shortLevels: [] };
    expect(unemployment(w)).toBe(0);                                                         // no workforce: no unemployment
  });
  it('multiplies by the difficulty risk and cuts it by the police post times coverage', () => {
    const { w, ids } = town({ homes: [[6, 14]] });
    const h = w.buildings[ids[0]];
    unhappy(w);
    const bare = dailyCrimeRiskOf(w, h);
    expect(near(bare, (CRIME.lowTier + CRIME.lowMood) * riskOf(w))).toBe(true);
    w.difficulty = 'hard';
    expect(near(dailyCrimeRiskOf(w, h), (CRIME.lowTier + CRIME.lowMood) * 1.5)).toBe(true);
    w.difficulty = 'normal';
    const p = post(w, 7, 14);
    expect(crimeCoverage(w).get(h.id)).toBe(1);
    expect(near(dailyCrimeRiskOf(w, h), bare * (1 - CRIME.cut))).toBe(true);
    p.staff = 0;
    expect(crimeCoverage(w).get(h.id)).toBe(undefined);
    expect(near(dailyCrimeRiskOf(w, h), bare)).toBe(true);
  });
  it('covers by road reach of 8, and not beyond', () => {
    const { w, ids } = town({ homes: [[2, 14], [28, 14]] });
    post(w, 6, 14);
    const [a, b] = ids.map((id) => w.buildings[id]);
    expect([crimeCovered(w, a), crimeCovered(w, b)]).toEqual([true, false]);
    expect([crimeCause(w, a).cause, crimeCause(w, b).cause]).toEqual(['covered', 'none']);
  });
  it('builds nothing before Market town, on Peaceful, or for an empty plot or a home with nobody in it', () => {
    const { w, ids } = town({ tier: 2 });
    const h = w.buildings[ids[0]];
    expect(dailyCrimeRiskOf(w, h)).toBeGreaterThan(0);
    w.milestone = 'town';
    expect(dailyCrimeRiskOf(w, h)).toBe(0);
    crimeDay(day(w, 4));
    expect(h.crime).toBe(0);
    w.milestone = 'market_town';
    w.difficulty = 'peaceful';
    expect(dailyCrimeRiskOf(w, h)).toBe(0);
    crimeDay(day(w, 5));
    expect(h.crime).toBe(0);
    w.difficulty = 'normal';
    h.residents = 0;
    expect(canCommitCrime(h)).toBe(false);
    crimeDay(day(w, 6));
    expect(h.crime).toBe(0);
    h.residents = 8; h.tier = 0;
    expect(canCommitCrime(h)).toBe(false);
  });
  it('adds the day\'s risk when the day runs, and bands as the overlay does', () => {
    const { w, ids } = town();
    crimeDay(day(w, 10));
    crimeDay(day(w, 11));
    expect(near(w.buildings[ids[0]].crime, 2 * CRIME.lowTier)).toBe(true);
    expect(CRIME_BANDS).toEqual([0, 25, 60, 100]);
    expect([0, 24.9, 25, 59, 60, 99, 100].map(crimeBand)).toEqual([0, 0, 1, 1, 2, 2, 3]);
  });
});

describe('s45 thefts', () => {
  it('draws a theft at the threshold on a seeded 2% draw, and never below it', () => {
    const { w, ids } = town({ homes: [[2, 14]] });
    const h = w.buildings[ids[0]];
    const yes = dayWhere(w, h.id, 'theft', true), no = dayWhere(w, h.id, 'theft', false);
    h.crime = CRIME.threshold - 5;
    crimeDay(day(w, yes));
    expect(w.tally.thefts).toBe(0);
    h.crime = CRIME.threshold;
    crimeDay(day(w, no));
    expect(w.tally.thefts).toBe(0);
    h.crime = CRIME.threshold;
    const events = [];
    crimeDay(day(w, yes), events);
    expect(w.tally.thefts).toBe(1);
    expect(h.crime).toBe(0);
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('theft');
  });
  it('skims 2% of the treasury, at least 5 and at most 100, and never more than the treasury holds', () => {
    const at = (gold) => { const { w } = town({ gold }); return goldLoot(w); };
    expect([at(100), at(250), at(1000), at(2500), at(5000), at(20000)]).toEqual([5, 5, 20, 50, 100, 100]);
    expect([at(4), at(0), at(-100)]).toEqual([0, 0, 0]);                                       // too little to take
    expect(at(5)).toBe(5);
    const { w, ids } = town({ gold: 2000 });
    const events = [];
    steal(day(w, 50), w.buildings[ids[0]], events);
    expect(events[0]).toEqual({ type: 'theft', id: ids[0], kind: 'gold', amount: 40, near: null });
    expect(w.gold).toBe(1960);
    expect(w.tally.theftGold).toBe(40);
    expect(w.danger.theftDays).toEqual([50]);
  });
  it('takes 5-20 of one good from the nearest storehouse or bazaar that holds any, when there is no gold to take', () => {
    const { w, ids } = town({ homes: [[2, 14]], gold: 0 });
    const far = addRaw(w, 'storehouse', 20, 14, { store: { clay: 300 } });
    const nearStore = addRaw(w, 'bazaar', 6, 14, { store: { grain: 100, pottery: 50 } });
    const events = [];
    const ev = steal(day(w, 70), w.buildings[ids[0]], events);
    expect(ev.kind).toBe('goods');
    expect(ev.from).toBe(nearStore.id);                                                          // the nearer of the two
    expect(ev.store).toBe('bazaar');
    expect(ev.amount).toBeGreaterThanOrEqual(5);
    expect(ev.amount).toBeLessThanOrEqual(20);
    expect(['grain', 'pottery']).toContain(ev.good);
    expect((nearStore.store.grain || 0) + (nearStore.store.pottery || 0)).toBe(150 - ev.amount);
    expect(far.store.clay).toBe(300);
    expect(w.gold).toBe(0);
    expect(w.tally.theftGold).toBe(0);                                                           // goods, not gold
    expect(w.tally.thefts).toBe(1);
    // An empty store is skipped and a store holding fewer than 5 gives all it has.
    nearStore.store = { pottery: 3 };
    const ev2 = steal(day(w, 71), w.buildings[ids[0]], []);
    expect([ev2.good, ev2.amount, ev2.from]).toEqual(['pottery', 3, nearStore.id]);
    expect(nearStore.store).toEqual({});
    nearStore.store = {};
    const ev3 = steal(day(w, 72), w.buildings[ids[0]], []);
    expect(ev3.from).toBe(far.id);
  });
  it('takes nothing, and the home stays at the threshold, when there is neither gold nor goods; with both, a seeded draw picks', () => {
    const { w, ids } = town({ homes: [[2, 14]], gold: 0 });
    const h = w.buildings[ids[0]];
    h.crime = CRIME.threshold;
    expect(steal(day(w, 5), h, [])).toBe(null);
    expect(h.crime).toBe(CRIME.threshold);
    expect(w.tally.thefts).toBe(0);
    const { w: w2, ids: ids2 } = town({ homes: [[2, 14]], gold: 5000 });
    addRaw(w2, 'storehouse', 12, 14, { store: { clay: 100000 } });
    const kinds = new Set();
    for (let d = 100; d < 200; d++) {
      const ev = steal(day(w2, d), w2.buildings[ids2[0]], []);
      const wantGold = hash2(ids2[0], d, (w2.seed + CRIME_SALT.kind) | 0) < 0.5;
      expect(ev.kind).toBe(wantGold ? 'gold' : 'goods');
      kinds.add(ev.kind);
    }
    expect(kinds.size).toBe(2);
  });
  it('names the building nearest the home in the event, for the caption', () => {
    const { w, ids } = town({ homes: [[2, 14]], gold: 2000 });
    addRaw(w, 'bazaar', 4, 14);
    const ev = steal(day(w, 3), w.buildings[ids[0]], []);
    expect(ev.near).toBe('bazaar');
    expect(CRIME_TEXT.caption(ev)).toBe('A thief took 40 gold from the treasury near the bazaar');
    expect(CRIME_TEXT.caption({ kind: 'gold', amount: 7, near: null })).toBe('A thief took 7 gold from the treasury');
    expect(CRIME_TEXT.caption({ kind: 'goods', amount: 12, good: 'pottery', store: 'storehouse' })).toBe('A thief took 12 pottery from the storehouse');
  });
  it('is the same on any run of the same world, and a reload changes nothing', () => {
    const run = () => {
      const { w, ids } = town({ homes: [[2, 14], [3, 14], [4, 14]], tier: 2 });
      unhappy(w); jobless(w);
      for (const id of ids) w.buildings[id].crime = CRIME.threshold;
      advanceDays(w, 120);
      return w;
    };
    const a = run(), b = run();
    expect(a.tally.thefts).toBeGreaterThan(0);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const c = deserialize(serialize(a));
    advanceDays(a, 40); advanceDays(c, 40);
    expect(JSON.stringify(a)).toBe(JSON.stringify(c));
  });
  it('is off on Peaceful', () => {
    const { w, ids } = town({ homes: [[2, 14]] });
    const h = w.buildings[ids[0]];
    w.difficulty = 'peaceful';
    h.crime = 500;
    crimeDay(day(w, dayWhere(w, h.id, 'theft', true)));
    expect(w.tally.thefts).toBe(0);
  });
});

describe('s45 crime alerts, mood and words', () => {
  it('raises one warning (never critical) per district of High-risk homes no staffed police post reaches', () => {
    const { w, ids } = town({ homes: [[2, 14], [3, 14], [26, 14], [27, 14]] });
    const [a, b, c, d] = ids.map((id) => w.buildings[id]);
    for (const h of [a, b, c, d]) h.crime = 59;
    expect(crimeAlerts(w)).toEqual([]);                                                          // Rising is not an alert
    for (const h of [a, b, c, d]) h.crime = 60;
    expect(crimeAlerts(w)).toEqual([{ code: 'crime_risk', id: a.id, ids: [a.id, b.id], count: 2 }, { code: 'crime_risk', id: c.id, ids: [c.id, d.id], count: 2 }]);
    expect(CRITICAL.has('crime_risk')).toBe(false);
    const t = triage(w, computeAlerts(w));
    expect(t.ordinary.filter((x) => x.code === 'crime_risk').length).toBe(2);
    expect(t.critical.some((x) => x.code === 'crime_risk')).toBe(false);
    const p = post(w, 5, 14);                                                                    // covers the west district only
    expect(crimeAlerts(w).map((x) => x.id)).toEqual([c.id]);
    p.staff = 0;
    expect(crimeAlerts(w).length).toBe(2);
    w.milestone = 'town';
    expect(crimeAlerts(w)).toEqual([]);
  });
  it('words the alert from the sim\'s reason and the count, both ways', () => {
    const { w, ids } = town({ homes: [[6, 14], [7, 14]] });
    for (const id of ids) w.buildings[id].crime = 70;
    const [alert] = crimeAlerts(w);
    expect(alert.count).toBe(2);
    expect(alertText(alert, w)).toEqual({ title: '2 homes have a high crime risk', fix: CRIME_TEXT.cause.none });
    expect(CRIME_TEXT.cause.none).toBe('Build a police post nearby');
    w.buildings[ids[1]].crime = 10;
    const [one] = crimeAlerts(w);
    expect(alertText(one, w).title).toBe('1 home has a high crime risk');
    const p = post(w, 8, 14);
    p.staff = 0;
    expect(alertText(crimeAlerts(w)[0], w).fix).toBe(CRIME_TEXT.cause.short);
    p.staff = 1; p.paused = true;
    expect(crimeCause(w, w.buildings[ids[0]]).cause).toBe('paused');
    p.paused = false;
    expect(crimeCause(w, w.buildings[ids[0]]).cause).toBe('covered');
  });
  it('takes 1 mood for each theft in the last 90 days, at most 5, and forgets older ones', () => {
    const { w, ids } = town();
    expect(crimeMood(w)).toEqual({});
    const moods = [];
    for (let i = 0; i < 6; i++) { steal(day(w, 100 + i), w.buildings[ids[0]], []); moods.push(crimeMood(w).thefts); }
    expect(moods).toEqual([-1, -2, -3, -4, -5, -5]);
    w.labour = { ...FULL };
    updateMood(w);
    expect(w.moodBreakdown.thefts).toBe(-5);
    expect(MOOD_NAMES.thefts).toBe('Thefts (−1 each in the last 90 days, at most −5)');
    w.day = 190;                                                                                 // all six (days 100-105) are within 90 days
    expect(crimeMood(w).thefts).toBe(-5);
    w.day = 195;                                                                                 // only day 105 still is
    expect(crimeMood(w).thefts).toBe(-1);
    crimeDay(day(w, 300));                                                                       // the day's step forgets what is out of the window
    expect(w.danger.theftDays).toEqual([]);
    updateMood(w);
    expect('thefts' in w.moodBreakdown).toBe(false);
  });
});

describe('s45 crime save', () => {
  it('keeps the thefts in the save, and a save from before the field validates and starts with none', () => {
    const { w, ids } = town();
    steal(day(w, 9), w.buildings[ids[0]], []);
    const back = deserialize(serialize(w));
    expect(back.danger.theftDays).toEqual([9]);
    const old = JSON.parse(serialize(w));
    delete old.danger.theftDays;                                                                  // a version 6 save written before this field
    expect(validateWorld(old)).toBe(true);
    const bad = JSON.parse(serialize(w));
    bad.danger.theftDays = ['x'];
    expect(validateWorld(bad)).toBe(false);
  });
  it('gives a migrated version 5 city an empty theft list', () => {
    const { w } = town();
    const v5 = JSON.parse(serialize(w));
    delete v5.danger.theftDays;
    v5.version = 5;
    delete v5.mapVariant;
    const up = migrate(v5);
    expect(up.danger.theftDays).toEqual([]);
  });
});
