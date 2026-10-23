// Version 6.0 Track D2 (rulings 760-779): the guided first city's steps, each tested both ways: not done until the sim shows what the step asks, done the moment it does.
// The sim-level half (src/sim/lesson.js); tests/v60/d2/walkthrough.test.js plays the whole lesson through the interface.
import { describe, it, expect } from '../../harness.js';
import { LESSON, LESSON_STEPS, LESSON_PLACES } from '../../../src/data/lesson.js';
import { lessonWorld, replayTo, lessonAt, stepDone, stepProgress, stepSpot, LESSON_SCRIPT, LESSON_LENGTH, firstOf, homesOnRoad, homesReached, fireOver, towersReady } from '../../../src/sim/lesson.js';
import { drawRoad, paintHouses, place, setSpeed, setPaused, canPlace } from '../../../src/sim/commands.js';
import { largePlotUnlocked, canPlaceLargePlot } from '../../../src/sim/largePlots.js';
import { tickDay, monthIndex } from '../../../src/sim/clock.js';
import { population, allBuildings } from '../../../src/sim/world.js';
import { burning } from '../../../src/sim/fire.js';
import { workingTowers, towersNeeded } from '../../../src/sim/raids.js';

const step = (id) => LESSON_STEPS.find((s) => s.id === id);
const index = (id) => LESSON_STEPS.findIndex((s) => s.id === id);
const done = (w, id) => stepDone(w, step(id));
const io = (w) => ({ tick: () => tickDay(w), did() {} });
const run = (w, days) => { for (let d = 0; d < days; d++) tickDay(w); };
const at = (id) => { const w = lessonWorld(); replayTo(w, index(id)); return w; };   // the lesson's city as it is when the step is asked
const P = LESSON_PLACES;

describe('v60 d2 the lesson\'s steps: the map and the list', () => {
  it('is a fixed small Normal city with twelve to fifteen steps, each with a check the sim can read', () => {
    expect([LESSON.size, LESSON.difficulty]).toEqual([48, 'normal']);
    expect(LESSON_LENGTH).toBe(LESSON_STEPS.length);
    expect(LESSON_LENGTH >= 12 && LESSON_LENGTH <= 15).toBe(true);
    const ids = LESSON_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of LESSON_STEPS) { expect([s.id, typeof s.check.kind, typeof LESSON_SCRIPT[s.id]]).toEqual([s.id, 'string', 'function']); }
    for (const want of ['road', 'homes', 'well', 'farm', 'bazaar', 'workers', 'largeplot', 'fire', 'tower']) expect([want, ids.includes(want)]).toEqual([want, true]);
  });
  it('starts with nothing built and no step done, and the lesson world has the guide off and no saved-city id', () => {
    const w = lessonWorld();
    expect([Object.keys(w.buildings).length, w.guide.on, w.speed, w.cityId, w.difficulty, w.size]).toEqual([0, false, 0, null, 'normal', 48]);
    expect(lessonAt(w, 0)).toBe(0);
    LESSON_STEPS.forEach((s) => expect([s.id, stepDone(w, s)]).toEqual([s.id, false]));
  });
});

describe('v60 d2 each step advances only when the sim sees it done', () => {
  for (const s of LESSON_STEPS) {
    it(`${s.id}: not done as it is asked, done once its work is`, () => {
      const w = at(s.id);
      expect([s.id, 'asked', lessonAt(w, index(s.id))]).toEqual([s.id, 'asked', index(s.id)]);
      expect([s.id, 'before', stepDone(w, s)]).toEqual([s.id, 'before', false]);
      LESSON_SCRIPT[s.id](w, io(w));
      expect([s.id, 'after', stepDone(w, s)]).toEqual([s.id, 'after', true]);
      expect(lessonAt(w, index(s.id))).toBeGreaterThan(index(s.id));
    });
  }
  it('replays to any step, leaving every step before it done and that one asked', () => {
    for (let n = 0; n <= LESSON_LENGTH; n++) {
      const w = lessonWorld();
      expect([n, replayTo(w, n)]).toEqual([n, n]);
      expect([n, w.speed]).toEqual([n, 0]);                                         // a resumed lesson reopens paused, as a loaded city does
      expect([n, lessonAt(w, n)]).toEqual([n, n]);                                  // asked again from there, it is still that step
      // A step done earlier can stop being true later (a tower takes workers the bazaar had), and the lesson never goes back for it: it asks from the step it has reached.
    }
  });
  it('passes a step the city already shows done (a well laid before it was asked for is not asked for again)', () => {
    const w = lessonWorld();
    LESSON_SCRIPT.road(w, io(w)); LESSON_SCRIPT.homes(w, io(w)); LESSON_SCRIPT.well(w, io(w));
    expect(lessonAt(w, 0)).toBe(index('families'));
    expect(lessonAt(w, index('families'))).toBe(index('families'));
  });
});

describe('v60 d2 steps: the wrong thing does not advance', () => {
  it('road: eight tiles of road are not nine', () => {
    const w = at('road');
    drawRoad(w, ...P.road.from, 12, 39);
    expect([stepDone(w, step('road')), stepProgress(w, step('road'))]).toEqual([false, { n: 8, of: 9 }]);
    drawRoad(w, 12, 39, 11, 39);
    expect([stepDone(w, step('road')), stepProgress(w, step('road'))]).toEqual([true, { n: 9, of: 9 }]);
  });
  it('homes: five plots on the road are not six, and a plot off the road is no home on it', () => {
    const w = at('homes');
    paintHouses(w, 19, 41, 19, 45);
    expect([homesOnRoad(w), done(w, 'homes')]).toEqual([5, false]);
    paintHouses(w, 25, 40, 25, 40);                                                  // nowhere near a road
    expect([homesOnRoad(w), done(w, 'homes')]).toEqual([5, false]);
    paintHouses(w, 19, 46, 19, 46);
    expect([homesOnRoad(w), done(w, 'homes')]).toEqual([6, true]);
  });
  it('well: a well that reaches too few homes along the road does not count, one beside them does', () => {
    const w = at('well');
    expect(place(w, 'well', 12, 38).ok).toBe(true);                                  // by the new road's far end: ten road tiles from the homes
    expect([homesReached(w, 'well'), done(w, 'well')]).toEqual([0, false]);
    expect(place(w, 'well', ...P.well).ok).toBe(true);
    expect([homesReached(w, 'well') >= 3, done(w, 'well')]).toEqual([true, true]);
  });
  it('families: done on the very day the twelfth person lives here', () => {
    const w = at('families');
    setSpeed(w, 1);
    let flips = 0;
    for (let d = 0; d < 80; d++) {
      const people = population(w);
      expect([d, done(w, 'families')]).toEqual([d, people >= 12]);
      if (people >= 12) { flips++; break; }
      tickDay(w);
    }
    expect(flips).toBe(1);
  });
  it('farm: only a farm on fertile land counts; a granary does not, and farming on the desert is refused', () => {
    const w = at('farm');
    expect(place(w, 'granary', ...P.granary).ok).toBe(true);
    expect(done(w, 'farm')).toBe(false);
    const off = place(w, 'farm_grain', 14, 42);
    expect([off.ok, off.reason, done(w, 'farm')]).toEqual([false, 'needs_fertile', false]);
    expect(place(w, 'farm_grain', ...P.farm).ok).toBe(true);
    expect(done(w, 'farm')).toBe(true);
  });
  it('granary: a farm does not stand in for a granary', () => {
    const w = at('granary');
    expect(done(w, 'granary')).toBe(false);
    expect(place(w, 'granary', ...P.granary).ok).toBe(true);
    expect(done(w, 'granary')).toBe(true);
  });
  it('bazaar: one too far along the road from the homes does not count; one within its reach does', () => {
    const w = at('bazaar');
    expect(place(w, 'bazaar', 11, 37).ok).toBe(true);
    expect([homesReached(w, 'bazaar'), done(w, 'bazaar')]).toEqual([0, false]);
    expect(place(w, 'bazaar', ...P.bazaar).ok).toBe(true);
    expect([homesReached(w, 'bazaar') >= 3, done(w, 'bazaar')]).toEqual([true, true]);
  });
  it('workers: not while the bazaar has no one to work it (short of people), done when it works', () => {
    const w = at('workers');
    setSpeed(w, 1);
    run(w, 60);                                                                      // six homes feed the farm and the granary and leave the bazaar nobody
    expect([firstOf(w, 'farm_grain') !== null, done(w, 'workers'), w.labour.jobs > w.labour.workforce]).toEqual([true, false, true]);
    paintHouses(w, ...P.moreHomes);
    let days = 0;
    while (!done(w, 'workers') && days < 200) { tickDay(w); days++; }
    expect(done(w, 'workers')).toBe(true);
    expect(w.labour.workforce).toBeGreaterThanOrEqual(1);
  });
  it('month: done the day the second month ends, not before', () => {
    const w = at('month');
    setSpeed(w, 1);
    for (let d = 0; d < 40; d++) {
      expect([w.day, done(w, 'month')]).toEqual([w.day, monthIndex(w) >= 2]);
      tickDay(w);
    }
    expect(monthIndex(w)).toBeGreaterThanOrEqual(2);
  });
  it('largeplot: the card opens when the step begins (a real city opens it with a Townhouse), and the step waits for a lot to be laid', () => {
    const before = at('month');                                                      // the step before
    expect([largePlotUnlocked(before), canPlace(before, 'large_plot', ...P.largePlot).ok, canPlace(before, 'large_plot', ...P.largePlot).reason]).toEqual([false, false, 'locked']);
    const w = at('largeplot');
    expect([largePlotUnlocked(w), canPlaceLargePlot(w, ...P.largePlot).ok, w.newItems.includes('large_plot')]).toEqual([true, true, true]);
    expect(done(w, 'largeplot')).toBe(false);
    expect(place(w, 'large_plot', ...P.largePlot).ok).toBe(true);
    expect([w.tally.largePlots, done(w, 'largeplot')]).toEqual([1, true]);
  });
  it('firehouse: one that cannot reach the bazaar does not count; a staffed one that does, does', () => {
    const w = at('firehouse');
    expect(place(w, 'firehouse', 12, 38).ok).toBe(true);
    setSpeed(w, 1); run(w, 6);
    expect(done(w, 'firehouse')).toBe(false);
    expect(place(w, 'firehouse', ...P.firehouse).ok).toBe(true);
    expect(done(w, 'firehouse')).toBe(false);                                        // built, not yet staffed: nobody has taken their posts
    run(w, 4);
    expect(done(w, 'firehouse')).toBe(true);
  });
  it('fire: the lesson lights one blaze in the bazaar once, and it is done when the crew puts it out', () => {
    const w = at('fire');
    const bazaar = firstOf(w, 'bazaar');
    expect([w.tally.fires, bazaar.fire && bazaar.fire.stage, done(w, 'fire')]).toEqual([1, 'blaze', false]);
    lessonAt(w, index('fire')); lessonAt(w, index('fire'));                           // entering the step again lights nothing more
    expect(w.tally.fires).toBe(1);
    setSpeed(w, 1);
    for (let d = 0; d < 6 && !done(w, 'fire'); d++) tickDay(w);
    expect([done(w, 'fire'), w.tally.blazesOut, bazaar.fire]).toEqual([true, 1, null]);
  });
  it('fire: with the crew stood down the staged blaze still goes out in its days and the bazaar stands, so the step ends (Version 6.0.1, ruling 820: it used to grow and burn the bazaar down)', () => {
    const w = at('fire');
    const bazaar = firstOf(w, 'bazaar'), need = bazaar.fire.need;
    for (const b of allBuildings(w)) if (b.type === 'firehouse') setPaused(w, b.id, true);
    setSpeed(w, 1);
    let days = 0;
    while (!done(w, 'fire') && days < 60) { tickDay(w); days++; }
    expect([done(w, 'fire'), days, w.tally.blazesOut, burning(w).length, fireOver(w), w.buildings[bazaar.id] === bazaar]).toEqual([true, need, 1, 0, true, true]);
  });
  it('tower: no warning is no step done; a warned raid needs staffed towers, and raiders that come end the step either way', () => {
    const w = at('tower');
    expect([w.milestone, w.raid.warning, done(w, 'tower')]).toEqual(['market_town', null, false]);
    setSpeed(w, 1);
    for (let d = 0; d < 3 && !w.raid.warning; d++) tickDay(w);
    const warned = w.raid.warning;
    expect([Boolean(warned), warned.size, warned.dir, w.speed]).toEqual([true, 3, 'east', 0]);   // the first warning pauses the game
    expect([workingTowers(w), towersNeeded(warned.size), towersReady(w), done(w, 'tower')]).toEqual([0, 1, false, false]);
    expect(place(w, 'tower', ...P.tower).ok).toBe(true);
    expect(done(w, 'tower')).toBe(false);                                            // built, not staffed
    setSpeed(w, 1); run(w, 3);
    expect([workingTowers(w), done(w, 'tower')]).toEqual([1, true]);
    const careless = at('tower');
    setSpeed(careless, 1);
    let days = 0;
    while (!done(careless, 'tower') && days < 200) { tickDay(careless); if (careless.speed === 0) setSpeed(careless, 1); days++; }
    expect([done(careless, 'tower'), Boolean(careless.raid.active || careless.raid.last), workingTowers(careless)]).toEqual([true, true, 0]);
  });
  it('raid: done when the raid is over (report in), and it is a won raid with the lesson\'s one tower', () => {
    const w = at('raid');
    expect(done(w, 'raid')).toBe(false);
    LESSON_SCRIPT.raid(w, io(w));
    expect([done(w, 'raid'), w.raid.last && w.raid.last.won, w.raid.last && w.raid.last.byTowers]).toEqual([true, true, 3]);
  });
});

describe('v60 d2 steps: what each step lights', () => {
  it('names a spot on the map or a control, and a card for Show me, each real in this city', () => {
    const w = at('workers');
    for (const s of LESSON_STEPS) {
      const lit = Boolean(s.at) || Boolean(s.dom);
      expect([s.id, lit]).toEqual([s.id, true]);
      if (s.at && !s.at.of) { const sp = stepSpot(w, s); expect([s.id, sp.w >= 1 && sp.d >= 1, sp.x >= 0 && sp.y >= 0 && sp.x + sp.w <= w.size && sp.y + sp.d <= w.size]).toEqual([s.id, true, true]); }
    }
    expect(stepSpot(w, step('workers'))).toEqual({ x: 21, y: 40, w: 1, d: 3 });
    const bazaar = firstOf(w, 'bazaar');
    expect(stepSpot(w, step('fire'))).toEqual({ x: bazaar.x, y: bazaar.y, w: bazaar.w, d: bazaar.d });     // the staged fire's own building
  });
});
