// Version 8.4 Track R, the lesson (design section 8, items 1 to 3, and what each of R's rules could do to it; rulings 1487, 1488): the lesson's staged raid keeps its timing at today's
// numbers and at 8.4's, comes on foot, has no scouts and no lean, and its words still match. The walk-through's days are 8.3's, measured on the 8.3 code before Track R's change.
import { describe, it, expect } from '../../harness.js';
import { LESSON_STEPS } from '../../../src/data/lesson.js';
import { lessonWorld, lessonAt, LESSON_SCRIPT, LESSON_LENGTH, stepDone } from '../../../src/sim/lesson.js';
import { tickDay } from '../../../src/sim/clock.js';
import { scoutsAt } from '../../../src/sim/scouts.js';
import { raidAlerts } from '../../../src/sim/raids.js';
import { scoutWalkers } from '../../../src/render/scouts.js';
import { RAIDS, SCOUTS } from '../../../src/data/raids.js';
import { DANGER_UI_TEXT, D2_TEXT } from '../../../src/ui/text.js';
import { lessonFacts } from '../../../src/ui/lesson.js';
import { at84, NUMBERS_84, NUMBERS_83 } from './helpers.js';

const stepNamed = (id) => LESSON_STEPS.find((s) => s.id === id);

// The walk-through the scripted player makes, step by step: the day each step began and ended, the events, and whether the scouts were ever there on any day.
function walk() {
  const world = lessonWorld();
  const events = [], steps = [];
  let scouts = 0;
  const io = {
    tick() {
      tickDay(world, events);
      if (scoutsAt(world) || scoutWalkers(world, world.day, null).length || raidAlerts(world).some((a) => a.code === 'raid_scouts')) scouts += 1;
    },
    did() {},
  };
  let at = lessonAt(world, 0);
  while (at < LESSON_LENGTH) {
    const step = LESSON_STEPS[at];
    const begin = world.day;
    LESSON_SCRIPT[step.id](world, io);
    steps.push(`${step.id}:${begin}>${world.day}`);
    at = lessonAt(world, at + 1);
  }
  return { world, events, steps, scouts, of: (type) => events.filter((e) => e.type === type) };
}

// 8.3's walk-through, measured on the 8.3 code: each step's first and last day. The clock starts on day 63 (the tower step begins), the warning comes that day, its raiders on day 153
// and the raid ends beaten on day 198.
// Version 9.1 (Track F, ruling 1657): the lesson sets the staged warning's arrival LESSON_RAID_LEAD (30) days on once it is up, so its raiders come on day 93 and the raid
// ends on day 138; the warning event still says what the sim raised (63 + RAIDS.warningDays), and every step before the raid keeps its day.
const DAYS_83 = ['road:0>0', 'homes:0>0', 'largeplot:0>0', 'well:0>0', 'families:0>20', 'farm:20>20', 'granary:20>20', 'bazaar:20>20', 'workers:20>51', 'month:51>90', 'firehouse:90>91', 'fire:91>92', 'tower:92>94', 'raid:94>143'];   // WAVE2-PIN 9.2 Track L fix wave (ruling 1870): was 'raid:94>168' (the band comes in from the south, 12 tiles off, so the fight ends sooner); 9.1 balance (ruling 1728): was 'raid:65>199'; 9.2 Track L (kept by the balance check, ruling 1855) (ruling 1756): was 'month:51>60', 'firehouse:60>61', 'fire:61>63', 'tower:63>65', 'raid:65>139' (the month step waits two months from its entry)
const RAID_END = 142;   // WAVE2-PIN 9.2 Track L fix wave (ruling 1870): was 167 (the lesson's band comes in by its own south entry); 9.1 balance (ruling 1728): was 198; 9.2 Track L (kept by the balance check, ruling 1855) (ruling 1756): was 138
const CLOCK_DAY = 92;   // 9.2 Track L (kept by the balance check, ruling 1855) (ruling 1756): was 63 (the day the tower step begins)

describe('v84 r the lesson: the staged raid does not move', () => {
  for (const [name, numbers] of [['today\'s numbers', {}], ['8.4\'s numbers', NUMBERS_84]]) {
    it(`keeps every step's day and the raid's warning, arrival and end, at ${name}`, () => {
      at84(() => {
        const r = walk();
        expect(r.steps).toEqual(DAYS_83);
        const warn = r.of('raid_warning'), start = r.of('raid_start'), end = r.of('raid_end');
        expect([warn.length, warn[0].index, warn[0].first, warn[0].arrives, warn[0].size]).toEqual([1, 0, true, CLOCK_DAY + RAIDS.warningDays, 3]);
        expect([r.world.raid.clockDay, start.length, start[0].size, end.length, end[0].won, end[0].report.day]).toEqual([CLOCK_DAY, 1, 3, 1, true, RAID_END]);
        expect(stepDone(r.world, stepNamed('raid'))).toBe(true);
      }, numbers);
    });
  }
  it('raises the warning on the day the tower step begins, the clock\'s own start: no wait for scouts', () => {
    at84(() => {
      const r = walk();
      expect(r.of('raid_warning')[0].arrives - RAIDS.warningDays).toBe(r.world.raid.clockDay);
    });
  });
  it('is not changed by the captured weapons, the Victory row or the fanfare: they come after the raid step is done', () => {
    const r = walk();
    expect(r.world.raid.spoils).toEqual({ until: RAID_END + 360 });
    expect(stepDone(r.world, stepNamed('raid'))).toBe(true);                    // the step reads raid.last alone
    expect(r.world.raid.last.won).toBe(true);
  });
});

describe('v84 r the lesson: no elephants, no scouts, no lean', () => {
  for (const [name, numbers] of [['today\'s numbers', {}], ['8.4\'s numbers', NUMBERS_84]]) {
    it(`brings the lesson's raid on foot, size 3, and shows no scout on any day of the walk-through, at ${name}`, () => {
      at84(() => {
        const r = walk();
        expect(r.scouts).toBe(0);
        expect(r.of('raid_scouts')).toEqual([]);
        expect([r.of('raid_warning')[0].size, r.world.raid.last.mix]).toEqual([3, { foot: 3, archer: 0, chariot: 0, boat: 0 }]);
        expect(r.world.raid.last.mix.elephant || 0).toBe(0);
      }, numbers);
    });
  }
  it('stages the clock for today, so the lean (later raids only) and the scouts have nothing to move', () => {
    at84(() => {
      const w = lessonWorld();
      let at = lessonAt(w, 0);
      const io = { tick: () => tickDay(w), did() {} };
      while (at < LESSON_LENGTH && LESSON_STEPS[at].id !== 'tower') { LESSON_SCRIPT[LESSON_STEPS[at].id](w, io); at = lessonAt(w, at + 1); }
      expect([w.raid.clockDay, w.raid.nextWarnDay]).toEqual([w.day, w.day]);
      expect(scoutsAt(w)).toBe(null);
      for (let k = 0; k < 400 && !w.raid.warning; k++) tickDay(w);
      expect(w.raid.warning.day).toBe(w.raid.clockDay);
    });
  });
  it('is the lesson\'s own flag that silences scouts on a clock that would show them: the same world without it has them', () => {
    const w = lessonWorld();
    w.raid.clockDay = 0;
    w.raid.nextWarnDay = 300;
    w.day = 300 - SCOUTS.days;
    expect(w.lesson).toBeTruthy();
    expect(scoutsAt(w)).toBe(null);
    delete w.lesson;
    expect(scoutsAt(w).days).toBe(SCOUTS.days);
  });
});

describe('v84 r the lesson: the words still match', () => {
  it('names the first warning\'s delay from RAIDS.firstWarnAfter (10 months at 8.4\'s numbers, in data since wave 2; 24 at 8.3\'s), and the days left from the warning\'s own arrival', () => {
    const says = () => D2_TEXT.steps.tower({ warning: null, paused: true }).why;
    expect(says()).toContain(`first warning comes ${DANGER_UI_TEXT.duration(RAIDS.firstWarnAfter)} later`);
    expect(DANGER_UI_TEXT.duration(RAIDS.firstWarnAfter)).toBe('10 months');   // Version 8.4 wave 2 (ruling 1521): the data holds 8.4's 300 days; it was '24 months'
    at84(() => expect(DANGER_UI_TEXT.duration(RAIDS.firstWarnAfter)).toBe('24 months'), NUMBERS_83);
    at84(() => {
      expect(says()).toContain(`first warning comes ${DANGER_UI_TEXT.duration(300)} later`);
      expect(DANGER_UI_TEXT.duration(RAIDS.firstWarnAfter)).toBe('10 months');
    });
    const w = lessonWorld();
    const io = { tick: () => tickDay(w), did() {} };
    let at = lessonAt(w, 0);
    while (at < LESSON_LENGTH && LESSON_STEPS[at].id !== 'tower') { LESSON_SCRIPT[LESSON_STEPS[at].id](w, io); at = lessonAt(w, at + 1); }
    w.speed = 1;
    for (let k = 0; k < 10 && !w.raid.warning; k++) tickDay(w);
    const f = lessonFacts(w, LESSON_STEPS[at]);
    expect(f.warning.daysLeft).toBe(w.raid.warning.arrives - w.day);
    expect(f.warning.size).toBe(3);
    expect(D2_TEXT.steps.tower({ ...f, paused: false }).why).toContain(`raiders ${DANGER_UI_TEXT.duration(RAIDS.warningDays)} after it`);
  });
});
