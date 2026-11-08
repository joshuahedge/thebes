// Version 9.1 Track F, the lesson (design 2b, 2c, 2d, 2e; rulings 1656, 1657, 1664, 1665): the firehouse's new place covers every building the lesson asks for, the
// staged raid's warning comes LESSON_RAID_LEAD days ahead and its step plays at LESSON_RAID_SPEED, every step is still reached, and every line Ipi says at a step is
// one short sentence for its why and one for its do. Target P5: the lesson's longest wait, at the speed the step plays at.
import { describe, it, expect } from '../../harness.js';
import { LESSON_STEPS, LESSON_PLACES, LESSON_RAID_LEAD, LESSON_RAID_SPEED } from '../../../src/data/lesson.js';
import { lessonWorld, lessonAt, stepDone, LESSON_SCRIPT, LESSON_LENGTH, leadRaid, replayTo } from '../../../src/sim/lesson.js';
import { tickDay } from '../../../src/sim/clock.js';
import { allBuildings } from '../../../src/sim/world.js';
import { setSpeed } from '../../../src/sim/commands.js';
import { canBurn, staffedCover } from '../../../src/sim/fire.js';
import { DAYS_PER_SECOND, DAYS_PER_MONTH } from '../../../src/sim/time.js';
import { RAIDS } from '../../../src/data/raids.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { lessonFacts, stepWords } from '../../../src/ui/lesson.js';

// The lesson played end to end by its own script, counting each step's days: [{ id, begin, end }].
export function walkLesson() {
  const world = lessonWorld();
  const io = { tick: () => tickDay(world), did() {} };
  const steps = [];
  let at = lessonAt(world, 0);
  while (at < LESSON_LENGTH) {
    const step = LESSON_STEPS[at], begin = world.day;
    LESSON_SCRIPT[step.id](world, io);
    if (!stepDone(world, step)) throw new Error(`lesson walk: ${step.id} not done`);
    steps.push({ id: step.id, begin, end: world.day });
    at = lessonAt(world, at + 1);
  }
  return { world, steps };
}

// 9.1's walk-through, measured on the 9.1 code: each step's first and last day. The days to the tower step are 9.0's; the raid's arrival comes LESSON_RAID_LEAD days
// after its warning (day 63), not RAIDS.warningDays (9.0: 'raid:65>199').
// WAVE2-PIN 9.1 Track F (ruling 1657): was 'raid:65>199' (tests/v84/r/lesson.test.js DAYS_83, tests/v90/balance/heirs.test.js DAYS_84)
export const DAYS_91 = ['road:0>0', 'homes:0>0', 'largeplot:0>0', 'well:0>0', 'families:0>20', 'farm:20>20', 'granary:20>20', 'bazaar:20>20', 'workers:20>51', 'month:51>60', 'firehouse:60>61', 'fire:61>63', 'tower:63>65', 'raid:65>139'];

describe('v91 f lesson: the walk-through and its waits (P5)', () => {
  it('reaches every step, on 9.1\'s days', () => {
    const { steps } = walkLesson();
    expect(steps.map((s) => `${s.id}:${s.begin}>${s.end}`)).toEqual(DAYS_91);
  });

  it('the staged warning brings its raiders LESSON_RAID_LEAD days on, set once, and the step\'s words count down to that day', () => {
    const world = lessonWorld();
    replayTo(world, LESSON_STEPS.findIndex((s) => s.id === 'tower'));
    setSpeed(world, 1);
    for (let d = 0; d < 10 && !world.raid.warning; d++) tickDay(world);
    const w = world.raid.warning;
    expect([Boolean(w), w.arrives - w.day]).toEqual([true, RAIDS.warningDays]);    // the sim raises it as a real city's
    expect([leadRaid(world), w.arrives - w.day, leadRaid(world)]).toEqual([true, LESSON_RAID_LEAD, false]);   // the lesson sets it, once
    const f = lessonFacts(world, LESSON_STEPS.find((s) => s.id === 'tower'));
    expect(f.warning.daysLeft).toBe(w.arrives - world.day);
    expect([LESSON_RAID_LEAD, LESSON_RAID_SPEED, LESSON_STEPS.find((s) => s.id === 'raid').speed]).toEqual([30, 2, 2]);
  });

  it('a real city\'s warning is never shortened: leadRaid acts only in the lesson\'s own city', () => {
    const world = lessonWorld();
    replayTo(world, LESSON_STEPS.findIndex((s) => s.id === 'tower'));
    setSpeed(world, 1);
    for (let d = 0; d < 10 && !world.raid.warning; d++) tickDay(world);
    delete world.lesson;
    expect([leadRaid(world), world.raid.warning.arrives - world.raid.warning.day]).toEqual([false, RAIDS.warningDays]);
  });

  // P5 (design section 9): the days each step waits on the game, at the speed it plays at (src/data/lesson.js `speed`, 1x when it has none), in seconds of play.
  // The steps the player builds for wait no days. Measured (ruling 1671): the raid step 74 days at 2x, 37 s (9.0: 134 days at 1x, 134 s), over P5's 30 s by 7 s; the
  // workers step 31 s at 1x (its homes filling, unchanged since 8.3), over by 1 s. All waits together 102 s, inside 150 s. One change meets the raid's: a lead of 15
  // days (29 s at 2x), or the step at 3x (25 s); the controller rules.
  it('P5: every wait in seconds at its step\'s speed, the longest and the sum', () => {
    const { steps } = walkLesson();
    const secs = steps.map((s) => {
      const step = LESSON_STEPS.find((x) => x.id === s.id);
      return { id: s.id, s: (s.end - s.begin) / (step.speed || 1) / DAYS_PER_SECOND };
    });
    const longest = secs.reduce((a, b) => (b.s > a.s ? b : a));
    const total = secs.reduce((n, x) => n + x.s, 0);
    expect(secs.filter((x) => x.s > 0).map((x) => `${x.id}:${x.s}`)).toEqual(['families:20', 'workers:31', 'month:9', 'firehouse:1', 'fire:2', 'tower:2', 'raid:37']);   // WAVE2-PIN 9.1 Track F (ruling 1671): was raid 134 s at 1x
    expect([longest.id, longest.s, total]).toEqual(['raid', 37, 102]);
    expect(total <= 150).toBe(true);                                                // P5's second bar: all waits together
  });
});

describe('v91 f lesson: the firehouse covers the lesson (ruling 1656)', () => {
  // Ruling 1670: no free 1x1 spot but the well's reaches both the farm and the southmost home (15 road tiles apart against a reach of 8), so the corner leaves the
  // farm one tile out; the design's first candidate (17, 40) left three homes out and caught 7 fires in the same 18 months.
  it('stands where its reach covers every building that can burn but the farm (one tile beyond), at the hand-over', () => {
    const { world } = walkLesson();
    const fh = allBuildings(world).find((b) => b.type === 'firehouse');
    expect([fh.x, fh.y]).toEqual(LESSON_PLACES.firehouse);
    const open = allBuildings(world).filter((b) => canBurn(b) && !staffedCover(world, b)).map((b) => `${b.type}@${b.x},${b.y}`);
    expect(open).toEqual([`farm_grain@${LESSON_PLACES.farm.join(',')}`]);
    expect(LESSON_STEPS.find((s) => s.id === 'firehouse').at).toEqual({ x: LESSON_PLACES.firehouse[0], y: LESSON_PLACES.firehouse[1], w: BUILDINGS.firehouse.w || 1, d: BUILDINGS.firehouse.d || 1 });
  });

  it('18 idle months after the lesson (the lesson\'s city kept at its staged rank, so fire risk runs) catch no fire but the staged blaze', () => {
    const { world } = walkLesson();
    setSpeed(world, 1);
    const fires = [], before = world.tally.fires;                                   // the staged blaze, and what the lesson's raiders lit
    for (let d = 0; d < 18 * DAYS_PER_MONTH; d++) { const ev = []; tickDay(world, ev); for (const e of ev) if (e.type === 'fire') fires.push(`${e.id}@${world.day}`); if (world.speed === 0) setSpeed(world, 1); }
    expect([world.milestone, world.tally.fires - before, fires]).toEqual(['market_town', 0, []]);
  });
});

// The rule every line Ipi says keeps (tests/v81/t/words.test.js): a sentence ends with . ! or ? before a capital or a digit, and a short one has 14 words or fewer.
const sentences = (s) => s.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).filter(Boolean);
const short = (s) => sentences(s).every((x) => x.split(/\s+/).length <= 14);

describe('v91 f lesson: the words', () => {
  it('every step\'s why and do are one short sentence each, at every step as the lesson reaches it, paused and playing (9.1\'s lines included)', () => {
    const wrong = [];
    for (let i = 0; i < LESSON_LENGTH; i++) {
      const s = LESSON_STEPS[i];
      for (const speed of [0, 1]) {
        const w = lessonWorld();
        replayTo(w, i);
        if (s.id === 'raid' || s.id === 'tower') { setSpeed(w, 1); for (let d = 0; d < 10 && !w.raid.warning; d++) tickDay(w); leadRaid(w); }
        setSpeed(w, speed);
        const words = stepWords(s, lessonFacts(w, s));
        if (sentences(words.why).length !== 1 || sentences(words.do).length !== 1 || !short(words.why) || !short(words.do)) wrong.push(`${s.id} @${speed}: ${words.why} ${words.do}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('the road step points at the diamond, the months at mood, and the raid says its speed before its raiders come (and its target)', () => {
    const w = lessonWorld();
    const road = stepWords(LESSON_STEPS[0], lessonFacts(w, LESSON_STEPS[0]));
    expect(road.do).toBe('Drag west from the end of the road (the diamond).');
    const month = LESSON_STEPS.find((s) => s.id === 'month');
    expect(stepWords(month, lessonFacts(w, month)).why.includes('mood chip')).toBe(true);
    const raid = LESSON_STEPS.find((s) => s.id === 'raid');
    replayTo(w, LESSON_STEPS.indexOf(raid));
    setSpeed(w, 2);
    const words = stepWords(raid, lessonFacts(w, raid));
    expect([words.why, words.do.includes('bazaar'), words.do.includes(`${w.raid.warning.arrives - w.day} days`)]).toEqual(['The game runs at double speed until the raid is over.', true, true]);
  });
});
