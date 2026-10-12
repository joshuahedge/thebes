import { describe, it, expect } from '../../harness.js';
import { MONUMENTS } from '../../../src/data/monuments.js';
import { crewPlan, crewDayUnits, hasMonumentWork, monumentDay, guildSite, crewsFor, prestigeOf } from '../../../src/sim/monuments.js';
import { assignLabour } from '../../../src/sim/labour.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

// A Capital with a road along y = 10 in the 32x32 test world (fertile land is x < 8; addRaw places anywhere).
function city() {
  const w = makeTestWorld({ gold: 100000 });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = 'capital';
  return w;
}
// A builders' guild below the road (its road tiles are (x, 10) and (x + 1, 10)), fully staffed unless told otherwise.
const guild = (w, x, extra = {}) => addRaw(w, 'builders_guild', x, 11, { staff: 16, ...extra });
const near = (a, b) => Math.abs(a - b) < 1e-6;
// monumentDay on each day in turn, as tickDay runs it.
function run(w, days, events = null) {
  for (let i = 0; i < days; i++) { monumentDay(w, events); w.day += 1; }
}

describe('s4 sim crews to sites', () => {
  it('sends each guild\'s crew to the nearest open site within 12 road tiles with room, the nearer guild first', () => {
    const w = city();
    const g1 = guild(w, 12), g2 = guild(w, 16), g3 = guild(w, 0);
    const obelisk = addRaw(w, 'obelisk_small', 20, 9);    // 1 crew; road (20, 10): 8 road tiles from g1, 4 from g2
    const colossus = addRaw(w, 'colossus', 9, 8);         // 2 crews; road (9..10, 10): 3 from g1, 7 from g2, 9 from g3
    const far = addRaw(w, 'obelisk_small', 29, 9);        // 17 from g1, 13 from g2: out of reach of both
    expect([...crewPlan(w)]).toEqual([[g1.id, colossus.id], [g2.id, obelisk.id], [g3.id, colossus.id]]);
    const g4 = guild(w, 22);                              // 3 from the obelisk: it takes the obelisk's one place from g2
    expect([...crewPlan(w)]).toEqual([[g1.id, colossus.id], [g4.id, obelisk.id], [g2.id, colossus.id]]);   // g3: the colossus is full
    obelisk.paused = true;                                // pausing moves its crew: g4 to the far one, 7 away
    expect([...crewPlan(w)]).toEqual([[g1.id, colossus.id], [g2.id, colossus.id], [g4.id, far.id]]);
    obelisk.paused = false;
    g1.paused = true;                                     // a paused guild holds no place: g3 moves up
    expect([...crewPlan(w)]).toEqual([[g4.id, obelisk.id], [g2.id, colossus.id], [g3.id, colossus.id]]);
  });

  it('never sends a crew to a site with no road, a paused one or a finished one, and a guild with no road sends none', () => {
    const w = city();
    const g = guild(w, 16);
    addRaw(w, 'obelisk_small', 18, 3);                                            // no road
    const paused = addRaw(w, 'obelisk_small', 19, 9, { paused: true });
    const done = addRaw(w, 'obelisk_small', 20, 9);
    Object.assign(done.site, { course: 3, done: 12 });
    expect(crewPlan(w).size).toBe(0);
    paused.paused = false;
    expect(crewPlan(w).get(g.id)).toBe(paused.id);
    const lone = addRaw(w, 'builders_guild', 24, 2, { staff: 16 });               // no road beside it
    expect(crewPlan(w).has(lone.id)).toBe(false);
  });

  it('employs a guild only while it has a site, so pausing a site idles its guild and frees its workers', () => {
    const w = city();
    addRaw(w, 'house', 2, 11, { tier: 1, residents: 200 });                       // 80 workers
    const g1 = guild(w, 12, { staff: 0 }), g2 = guild(w, 16, { staff: 0 });
    assignLabour(w);
    expect([g1.staff, g2.staff, w.labour.jobs, hasMonumentWork(w, g1)]).toEqual([0, 0, 0, false]);   // no site yet
    const s = addRaw(w, 'obelisk_small', 20, 9);
    assignLabour(w);
    expect([g1.staff, g2.staff, w.labour.jobs, w.labour.employed]).toEqual([0, 16, 16, 16]);           // one crew: the nearer guild
    s.paused = true;
    assignLabour(w);
    expect([g2.staff, w.labour.jobs, hasMonumentWork(w, g2)]).toEqual([0, 0, false]);
    expect(hasMonumentWork(w, addRaw(w, 'potter', 26, 11))).toBe(true);           // every other workplace as before
  });
  it('raises no understaffed warning for a builders guild that has no site to work (ruling 2)', () => {
    const w = city();
    addRaw(w, 'house', 2, 11, { tier: 1, residents: 200 });
    const g = guild(w, 16, { staff: 0 });
    assignLabour(w);
    const short = () => alertsFor(w).some((a) => a.code === 'understaffed' && a.id === g.id);
    expect(short()).toBe(false);                                                  // no site: idle by design
    addRaw(w, 'obelisk_small', 20, 9);
    w.labour.workers = 0;
    g.staff = 0;
    expect(hasMonumentWork(w, g)).toBe(true);                                     // a site: the warning is true again
    expect(short()).toBe(true);
  });
});

describe('s4 sim work on a site', () => {
  it('lays two-thirds of a unit a day for a full crew, in proportion to its staffing, and nothing below a quarter or on fire', () => {
    const w = city();
    const g = guild(w, 16);
    const s = addRaw(w, 'obelisk_small', 20, 9);
    s.site.stock.stone = 20;
    expect(near(crewDayUnits(w, g), 2 / 3)).toBe(true);
    run(w, 1);
    expect([near(s.site.laid.stone, 2 / 3), near(s.site.stock.stone, 20 - 2 / 3), s.site.crews, guildSite(w, g)]).toEqual([true, true, [g.id], s.id]);
    expect(crewsFor(w, s)).toEqual({ guilds: [g.id], max: 1 });
    g.staff = 8;                                                                  // half staffed: half the pace
    run(w, 1);
    expect(near(s.site.laid.stone, 1)).toBe(true);
    g.staff = 3;                                                                  // under 25%: the crew stops
    run(w, 1);
    expect([near(s.site.laid.stone, 1), s.site.crews, guildSite(w, g)]).toEqual([true, [], null]);
    g.staff = 16;
    g.fire = { stage: 'blaze', days: 0, need: 1, fought: 0 };                     // a blaze does not stop it
    run(w, 1);
    expect(near(s.site.laid.stone, 5 / 3)).toBe(true);
    g.fire = { stage: 'fire', days: 0, left: 10 };                                // the fire stage does
    run(w, 1);
    expect([near(s.site.laid.stone, 5 / 3), s.site.crews]).toEqual([true, []]);
    expect([s.site.month.crews, s.site.month.crewDays, near(s.site.month.units, 5 / 3)]).toEqual([1, 3, true]);
  });

  it('takes no more crews than its kind\'s, each laying its own day', () => {
    const w = city();
    const gs = [10, 12, 14, 16, 18].map((x) => guild(w, x));
    const s = addRaw(w, 'colossus', 20, 8);                                       // 2 crews at most
    s.site.stock.stone = 100;
    run(w, 1);
    expect([s.site.crews, near(s.site.laid.stone, 4 / 3), s.site.month.crews]).toEqual([[gs[4].id, gs[3].id], true, 2]);   // nearest first
    expect(gs.map((g) => guildSite(w, g))).toEqual([null, null, null, s.id, s.id]);
  });

  it('lays a course that names two materials in its proportion, and waits while either is missing', () => {
    const w = city();
    guild(w, 16);
    const s = addRaw(w, 'pyramid_small', 12, 6);                                  // 816 stone and 144 bricks a course
    s.site.stock.stone = 100;
    run(w, 1);
    expect([s.site.laid, s.site.month.starvedDays, s.site.month.crewDays]).toEqual([{ stone: 0, bricks: 0 }, 1, 0]);
    s.site.stock.bricks = 10;
    run(w, 1);
    expect([near(s.site.laid.stone, (2 / 3) * 0.85), near(s.site.laid.bricks, (2 / 3) * 0.15), near(s.site.stock.bricks, 10 - 0.1)]).toEqual([true, true, true]);
    s.site.stock.bricks = 0.05;                                                   // enough for a third of a crew's day
    run(w, 1);
    expect([near(s.site.laid.bricks, 0.15), s.site.stock.bricks, s.site.month.starvedDays]).toEqual([true, 0, 2]);
  });

  it('finishes each course and the monument, with the tallies and the prestige each step added to the city', () => {
    const w = city();
    const g = guild(w, 16);
    const s = addRaw(w, 'obelisk_small', 20, 9);
    s.site.stock.stone = 60;
    const events = [];
    run(w, 89, events);
    expect([s.site.course, s.site.done, events.length]).toEqual([2, null, 2]);
    run(w, 1, events);                                                            // day 89: the 90th day of work
    expect(events).toEqual([
      { type: 'course_done', id: s.id, kind: 'obelisk_small', course: 1, prestige: 1 },
      { type: 'course_done', id: s.id, kind: 'obelisk_small', course: 2, prestige: 2 },
      { type: 'course_done', id: s.id, kind: 'obelisk_small', course: 3, prestige: 2 },
      { type: 'monument_done', id: s.id, kind: 'obelisk_small', prestige: 5 },
    ]);
    expect([s.site.done, s.site.crews, guildSite(w, g), prestigeOf(w), s.site.laid, near(s.site.stock.stone, 0)]).toEqual([89, [], null, 10, { stone: 0, bricks: 0 }, true]);
    expect([w.tally.stoneLaid, w.tally.bricksLaid, w.tally.courses, w.tally.monumentsDone]).toEqual([60, 0, 3, 1]);
    const second = addRaw(w, 'obelisk_small', 22, 9);                             // the guild moves on to it
    second.site.stock.stone = 60;
    events.length = 0;
    run(w, 90, events);
    expect(events.map((e) => [e.type, e.prestige])).toEqual([['course_done', 0], ['course_done', 0], ['course_done', 0], ['monument_done', 0]]);
    expect([second.site.done, prestigeOf(w), w.tally.monumentsDone]).toEqual([179, 10, 2]);
  });

  it('carries a crew\'s spare work into the next course the same day', () => {
    const w = city();
    guild(w, 16); guild(w, 18);
    const s = addRaw(w, 'obelisk_large', 20, 9);                                  // four courses of 90 stone
    Object.assign(s.site, { laid: { stone: 89.9, bricks: 0 }, stock: { stone: 50, bricks: 0 } });
    const events = [];
    run(w, 1, events);
    expect([s.site.course, near(s.site.laid.stone, 4 / 3 - 0.1), near(s.site.stock.stone, 50 - 4 / 3), events.map((e) => e.type)]).toEqual([1, true, true, ['course_done']]);
    expect(MONUMENTS.obelisk_large.courses.length).toBe(4);
  });
});
