// Task 5b (ruling 318): disease. Homes build health risk daily (faster with no well, crowded, or poor ground), a physician covers
// them like a firehouse, a home at the threshold falls ill on a seeded 2% draw for 20-40 days, loses a resident a day up to a
// quarter of its people, spreads to edge neighbours at 4% a day unless covered, and a covered illness ends twice as fast. The
// mood row, the warning alert and the words come from the sim's own functions, and each is tested with the world set up both ways.
import { describe, it, expect } from '../harness.js';
import { HEALTH, HEALTH_SALT, HEALTH_MOOD, HEALTH_BANDS } from '../../src/data/health.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { MILESTONES } from '../../src/data/progression.js';
import { CATEGORIES } from '../../src/data/ui.js';
import {
  healthDay, healthAlerts, healthMood, healthBand, healthFactors, dailyHealthRiskOf, healthCoverage, healthCovered, healthCause,
  healthRiskOf, fallIll, illHomes, canFallIll,
} from '../../src/sim/health.js';
import { hash2 } from '../../src/sim/rng.js';
import { riskOf } from '../../src/sim/costs.js';
import { isUnlocked } from '../../src/sim/progression.js';
import { updateMood } from '../../src/sim/mood.js';
import { computeAlerts } from '../../src/sim/alerts.js';
import { advanceDays } from '../../src/sim/clock.js';
import { serialize, deserialize, validateWorld } from '../../src/save/serialize.js';
import { alertText, MOOD_NAMES, HEALTH_TEXT } from '../../src/ui/text.js';
import { triage, CRITICAL } from '../../src/ui/alerts.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';

const near = (a, b) => Math.abs(a - b) < 1e-9;

// A 32x32 Town with a road along y = 13 and one home on each side of it at x = 2, 10 (tier 3, 8 people each).
function town({ homes = [[2, 14], [10, 14]], tier = 3, residents = 8, well = false } = {}) {
  const w = makeTestWorld({ gold: 5000 });
  w.milestone = 'town';
  setRoad(w, 0, 13, 31, 13);
  const ids = homes.map(([x, y]) => addRaw(w, 'house', x, y, { tier, residents }).id);
  if (well) addRaw(w, 'well', 5, 14);
  staffAll(w);
  return { w, ids };
}
const physician = (w, x = 6, y = 14, extra = {}) => { const b = addRaw(w, 'physician', x, y, extra); staffAll(w); return b; };
const day = (w, d) => { w.day = d; return w; };
// A day on which the home's illness draw succeeds (or fails), searching forward from `from`.
function dayWhere(w, id, ok, from = 1000) {
  for (let d = from; d < from + 5000; d++) if ((hash2(id, d, (w.seed + HEALTH_SALT.fall) | 0) < HEALTH.illnessChance) === ok) return d;
  throw new Error('no day');
}

describe('s45 health data', () => {
  it('prices the physician at 60 gold, 4 upkeep, 1 worker, reach 8, in Services, and keeps its reach equal to the data', () => {
    const b = BUILDINGS.physician;
    expect([b.cost, b.upkeep, b.workers, b.reach, b.w, b.d, b.category, b.needsRoad]).toEqual([60, 4, 1, 8, 1, 1, 'services', true]);   // 1 worker, not the plan's 4: the village's wage bill (see the Task 5 balance note)
    expect(HEALTH.reach).toBe(b.reach);
    expect(CATEGORIES.find((c) => c.id === 'services').items).toContain('physician');
  });
  it('unlocks the physician with Town and not before', () => {
    const w = makeTestWorld();
    expect(MILESTONES.find((m) => m.id === 'town').unlocks).toContain('physician');
    w.milestone = 'village';
    expect(isUnlocked(w, 'physician')).toBe(false);
    w.milestone = 'town';
    expect(isUnlocked(w, 'physician')).toBe(true);
  });
  it('gives the numbers the plan names', () => {
    expect([HEALTH.illnessChance, HEALTH.illDays, HEALTH.lossShare, HEALTH.spreadChance, HEALTH.coverFactor, HEALTH.crowdedPerTile]).toEqual([0.02, [20, 40], 0.25, 0.04, 2, 20]);
    expect([HEALTH_MOOD.each, HEALTH_MOOD.max]).toEqual([-2, -8]);
  });
});

describe('s45 health risk', () => {
  it('builds base risk a day, more with no well, more when crowded, more on poor ground, as pure functions of the state', () => {
    const { w, ids } = town({ homes: [[2, 14], [10, 14]], well: true });
    const [a, b] = ids.map((id) => w.buildings[id]);
    const wellNear = (h) => healthFactors(w, h).well === false;
    expect([wellNear(a), wellNear(b)]).toEqual([true, false]);                       // the well at x = 5 reaches the first, not the second
    expect(near(dailyHealthRiskOf(w, a), HEALTH.base)).toBe(true);                      // watered, not crowded, fine ground
    expect(near(dailyHealthRiskOf(w, b), HEALTH.base + HEALTH.noWell)).toBe(true);        // no well reaches it
    b.tier = 5; b.residents = 22;                                                        // a Townhouse over 20 a tile
    expect(healthFactors(w, b).crowded).toBe(true);
    expect(near(dailyHealthRiskOf(w, b), HEALTH.base + HEALTH.noWell + HEALTH.crowded)).toBe(true);
    b.residents = 20;                                                                    // exactly 20 a tile is not crowded
    expect(healthFactors(w, b).crowded).toBe(false);
    addRaw(w, 'granary', 12, 14);                                                        // a granary beside it: desirability below 0
    expect(healthFactors(w, b).poor).toBe(true);
    expect(near(dailyHealthRiskOf(w, b), HEALTH.base + HEALTH.noWell + HEALTH.poorGround)).toBe(true);
    expect(healthFactors(w, a).poor).toBe(false);
  });
  it('counts a 2x2 home as crowded by residents per tile', () => {
    const w = makeTestWorld({ gold: 5000 });
    w.milestone = 'town';
    setRoad(w, 0, 13, 31, 13);
    const m = addRaw(w, 'house', 4, 14, { tier: 6, residents: 80, w: 2, d: 2 });
    expect(healthFactors(w, m).crowded).toBe(false);                                     // 80 / 4 = 20
    m.residents = 84;
    expect(healthFactors(w, m).crowded).toBe(true);
  });
  it('multiplies by the difficulty risk and cuts it by the physician times coverage', () => {
    const { w, ids } = town({ homes: [[6, 14]] });
    const h = w.buildings[ids[0]];
    const bare = dailyHealthRiskOf(w, h);
    expect(near(bare, (HEALTH.base + HEALTH.noWell) * riskOf(w))).toBe(true);
    w.difficulty = 'hard';
    expect(near(dailyHealthRiskOf(w, h), (HEALTH.base + HEALTH.noWell) * 1.5)).toBe(true);
    w.difficulty = 'normal';
    const doc = physician(w, 7, 14);
    expect(healthCoverage(w).get(h.id)).toBe(1);
    expect(near(dailyHealthRiskOf(w, h), bare * (1 - HEALTH.cut))).toBe(true);
    // A bigger crew half hired covers by its ratio: a fresh world (the cover cache is per world), the physician needing two workers.
    BUILDINGS.physician.workers = 2;
    try {
      const { w: w2, ids: ids2 } = town({ homes: [[6, 14]] });
      const doc2 = physician(w2, 7, 14);
      doc2.staff = 1;
      expect(near(dailyHealthRiskOf(w2, w2.buildings[ids2[0]]), bare * (1 - HEALTH.cut * 0.5))).toBe(true);
    } finally { BUILDINGS.physician.workers = 1; }
    doc.staff = 0;                                                                       // not working: no cover
    expect(healthCoverage(w).get(h.id)).toBe(undefined);
    expect(near(dailyHealthRiskOf(w, h), bare)).toBe(true);
  });
  it('covers by road reach of 8, and not beyond', () => {
    const { w, ids } = town({ homes: [[2, 14], [28, 14]] });
    physician(w, 6, 14);
    const [near1, far] = ids.map((id) => w.buildings[id]);
    expect(healthCovered(w, near1)).toBe(true);
    expect(healthCovered(w, far)).toBe(false);
    expect(healthCause(w, far).cause).toBe('none');
    expect(healthCause(w, near1).cause).toBe('covered');
  });
  it('builds nothing before Town, on Peaceful, for an empty plot, or for a home with nobody in it', () => {
    const { w, ids } = town({ homes: [[2, 14]] });
    const h = w.buildings[ids[0]];
    expect(dailyHealthRiskOf(w, h)).toBeGreaterThan(0);
    w.milestone = 'village';
    expect(dailyHealthRiskOf(w, h)).toBe(0);
    healthDay(day(w, 5));
    expect(h.health).toBe(0);
    w.milestone = 'town';
    w.difficulty = 'peaceful';
    expect(dailyHealthRiskOf(w, h)).toBe(0);
    healthDay(day(w, 6));
    expect(h.health).toBe(0);
    w.difficulty = 'normal';
    h.residents = 0;
    expect(canFallIll(h)).toBe(false);
    healthDay(day(w, 7));
    expect(h.health).toBe(0);
    h.residents = 8; h.tier = 0;
    expect(canFallIll(h)).toBe(false);
    expect(healthRiskOf(w, h)).toBe(0);
  });
  it('adds the day\'s risk to the home when the day runs', () => {
    const { w, ids } = town({ homes: [[2, 14]] });
    const h = w.buildings[ids[0]];
    healthDay(day(w, 10));
    healthDay(day(w, 11));
    expect(near(h.health, 2 * (HEALTH.base + HEALTH.noWell))).toBe(true);
  });
  it('bands the risk as the overlay does: Low, Rising, High, Can fall ill', () => {
    expect(HEALTH_BANDS).toEqual([0, 25, 60, 100]);
    expect([0, 24.9, 25, 59, 60, 99, 100, 400].map(healthBand)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });
});

describe('s45 illness', () => {
  it('falls ill at the threshold on a seeded 2% draw, and never below it', () => {
    const { w, ids } = town({ homes: [[2, 14]] });
    const h = w.buildings[ids[0]];
    const yes = dayWhere(w, h.id, true), no = dayWhere(w, h.id, false);
    h.health = HEALTH.threshold - 5;
    healthDay(day(w, yes));                                                              // the draw would succeed, but it is below the threshold
    expect(h.illness).toBe(null);
    h.health = HEALTH.threshold;
    healthDay(day(w, no));
    expect(h.illness).toBe(null);
    h.health = HEALTH.threshold;
    const events = [];
    healthDay(day(w, yes), events);
    expect(h.illness).toBeTruthy();
    expect(h.health).toBe(0);
    expect(w.tally.illnesses).toBe(1);
    expect(events[0]).toEqual({ type: 'illness', id: h.id, covered: false, cause: 'risk' });
  });
  it('draws the same illness on any run of the same world, and a reload changes nothing', () => {
    const run = (reload) => {
      const { w, ids } = town({ homes: [[2, 14], [3, 14], [4, 14]] });
      for (const id of ids) w.buildings[id].health = HEALTH.threshold;
      advanceDays(w, 200);
      return reload ? deserialize(serialize(w)) : w;
    };
    const a = run(false), b = run(true);
    expect(a.tally.illnesses).toBeGreaterThan(0);
    expect(JSON.stringify(a.buildings)).toBe(JSON.stringify(b.buildings));
    const c = deserialize(serialize(a));
    advanceDays(a, 60); advanceDays(c, 60);
    expect(JSON.stringify(a.buildings)).toBe(JSON.stringify(c.buildings));
  });
  it('draws about 2% of days over many homes at the threshold', () => {
    const w = makeTestWorld({ gold: 5000 });
    let n = 0;
    for (let id = 1; id <= 2000; id++) if (hash2(id, 4321, (w.seed + HEALTH_SALT.fall) | 0) < HEALTH.illnessChance) n++;
    expect(n).toBeGreaterThan(20);
    expect(n).toBeLessThan(70);
  });
  it('lasts 20 to 40 days by the seeded draw, and the length is stored', () => {
    const { w, ids } = town({ homes: [[2, 14]] });
    const h = w.buildings[ids[0]];
    const lens = new Set();
    for (let d = 100; d < 160; d++) {
      h.illness = null; h.residents = 8; w.day = d;
      fallIll(w, h.id);
      const want = 20 + Math.min(20, Math.floor(hash2(h.id, d, (w.seed + HEALTH_SALT.length) | 0) * 21));
      expect(h.illness.days).toBe(want);
      expect(h.illness.left).toBe(want);
      lens.add(want);
    }
    expect([...lens].every((n) => n >= 20 && n <= 40)).toBe(true);
    expect(lens.size).toBeGreaterThan(5);
  });
  it('loses one resident a day up to a quarter of its people, rounded down, and gets better after its days', () => {
    const { w, ids } = town({ homes: [[2, 14]], residents: 12 });
    const h = w.buildings[ids[0]];
    w.day = 50;
    fallIll(w, h.id);
    expect(h.illness.cap).toBe(3);                                                       // a quarter of 12
    const days = h.illness.days;
    const seen = [];
    for (let i = 1; i <= days; i++) { healthDay(day(w, 50 + i)); seen.push(h.residents); if (!h.illness) break; }
    expect(seen.slice(0, 4)).toEqual([11, 10, 9, 9]);                                    // 1 a day, then no more at the cap
    expect(h.illness).toBe(null);
    expect(h.residents).toBe(9);
    expect(w.tally.illnessesCured).toBe(1);
    expect(h.health).toBe(0);
    // A home of 3 people has a cap of 0: nobody is lost.
    const { w: w2, ids: ids2 } = town({ homes: [[2, 14]], residents: 3 });
    w2.day = 5;
    fallIll(w2, ids2[0]);
    healthDay(day(w2, 6));
    expect(w2.buildings[ids2[0]].residents).toBe(3);
  });
  it('ends an uncovered illness after its days and a covered one twice as fast', () => {
    const run = (cover) => {
      const { w, ids } = town({ homes: [[6, 14]], residents: 8 });
      if (cover) physician(w, 7, 14);
      const h = w.buildings[ids[0]];
      w.day = 10;
      fallIll(w, h.id);
      const days = h.illness.days;
      let n = 0;
      while (h.illness && n < 100) { n++; healthDay(day(w, 10 + n)); }
      return { days, took: n };
    };
    const slow = run(false), fast = run(true);
    expect(slow.took).toBe(slow.days);
    expect(fast.took).toBe(Math.ceil(fast.days / HEALTH.coverFactor));
    expect(fast.days).toBe(slow.days);                                                   // the same draw: same world, same day
  });
  it('spreads to an edge neighbour on a 4% draw unless a staffed physician covers the sick home', () => {
    const spreadDay = (w, sick, other, ok) => {
      for (let d = 200; d < 6000; d++) if ((hash2(other, d, (w.seed + HEALTH_SALT.spread + Math.imul(sick, 7919)) | 0) < HEALTH.spreadChance) === ok) return d;
      throw new Error('no day');
    };
    const { w, ids } = town({ homes: [[2, 14], [3, 14], [8, 14]] });
    const [sick, next, apart] = ids.map((id) => w.buildings[id]);
    const yes = spreadDay(w, sick.id, next.id, true), no = spreadDay(w, sick.id, next.id, false);
    const start = (d) => { sick.illness = null; next.illness = null; sick.residents = 8; w.day = d; fallIll(w, sick.id); sick.illness.left = 99; };
    start(yes - 1);
    healthDay(day(w, yes));
    expect(next.illness).toBeTruthy();                                                 // the draw succeeded
    expect(apart.illness).toBe(null);                                                    // a road tile between: no edge
    start(no - 1);
    next.illness = null;
    healthDay(day(w, no));
    expect(next.illness).toBe(null);
    // Covered: the same day that would have spread does not.
    physician(w, 5, 14);
    expect(healthCovered(w, sick)).toBe(true);
    sick.illness = null; next.illness = null; sick.residents = 8; w.day = yes - 1; fallIll(w, sick.id); sick.illness.left = 99;
    healthDay(day(w, yes));
    expect(next.illness).toBe(null);
    // And the event says it was a spread.
    const { w: w2, ids: ids2 } = town({ homes: [[2, 14], [3, 14]] });
    const d2 = spreadDay(w2, ids2[0], ids2[1], true);
    w2.day = d2 - 1; fallIll(w2, ids2[0]); w2.buildings[ids2[0]].illness.left = 99;
    const events = [];
    healthDay(day(w2, d2), events);
    expect(events).toEqual([{ type: 'illness', id: ids2[1], covered: false, cause: 'spread' }]);
  });
  it('does not make an empty plot ill, and an ill home that empties recovers', () => {
    const { w, ids } = town({ homes: [[2, 14]] });
    const h = w.buildings[ids[0]];
    h.residents = 0;
    expect(fallIll(w, h.id)).toBe(false);
    h.residents = 8;
    expect(fallIll(w, h.id)).toBe(true);
    expect(fallIll(w, h.id)).toBe(false);                                                // already ill
    h.residents = 0;
    healthDay(day(w, 9));
    expect(h.illness).toBe(null);
  });
  it('is off on Peaceful: nobody falls ill and an old illness stands still', () => {
    const { w, ids } = town({ homes: [[2, 14]] });
    const h = w.buildings[ids[0]];
    w.difficulty = 'peaceful';
    h.health = 500;
    healthDay(day(w, dayWhere(w, h.id, true)));
    expect(h.illness).toBe(null);
  });
  it('saves and validates a home mid-illness', () => {
    const { w, ids } = town({ homes: [[2, 14]] });
    w.day = 5;
    fallIll(w, ids[0]);
    const back = deserialize(serialize(w));
    expect(back.buildings[ids[0]].illness).toEqual(w.buildings[ids[0]].illness);
    expect(validateWorld(JSON.parse(serialize(w)))).toBe(true);
  });
});

describe('s45 health alerts, mood and words', () => {
  it('raises a warning (never critical) for an ill home no staffed physician reaches, and none once one does', () => {
    const { w, ids } = town({ homes: [[6, 14]] });
    w.day = 3;
    fallIll(w, ids[0]);
    expect(healthAlerts(w)).toEqual([{ code: 'illness', id: ids[0] }]);
    expect(CRITICAL.has('illness')).toBe(false);
    const t = triage(w, computeAlerts(w));
    expect(t.ordinary.some((a) => a.code === 'illness')).toBe(true);
    expect(t.critical.some((a) => a.code === 'illness')).toBe(false);
    const doc = physician(w, 7, 14);
    expect(healthAlerts(w)).toEqual([]);
    doc.staff = 0;                                                                       // no workers: not covered, so alerting again
    expect(healthAlerts(w)).toEqual([{ code: 'illness', id: ids[0] }]);
  });
  it('words the alert from the sim\'s reason: build one, short of workers, paused, no road', () => {
    const { w, ids } = town({ homes: [[6, 14]] });
    w.day = 3;
    fallIll(w, ids[0]);
    const words = () => alertText({ code: 'illness', id: ids[0] }, w);
    expect(words().title).toBe('Sickness in a Cottage');
    expect(words().fix).toBe(HEALTH_TEXT.cause.none);
    expect(words().fix).toBe('Build a physician nearby');
    const doc = physician(w, 7, 14);
    doc.staff = 0;
    expect(healthCause(w, w.buildings[ids[0]]).cause).toBe('short');
    expect(words().fix).toBe(HEALTH_TEXT.cause.short);
    doc.staff = 1; doc.paused = true;
    expect(healthCause(w, w.buildings[ids[0]]).cause).toBe('paused');
    expect(words().fix).toBe(HEALTH_TEXT.cause.paused);
    doc.paused = false;
    expect(healthCause(w, w.buildings[ids[0]]).cause).toBe('covered');
    expect(words().fix).toBe(HEALTH_TEXT.cause.covered);
    w.buildings[ids[0]].tier = 9;
    expect(words().title).toBe('Sickness in an Estate');
  });
  it('takes 2 mood per ill home, at most 8, and the row\'s words are the data\'s', () => {
    const { w, ids } = town({ homes: [[2, 14], [3, 14], [4, 14], [5, 14], [6, 14], [7, 14]] });
    expect(healthMood(w)).toEqual({});
    w.day = 4;
    const moods = [];
    for (const id of ids) {
      fallIll(w, id);
      moods.push(healthMood(w).illness);
    }
    expect(moods).toEqual([-2, -4, -6, -8, -8, -8]);
    expect(illHomes(w).length).toBe(6);
    w.labour = { workforce: 0, employed: 0, jobs: 0, shortLevels: [] };
    updateMood(w);
    expect(w.moodBreakdown.illness).toBe(-8);
    expect(MOOD_NAMES.illness).toBe('Illness (−2 per ill home, at most −8)');
    for (const id of ids) w.buildings[id].illness = null;
    updateMood(w);
    expect('illness' in w.moodBreakdown).toBe(false);
  });
});
