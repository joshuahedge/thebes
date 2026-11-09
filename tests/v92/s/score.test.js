// Version 9.2, Track S (rulings 1795-1814): score v3 (T8), the Villa and the luxury goal, the middle monuments and their caption, the titles and traits, Peaceful's words.
import { describe, it, expect } from '../../harness.js';
import { SCORE_VERSION, MEDALS, MEDALS_BY_VERSION, SHARE, SCORE_WEIGHTS, SCORE_TERMS, RECORDS_KEY } from '../../../src/data/scoring.js';
import { PRESTIGE, MONUMENTS, MONUMENT_KINDS, MONUMENT } from '../../../src/data/monuments.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { TIERS } from '../../../src/data/housing.js';
import { GOALS } from '../../../src/data/goals.js';
import { TITLES, TRAITS } from '../../../src/data/dynasty.js';
import { RAIDS } from '../../../src/data/raids.js';
import { scoreOf, medalFor } from '../../../src/sim/score.js';
import { goalMet, openGoals } from '../../../src/sim/goals.js';
import { heirFactor, firstWarnAfterOf } from '../../../src/sim/dynasty.js';
import { laterWarnDay } from '../../../src/sim/raids.js';
import { createWorld, allBuildings } from '../../../src/sim/world.js';
import { createRecords } from '../../../src/save/records.js';
import { shareLink, parseShareLink, shareCheck } from '../../../src/ui/share.js';
import { explainStat } from '../../../src/ui/v81/stats.js';
import { createMonumentUi } from '../../../src/ui/monumentSheet.js';
import { difficultyHint, V90_D_TEXT, S92_S_TEXT } from '../../../src/ui/text.js';
import { runCapital } from '../../stage4/balance/capitalRun.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { openSheet } from '../../../src/ui/modes.js';

const PARTS = { people: 40, prosperity: 60, culture: 50, safety: 60, monuments: 20 };
const SPLITS = { town: 14, market_town: 20, city: null, great_city: null, capital: null, pyramids: null, great_pyramid: null };

// The scripted run's first half-year (a Village, then a Town at month 6), shared by the tests that read it.
let early = null;
const village = () => early || (early = runCapital(6));

describe('v92 s score v3: terms that have not started count nothing', () => {
  it('is version 3 with medals at 240, 320 and 400, v2 and v1 keeping theirs', () => {
    expect(SCORE_VERSION).toBe(3);
    expect(MEDALS).toEqual([{ id: 'bronze', at: 240 }, { id: 'silver', at: 320 }, { id: 'gold', at: 400 }]);
    expect(MEDALS_BY_VERSION[3]).toBe(MEDALS);
    expect(MEDALS_BY_VERSION[2].map((m) => m.at)).toEqual([200, 300, 400]);
    expect(MEDALS_BY_VERSION[1].map((m) => m.at)).toEqual([160, 240, 320]);
    expect([medalFor(210, 2), medalFor(210, 3), medalFor(210)]).toEqual(['bronze', null, null]);
  });
  it('measures the Monuments part against every kind (1,280, computed from the data) and the growth term to the Seat', () => {
    expect(PRESTIGE.scoreFull).toBe(MONUMENT_KINDS.reduce((s, k) => s + MONUMENTS[k].prestige.courses + MONUMENTS[k].prestige.done, 0));
    expect(PRESTIGE.scoreFull).toBe(1280);
    expect(SCORE_TERMS.prestigeFull).toBe(PRESTIGE.scoreFull);
    expect(SCORE_TERMS.growthSteps).toBe(MILESTONES.length - 1);
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'house', 10, 9, { tier: 5, residents: 20 });
    w.milestone = 'capital';
    const atCapital = scoreOf(w).parts.people;
    w.milestone = 'great_capital';
    const beyond = scoreOf(w).parts.people;
    w.milestone = 'seat';
    expect(scoreOf(w).reasons.people).toEqual({ code: 'homes', tier: 5 });   // growth is full at the Seat: only the homes lose points
    expect(beyond).toBeGreaterThan(atCapital);
    expect(scoreOf(w).parts.people).toBeGreaterThan(beyond);
  });
  it('leaves a new village under Bronze, in a bare test city and on the scripted run\'s first months', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    expect(scoreOf(w).raw).toBeLessThan(MEDALS[0].at);
    expect(scoreOf(w).medal).toBe(null);
    const r = runCapital(3);
    expect(r.w.milestone).toBe('village');
    expect(scoreOf(r.w).raw).toBeLessThan(MEDALS[0].at);
  });
  it('counts fire safety from Town and defence from the raid clock, and leaves them out of the ceiling', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    w.milestone = 'village';
    const a = scoreOf(w);
    expect([a.ceilings.safety, a.parts.safety]).toEqual([SCORE_WEIGHTS.safety.record, SCORE_WEIGHTS.safety.record]);   // the record alone: 20 of 20
    expect(a.waiting).toEqual([{ part: 'safety', term: 'fire', from: 'town' }, { part: 'safety', term: 'defence', from: { people: RAIDS.clockPeople } }]);
    expect(a.reasons.safety).toBe(null);
    w.milestone = 'town';
    const b = scoreOf(w);
    expect([b.ceilings.safety, b.waiting.map((x) => x.term)]).toEqual([60, ['defence']]);
    w.milestone = 'market_town';
    w.raid.clockDay = 10;
    const c = scoreOf(w);
    expect([c.ceilings.safety, c.waiting]).toEqual([100, []]);
    expect(c.parts.safety).toBe(60);                                       // nothing to burn is covered (fire 40), no tower (defence 0), the record 20
    expect(a.ceilings.people).toBe(100);
  });
  it('never starts Peaceful\'s defence: its ceiling stays at 60 and its explainer says no raids come', () => {
    const w = makeTestWorld();
    w.difficulty = 'peaceful';
    w.milestone = 'seat';
    w.raid.clockDay = 10;                                                  // a clock a Peaceful city never has
    const s = scoreOf(w);
    expect([s.ceilings.safety, s.waiting]).toEqual([60, [{ part: 'safety', term: 'defence', from: null }]]);
    const notes = explainStat(w, 'score', { score: () => s }).notes;
    expect(notes.some((n) => /no raids come/.test(n))).toBe(true);
  });
  it('does not let the scripted Town\'s safety fall on the day fire starts or the day the raid clock starts', () => {
    const w = village().w;
    expect(w.milestone).toBe('town');
    const safety = (patch) => { const keep = { milestone: w.milestone, clock: w.raid.clockDay }; Object.assign(w, patch.w || {}); w.raid.clockDay = 'clock' in patch ? patch.clock : w.raid.clockDay; const v = scoreOf(w); w.milestone = keep.milestone; w.raid.clockDay = keep.clock; return v.parts.safety; };
    const before = safety({ w: { milestone: 'village' } }), after = safety({});
    expect(after).toBeGreaterThanOrEqual(before);                           // fire starts at Town: from not counting to counting
    const none = safety({ clock: null }), started = safety({ clock: w.day });
    expect(started).toBeGreaterThanOrEqual(none);                          // the raid clock: the same
    expect(scoreOf(w).raw).toBeLessThan(MEDALS[0].at);
  });
  it('does not let the scripted run\'s score fall on the month the raid clock starts (design T8; ruling 1812)', () => {
    // The clock starts at 250 people, in the month the run becomes a Market town. At each month end the score with the clock as it stands is never under the
    // score with the clock held back, nor the safety part under its value with fire held back (a Village): a newly started term only adds. The month-to-month
    // dips beside it (Town 186, Market town 151) are the culture part: the temple and bazaar are unstaffed at that month's end as the city grows, read as they are.
    const seen = [];
    runCapital(8, { onMonth: (w) => {
      const s = scoreOf(w);
      const keep = { clock: w.raid.clockDay, milestone: w.milestone };
      w.raid.clockDay = null;
      const noClock = scoreOf(w);
      w.raid.clockDay = keep.clock; w.milestone = 'village';
      const noFire = scoreOf(w);
      w.milestone = keep.milestone;
      expect(s.raw).toBeGreaterThanOrEqual(noClock.raw);
      expect(s.parts.safety).toBeGreaterThanOrEqual(noFire.parts.safety);
      seen.push(keep.clock !== null);
    } });
    expect(seen.includes(false) && seen.includes(true)).toBe(true);        // the run crosses the day the clock starts
  });
  it('draws the City summary\'s part bars against each part\'s own ceiling under v3 (ruling 1813), 100 where there are no ceilings', async () => {
    const r = await rigUI();
    try {
      r.world.milestone = 'village';
      r.world.raid.clockDay = null;
      r.store.set(openSheet(r.store.get(), 'summary'));
      const row = (part) => r.root.querySelector(`#sheet .score-part[data-part="${part}"]`);
      const s = scoreOf(r.world);
      expect(s.ceilings.safety).toBe(20);
      const bar = row('safety').querySelector('[role="progressbar"]');
      expect([bar.getAttribute('aria-valuemax'), bar.getAttribute('aria-label')]).toEqual(['20', `Safety: ${s.parts.safety} of 20`]);
      expect(row('safety').querySelector('.fill').style.width).toBe(`${Math.min(100, (s.parts.safety / 20) * 100)}%`);
      expect(row('people').querySelector('[role="progressbar"]').getAttribute('aria-valuemax')).toBe('100');
    } finally { r.cleanup(); }
  });
  it('says in the chip\'s explainer what counts next, and each part\'s ceiling', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    w.milestone = 'village';
    const e = explainStat(w, 'score', { score: () => scoreOf(w) });
    expect(e.lines.find((l) => l[0] === 'Safety')[1]).toBe('20 of 20');
    expect(e.lines.find((l) => l[0] === 'People')[1]).toBe('0 of 100');
    expect(e.notes).toContain('Fire safety counts from Town');
    expect(e.notes.some((n) => n === `Defence counts once the city has ${RAIDS.clockPeople} people and raids can begin`)).toBe(true);
    w.milestone = 'town';
    expect(explainStat(w, 'score', { score: () => scoreOf(w) }).notes.includes('Fire safety counts from Town')).toBe(false);
  });
});

describe('v92 s score v3: share links and records', () => {
  it('writes t3 and still reads t2 (as older scoring) and t1', () => {
    expect(SHARE.format).toBe('t3');
    const link = shareLink({ seed: 202641, difficulty: 'normal', parts: PARTS, splits: SPLITS });
    expect(link).toContain('#t3.202641.n.40-60-50-60-20.');
    expect(parseShareLink(new URL(link).hash)).toEqual({ ok: true, seed: 202641, difficulty: 'normal', parts: PARTS, splits: SPLITS, version: 3, older: false, variant: 'classic' });
    const body = 't2.202641.n.40-60-50-60-20.14-20-x-x-x-x-x';
    expect(parseShareLink(`#${body}.${shareCheck(body)}`)).toEqual({ ok: true, seed: 202641, difficulty: 'normal', parts: PARTS, splits: SPLITS, version: 2, older: true, variant: 'classic' });
    expect(parseShareLink(new URL(link).hash.replace('#t3', '#t4'))).toEqual({ ok: false, reason: 'newer_format' });
  });
  it('keeps a v2 best\'s label and medal on v2\'s scale beside the first v3 best', () => {
    const data = {};
    const storage = { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
    const r = createRecords({ storage });
    const row = (day, score, version) => ({ day, people: 0, gold: 0, mood: 60, score, parts: { people: score / 5, prosperity: score / 5, culture: score / 5, safety: score / 5, monuments: score / 5 }, version });
    const city = (history) => { const w = createWorld({ seed: 11, difficulty: 'normal', cityId: 'a' }); w.history = history; return w; };
    r.noteCity(city([row(30, 210, 2)]), 1);
    expect(r.bests()).toEqual([{ seed: 11, difficulty: 'normal', score: 210, medal: 'bronze', version: 2, older: true }]);   // 210 was v2's bronze: it keeps it
    r.noteCity(city([row(60, 210, 3)]), 2);
    expect(r.load().cities[0].medal).toBe(null);                          // the same 210 under v3 earns no medal
    expect(r.bests().map((b) => [b.version, b.older, b.medal])).toEqual([[3, false, null], [2, true, 'bronze']]);
    expect(RECORDS_KEY).toBe('thebes.records');
  });
});

describe('v92 s the Villa and the luxury goal', () => {
  it('taxes a Villa at 7, above the Fine manor\'s 5 and under the Estate\'s 8', () => {
    expect([TIERS[7].tax, TIERS[8].tax, TIERS[9].tax]).toEqual([5, 7, 8]);
  });
  it('has a Great City goal met by the first luxury bought, with a Show me', () => {
    const goal = GOALS.find((g) => g.id === 'luxury_route');
    expect([goal.text, goal.from, goal.showMe !== null && typeof goal.showMe === 'object']).toEqual(['Open a route that sells a luxury', 'great_city', true]);
    const w = makeTestWorld();
    expect(goalMet(w, goal.need)).toBe(false);
    w.tally.luxuryBought = 1;
    expect(goalMet(w, goal.need)).toBe(true);
    w.tally.luxuryBought = 0;
    w.milestone = 'great_city';
    expect(openGoals(w, 200).some((g) => g.id === 'luxury_route')).toBe(true);
    w.milestone = 'town';
    expect(openGoals(w, 200).some((g) => g.id === 'luxury_route')).toBe(false);
    expect(goal.why).toContain('Byblos');
  });
});

describe('v92 s the middle monuments', () => {
  it('leaves the small mastaba at 108 crew-months and the colossus at 48 as 9.1 had them (ruling 1810), the courses equal to the crew-months', () => {
    expect([MONUMENTS.mastaba_small.crewMonths, MONUMENTS.colossus.crewMonths]).toEqual([108, 48]);
    for (const k of ['mastaba_small', 'colossus']) {
      const units = MONUMENTS[k].courses.reduce((s, c) => s + c.stone + c.bricks, 0);
      expect(units).toBe(MONUMENTS[k].crewMonths * MONUMENT.unitsPerCrewMonth);
    }
  });
  it('captions a site whose sheet has not been opened for a game month, once, with its percentage; opening it starts the count again', () => {
    const w = makeTestWorld({ gold: 20000 });
    setRoad(w, 0, 10, 31, 10);
    w.milestone = 'great_city';
    const site = addRaw(w, 'mastaba_small', 12, 11);
    const shown = [];
    const subs = [];
    const state = { selectedId: null };
    const store = { get: () => state, subscribe: (fn) => subs.push(fn), set: (p) => { Object.assign(state, p); subs.forEach((f) => f(state)); } };
    const ui = createMonumentUi({ world: w, store, celebrations: { show: (c) => shown.push(c) } });
    const month = () => { w.day += 30; ui.onEvents([{ type: 'month' }]); };
    ui.onEvents([{ type: 'month' }]);                                       // the first sighting starts the count
    expect(shown.length).toBe(0);
    month();
    expect(shown.length).toBe(1);
    expect(shown[0].text).toBe(S92_S_TEXT.siteQuiet('mastaba_small', 0));
    expect(shown[0].text).toBe('Small mastaba: 0% built, not looked at for a month');
    month(); month();
    expect(shown.length).toBe(1);                                           // once, until it is opened again
    store.set({ selectedId: site.id });                                     // its sheet opens
    month();
    expect(shown.length).toBe(1);                                           // a month has not passed since
    store.set({ selectedId: null });
    month();
    expect(shown.length).toBe(2);
    site.site.laid.bricks = 180;                                            // a few units laid
    store.set({ selectedId: site.id }); store.set({ selectedId: null });
    month();
    expect(shown.length).toBe(3);
    expect(/^Small mastaba: \d+% built/.test(shown[2].text)).toBe(true);
    expect(allBuildings(w).length).toBe(1);
  });
});

describe('v92 s the titles and the traits', () => {
  it('sets the Builder\'s bar to 8,000 and the Merchant\'s to 0.25, the other bars as they were', () => {
    expect(TITLES.map((t) => [t.id, t.bar])).toEqual([['unconquered', 5], ['builder', 8000], ['merchant', 0.25], ['bountiful', 0.90], ['generous', 0.50]]);
  });
  it('takes 5% off every tax of the Generous, and keeps its High rate', () => {
    expect(TRAITS.generous).toEqual({ arrivals: 1.2, high: 1.15, taxes: 0.95 });
    const w = createWorld({ seed: 3, heir: 'generous' });
    expect([heirFactor(w, 'taxes'), heirFactor(createWorld({ seed: 3 }), 'taxes')]).toEqual([0.95, 1]);
    expect(V90_D_TEXT.traitLine('generous')).toBe('20% more newcomers; taxes 5% lower at every rate, and High taxes take 1.15x, not 1.25x');
  });
  it('brings every one of the Unconquered\'s warnings 30 days sooner, the first and the later ones', () => {
    const heir = createWorld({ seed: 3, heir: 'unconquered' }), plain = createWorld({ seed: 3 });
    expect(TRAITS.unconquered.sooner).toBe(30);
    expect([firstWarnAfterOf(plain), firstWarnAfterOf(heir)]).toEqual([RAIDS.firstWarnAfter, RAIDS.firstWarnAfter - 30]);
    for (const from of [500, 1200, 3000]) expect(laterWarnDay(plain, from) - laterWarnDay(heir, from)).toBe(30);
    expect(V90_D_TEXT.traitLine('unconquered')).toBe("soldiers' pay 20% lower; every raid warning comes 30 days sooner");
  });
});

describe('v92 s Peaceful and Relaxed', () => {
  it('says Peaceful still has Low Niles, locusts and fires, rarer, and Relaxed says its weather is rarer too', () => {
    expect(difficultyHint('peaceful')).toBe('No raids, sickness or thefts. Low Niles, locusts and fires still come, rarer.\nBuildings and trade routes cost about 20% less.\nRoads: 2 gold a tile.');
    expect(difficultyHint('relaxed')).toContain('Low Niles and locusts come 50% as often.');
    expect(difficultyHint('normal').includes('Low Niles')).toBe(false);
  });
});
